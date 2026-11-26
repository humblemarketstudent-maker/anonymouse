import { createHmac, timingSafeEqual } from "node:crypto";

interface SessionPayload {
  v: 1;
  iat: number;
  exp: number;
}

function sign(secret: string, body: string): string {
  return createHmac("sha256", secret).update(body).digest("base64url");
}

/**
 * Short-lived proof that Verify approved this request.
 * The payload is only a version and a window. It does not carry the email.
 */
export function signSession(secret: string, now: number, ttlMs: number): { token: string; expiresAt: number } {
  const expiresAt = now + ttlMs;
  const payload: SessionPayload = { v: 1, iat: now, exp: expiresAt };
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  return { token: `${body}.${sign(secret, body)}`, expiresAt };
}

export function verifySession(secret: string, token: string, now: number): boolean {
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const [body, sig] = parts;
  if (!body || !sig) return false;
  const expected = sign(secret, body);
  const got = Buffer.from(sig);
  const want = Buffer.from(expected);
  if (got.length !== want.length || !timingSafeEqual(got, want)) return false;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as Partial<SessionPayload>;
    return payload.v === 1 && typeof payload.exp === "number" && payload.exp > now;
  } catch {
    return false;
  }
}
