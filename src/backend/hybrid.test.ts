import { describe, expect, it } from "vitest";
import { createBackend, liveAuthFrom } from "@/backend";
import { createHybridBackend } from "@/backend/hybrid";
import type { Kv } from "@/backend/local";
import { DEMO_OTP } from "@/backend/types";
import { callingRegionByIso, toE164 } from "@/lib/calling-codes";

function memory(): Kv {
  const map = new Map<string, string>();
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => {
      map.set(key, value);
    },
    removeItem: (key) => {
      map.delete(key);
    },
  };
}

function quiet(storage: Kv) {
  return { storage, schedule: () => () => undefined };
}

interface Seen {
  method: string;
  url: string;
  body: { contact?: string; code?: string };
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

/** Speaks the auth API contract without opening a socket. */
function apiFetch(allowDemo: boolean) {
  const seen: Seen[] = [];
  const fetchImpl: typeof fetch = async (input, init) => {
    const url = String(input);
    const body = init?.body ? (JSON.parse(String(init.body)) as Seen["body"]) : {};
    seen.push({ method: init?.method ?? "", url, body });
    const path = new URL(url).pathname;
    if (path === "/api/auth/request-otp") return jsonResponse(200, { ok: true });
    if (path === "/api/auth/verify-otp") {
      const code = body.code ?? "";
      const approved = code === "482913" || (allowDemo && code === DEMO_OTP);
      if (!approved) return jsonResponse(400, { ok: false, error: "That code isn't valid. The demo code is 000000." });
      return jsonResponse(200, { ok: true, token: "aaaaaaaa.bbbbbbbb", expiresAt: 1 });
    }
    return jsonResponse(404, { ok: false, error: "Not found." });
  };
  return { seen, fetchImpl };
}

describe("hybrid auth adapter", () => {
  it("keeps the local demo code when the auth API is unset", async () => {
    expect(liveAuthFrom(undefined)).toBe(false);
    expect(liveAuthFrom("  ")).toBe(false);
    expect(liveAuthFrom(" https://auth.example ")).toBe(true);
    let called = false;
    const backend = createBackend("", {
      ...quiet(memory()),
      fetchImpl: () => {
        called = true;
        throw new Error("network");
      },
    });
    expect((await backend.requestOtp({ contact: "+12125550148" })).ok).toBe(true);
    const verified = await backend.verifyOtp(DEMO_OTP);
    expect(verified.ok).toBe(true);
    expect(called).toBe(false);
  });

  it("checks the code with the auth API, then restores the local session without publishing the phone", async () => {
    const storage = memory();
    const api = apiFetch(false);
    const hongKong = callingRegionByIso("HK");
    const parsed = toE164(hongKong!, "9123 4567");
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    const backend = createHybridBackend("http://auth.test/", { ...quiet(storage), fetchImpl: api.fetchImpl });
    expect((await backend.verifyOtp("482913")).ok).toBe(false);
    const requested = await backend.requestOtp({ contact: parsed.e164 });
    expect(requested.ok).toBe(true);
    expect(api.seen[0]).toEqual({
      method: "POST",
      url: "http://auth.test/api/auth/request-otp",
      body: { contact: "+85291234567" },
    });
    expect(backend.getSnapshot().session).toBeNull();

    const rejected = await backend.verifyOtp(DEMO_OTP);
    expect(rejected.ok).toBe(false);
    if (!rejected.ok) expect(rejected.error).not.toContain(DEMO_OTP);
    expect(backend.getSnapshot().session).toBeNull();

    const verified = await backend.verifyOtp("482913");
    expect(verified.ok).toBe(true);
    if (!verified.ok) return;
    expect(verified.needsProfile).toBe(true);
    expect(api.seen.at(-1)).toEqual({
      method: "POST",
      url: "http://auth.test/api/auth/verify-otp",
      body: { contact: "+85291234567", code: "482913" },
    });
    expect(backend.completeProfile({ alias: "Harbour", bioQuote: "Quiet on the ferry", hashtags: ["harbour"] }).ok).toBe(true);
    const snap = backend.getSnapshot();
    const published = JSON.stringify({ me: snap.me, users: snap.users, directory: snap.directory });
    expect(published).not.toContain("85291234567");
    expect(published).not.toContain("+852");
    expect(snap.me?.alias).toBe("Harbour");
    expect(snap.session?.method).toBe("phone");
    expect(backend.createRoom({ name: "Harbour Desk", blurb: "Still local.", hashtags: ["harbour"] }).ok).toBe(true);

    backend.signOut();
    const again = createHybridBackend("http://auth.test", { ...quiet(storage), fetchImpl: api.fetchImpl });
    expect((await again.requestOtp({ contact: parsed.e164 })).ok).toBe(true);
    const restored = await again.verifyOtp("482913");
    expect(restored.ok).toBe(true);
    if (!restored.ok) return;
    expect(restored.needsProfile).toBe(false);
    expect(again.getSnapshot().me?.alias).toBe("Harbour");
    expect(JSON.stringify(again.getSnapshot().directory)).not.toContain("85291234567");
  });

  it("does not open a session when the auth API approves a code without a signed token", async () => {
    const fetchImpl: typeof fetch = async () => jsonResponse(200, { ok: true });
    const backend = createHybridBackend("http://auth.test", { ...quiet(memory()), fetchImpl });
    expect((await backend.requestOtp({ contact: "+12125550148" })).ok).toBe(true);
    const verified = await backend.verifyOtp("482913");
    expect(verified.ok).toBe(false);
    expect(backend.getSnapshot().session).toBeNull();
    expect(backend.getSnapshot().me).toBeNull();
  });

  it("accepts 000000 only when the auth API itself accepts it", async () => {
    const api = apiFetch(true);
    const backend = createHybridBackend("http://auth.test", { ...quiet(memory()), fetchImpl: api.fetchImpl });
    expect((await backend.requestOtp({ contact: "+12125550148" })).ok).toBe(true);
    const verified = await backend.verifyOtp(DEMO_OTP);
    expect(verified.ok).toBe(true);
    expect(backend.getSnapshot().session?.method).toBe("phone");
    expect(JSON.stringify({ me: backend.getSnapshot().me, users: backend.getSnapshot().users, directory: backend.getSnapshot().directory })).not.toContain(
      "12125550148",
    );
  });
});
