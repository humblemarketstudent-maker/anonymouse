export const DEFAULT_CORS_ORIGINS = [
  "https://anonymouse.lol",
  "https://www.anonymouse.lol",
  "https://anonymouse-eafk.onrender.com",
] as const;

const DEV_ORIGINS = ["http://127.0.0.1:43123", "http://localhost:43123"] as const;

const ACCOUNT_SID = /^AC[0-9a-f]{32}$/i;
const VERIFY_SERVICE_SID = /^VA[0-9a-f]{32}$/i;

export interface AuthConfig {
  port: number;
  nodeEnv: string;
  accountSid: string;
  authToken: string;
  verifyServiceSid: string;
  sessionSecret: string;
  corsOrigins: string[];
  allowDemoOtp: boolean;
  maxBodyBytes: number;
  tokenTtlMs: number;
}

function num(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function flag(value: string | undefined): boolean {
  if (value == null || value === "") return false;
  return value === "1" || value.toLowerCase() === "true" || value.toLowerCase() === "yes";
}

function originsFrom(env: NodeJS.ProcessEnv): string[] {
  const configured = (env.CORS_ORIGIN ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const origins = configured.length > 0 ? configured : [...DEFAULT_CORS_ORIGINS];
  if ((env.NODE_ENV ?? "") !== "production") {
    for (const local of DEV_ORIGINS) {
      if (!origins.includes(local)) origins.push(local);
    }
  }
  return origins;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AuthConfig {
  const accountSid = env.TWILIO_ACCOUNT_SID?.trim() ?? "";
  const verifyServiceSid = env.TWILIO_VERIFY_SERVICE_SID?.trim() ?? "";
  return {
    port: num(env.AUTH_PORT ?? env.PORT, 8788),
    nodeEnv: env.NODE_ENV?.trim() || "development",
    accountSid: ACCOUNT_SID.test(accountSid) ? accountSid : "",
    authToken: env.TWILIO_AUTH_TOKEN?.trim() ?? "",
    verifyServiceSid: VERIFY_SERVICE_SID.test(verifyServiceSid) ? verifyServiceSid : "",
    sessionSecret: env.AUTH_SESSION_SECRET?.trim() ?? "",
    corsOrigins: originsFrom(env),
    allowDemoOtp: flag(env.ALLOW_DEMO_OTP),
    maxBodyBytes: num(env.AUTH_MAX_BODY_BYTES, 4096),
    tokenTtlMs: 5 * 60 * 1000,
  };
}

/** 000000 is accepted only when the flag is on and this process is not production. */
export function demoOtpEnabled(config: AuthConfig): boolean {
  return config.allowDemoOtp && config.nodeEnv !== "production";
}

export function twilioReady(config: AuthConfig): boolean {
  return Boolean(config.accountSid && config.authToken && config.verifyServiceSid);
}

export function sessionReady(config: AuthConfig): boolean {
  return config.sessionSecret.length >= 16;
}
