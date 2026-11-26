import { createLocalBackend, normalizePhone, type LocalOptions } from "@/backend/local";
import type { Backend, Result } from "@/backend/types";

export interface HybridOptions extends LocalOptions {
  fetchImpl?: typeof fetch;
}

const TOKEN = /^[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}$/;

function apiUrl(base: string, path: string): string {
  return `${base.replace(/\/+$/, "")}${path}`;
}

function cleanError(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== "object" || !("error" in payload)) return fallback;
  const message = payload.error;
  if (typeof message !== "string") return fallback;
  const trimmed = message.trim();
  if (!trimmed || trimmed.length > 200) return fallback;
  if (trimmed.includes("000000") || /\+\d{8,}/.test(trimmed)) return fallback;
  return trimmed;
}

async function postJson(
  fetchImpl: typeof fetch,
  url: string,
  body: unknown,
  fallback: string,
): Promise<{ ok: true; payload: unknown } | { ok: false; error: string }> {
  let response: Response;
  try {
    response = await fetchImpl(url, {
      method: "POST",
      headers: { accept: "application/json", "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    return { ok: false, error: "Couldn't reach the sign-in service. Try again." };
  }
  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }
  const accepted = response.ok && !!payload && typeof payload === "object" && "ok" in payload && payload.ok === true;
  if (!accepted) return { ok: false, error: cleanError(payload, fallback) };
  return { ok: true, payload };
}

/**
 * Local rooms and messages, with phone OTP checked by the auth API.
 * A successful check opens the same on-device session as the mock backend.
 * This adapter does not accept 000000 by itself.
 */
export function createHybridBackend(apiBase: string, options: HybridOptions = {}): Backend {
  const local = createLocalBackend(options);
  const fetchImpl = options.fetchImpl ?? fetch;
  const base = apiBase.trim();
  let pending: string | null = null;

  const requestOtp: Backend["requestOtp"] = async (input) => {
    if (input.contact.trim().includes("@")) {
      return { ok: false, error: "Use a phone number. Email sign-in isn't available." };
    }
    const contact = normalizePhone(input.contact);
    if (!contact) {
      return { ok: false, error: "Enter a phone number, at least 8 digits. It never appears on your profile." };
    }
    const result = await postJson(fetchImpl, apiUrl(base, "/api/auth/request-otp"), { contact }, "Couldn't send a code. Try again.");
    if (!result.ok) {
      pending = null;
      return result;
    }
    pending = contact;
    return { ok: true };
  };

  const verifyOtp: Backend["verifyOtp"] = async (code) => {
    if (!pending) return { ok: false, error: "Request a code first." };
    const digits = code.replace(/\D/g, "");
    if (digits.length !== 6) return { ok: false, error: "Enter the 6-digit code." };
    const contact = pending;
    const result = await postJson(
      fetchImpl,
      apiUrl(base, "/api/auth/verify-otp"),
      { contact, code: digits },
      "That code isn't valid.",
    );
    if (!result.ok) return result;
    const token = result.payload && typeof result.payload === "object" && "token" in result.payload ? result.payload.token : "";
    if (typeof token !== "string" || !TOKEN.test(token)) {
      return { ok: false, error: "Sign-in could not be confirmed. Request a new code." };
    }
    const session: Result<{ needsProfile: boolean }> = local.establishSession(contact);
    if (session.ok) pending = null;
    return session;
  };

  return { ...local, requestOtp, verifyOtp };
}
