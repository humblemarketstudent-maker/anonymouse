import { describe, expect, it } from "vitest";
import { createBackend, liveAuthFrom } from "@/backend";
import { createHybridBackend } from "@/backend/hybrid";
import type { Kv } from "@/backend/local";
import { DEMO_OTP } from "@/backend/types";

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

function publishedProfiles(backend: { getSnapshot(): { me: unknown; users: unknown; directory: unknown } }) {
  const snap = backend.getSnapshot();
  return JSON.stringify({ me: snap.me, users: snap.users, directory: snap.directory });
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
    expect((await backend.requestOtp({ contact: "tape@example.com" })).ok).toBe(true);
    const verified = await backend.verifyOtp(DEMO_OTP);
    expect(verified.ok).toBe(true);
    expect(called).toBe(false);
    expect(publishedProfiles(backend)).not.toContain("tape@example.com");
    expect(publishedProfiles(backend)).not.toContain("@");
  });

  it("checks the code with the auth API, then restores the local session without publishing the email", async () => {
    const storage = memory();
    const api = apiFetch(false);
    const email = "harbour@example.com";

    const backend = createHybridBackend("http://auth.test/", { ...quiet(storage), fetchImpl: api.fetchImpl });
    expect((await backend.verifyOtp("482913")).ok).toBe(false);
    expect((await backend.requestOtp({ contact: "+85291234567" })).ok).toBe(false);
    expect(api.seen).toHaveLength(0);
    const requested = await backend.requestOtp({ contact: "  Harbour@Example.com " });
    expect(requested.ok).toBe(true);
    expect(api.seen[0]).toEqual({
      method: "POST",
      url: "http://auth.test/api/auth/request-otp",
      body: { contact: email },
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
      body: { contact: email, code: "482913" },
    });
    expect(backend.completeProfile({ alias: "Harbour", bioQuote: "Quiet on the ferry", hashtags: ["harbour"] }).ok).toBe(true);
    const snap = backend.getSnapshot();
    const published = JSON.stringify({ me: snap.me, users: snap.users, directory: snap.directory });
    expect(published).not.toContain(email);
    expect(published).not.toContain("@");
    expect(snap.me?.alias).toBe("Harbour");
    expect(snap.session?.method).toBe("email");
    expect(snap.session && JSON.stringify(snap.session)).not.toContain("@");
    expect(backend.createRoom({ name: "Harbour Desk", blurb: "Still local.", hashtags: ["harbour"] }).ok).toBe(true);

    backend.signOut();
    const again = createHybridBackend("http://auth.test", { ...quiet(storage), fetchImpl: api.fetchImpl });
    expect((await again.requestOtp({ contact: "Harbour@Example.com" })).ok).toBe(true);
    const restored = await again.verifyOtp("482913");
    expect(restored.ok).toBe(true);
    if (!restored.ok) return;
    expect(restored.needsProfile).toBe(false);
    expect(again.getSnapshot().me?.alias).toBe("Harbour");
    expect(JSON.stringify(again.getSnapshot().directory)).not.toContain(email);
    expect(JSON.stringify(again.getSnapshot().directory)).not.toContain("@");
  });

  it("does not open a session when the auth API approves a code without a signed token", async () => {
    const fetchImpl: typeof fetch = async () => jsonResponse(200, { ok: true });
    const backend = createHybridBackend("http://auth.test", { ...quiet(memory()), fetchImpl });
    expect((await backend.requestOtp({ contact: "tape@example.com" })).ok).toBe(true);
    const verified = await backend.verifyOtp("482913");
    expect(verified.ok).toBe(false);
    expect(backend.getSnapshot().session).toBeNull();
    expect(backend.getSnapshot().me).toBeNull();
  });

  it("accepts 000000 only when the auth API itself accepts it", async () => {
    const api = apiFetch(true);
    const backend = createHybridBackend("http://auth.test", { ...quiet(memory()), fetchImpl: api.fetchImpl });
    expect((await backend.requestOtp({ contact: "tape@example.com" })).ok).toBe(true);
    const verified = await backend.verifyOtp(DEMO_OTP);
    expect(verified.ok).toBe(true);
    expect(backend.getSnapshot().session?.method).toBe("email");
    expect(publishedProfiles(backend)).not.toContain("tape@example.com");
    expect(publishedProfiles(backend)).not.toContain("@");
  });

  it("drops an upstream error that echoes the email", async () => {
    const fetchImpl: typeof fetch = async () => jsonResponse(400, { ok: false, error: "no such mailbox tape@example.com" });
    const backend = createHybridBackend("http://auth.test", { ...quiet(memory()), fetchImpl });
    const result = await backend.requestOtp({ contact: "tape@example.com" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).not.toContain("tape@example.com");
      expect(result.error).not.toContain("@");
    }
  });
});
