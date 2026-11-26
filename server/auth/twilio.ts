import type { AuthConfig } from "./config.ts";

const VERIFY_HOST = "https://verify.twilio.com";

export interface TwilioResult {
  ok: boolean;
  /** HTTP status from Twilio, or 0 when the call did not complete. */
  status: number;
  /** Verify status string, such as "pending" or "approved". Empty when absent. */
  verifyStatus: string;
}

function basic(config: AuthConfig): string {
  return `Basic ${Buffer.from(`${config.accountSid}:${config.authToken}`).toString("base64")}`;
}

async function postForm(
  config: AuthConfig,
  path: string,
  fields: Record<string, string>,
  fetchImpl: typeof fetch,
): Promise<TwilioResult> {
  try {
    const response = await fetchImpl(`${VERIFY_HOST}${path}`, {
      method: "POST",
      headers: {
        authorization: basic(config),
        "content-type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams(fields).toString(),
      signal: AbortSignal.timeout(10_000),
    });
    const text = await response.text();
    let verifyStatus = "";
    try {
      const payload = JSON.parse(text) as { status?: unknown };
      if (typeof payload.status === "string") verifyStatus = payload.status;
    } catch {
      verifyStatus = "";
    }
    return { ok: response.ok, status: response.status, verifyStatus };
  } catch {
    return { ok: false, status: 0, verifyStatus: "" };
  }
}

/** Ask Twilio Verify to email a code. The code stays with Twilio. */
export function startEmail(config: AuthConfig, to: string, fetchImpl: typeof fetch): Promise<TwilioResult> {
  return postForm(
    config,
    `/v2/Services/${config.verifyServiceSid}/Verifications`,
    { To: to, Channel: "email" },
    fetchImpl,
  );
}

/** Ask Twilio Verify whether this code matches the pending email. */
export function checkEmail(config: AuthConfig, to: string, code: string, fetchImpl: typeof fetch): Promise<TwilioResult> {
  return postForm(
    config,
    `/v2/Services/${config.verifyServiceSid}/VerificationCheck`,
    { To: to, Code: code },
    fetchImpl,
  );
}
