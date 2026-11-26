import type { RatePolicy } from "../src/moderation/rate.ts";
import { DEFAULT_RATE } from "../src/moderation/rate.ts";

export interface AgentConfig {
  port: number;
  adminToken: string;
  actorSalt: string;
  webhookUrl: string;
  webhookTimeoutMs: number;
  llmBaseUrl: string;
  llmApiKey: string;
  llmModel: string;
  llmTimeoutMs: number;
  visionModel: string;
  visionTimeoutMs: number;
  scanTimeoutMs: number;
  auditPath: string;
  publicInspect: boolean;
  corsOrigin: string;
  maxBodyBytes: number;
  policy: RatePolicy;
}

function num(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function flag(value: string | undefined, fallback: boolean): boolean {
  if (value == null || value === "") return fallback;
  return value === "1" || value.toLowerCase() === "true" || value.toLowerCase() === "yes";
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AgentConfig {
  return {
    port: num(env.PORT, 8787),
    adminToken: env.MODERATION_ADMIN_TOKEN?.trim() ?? "",
    actorSalt: env.MODERATION_ACTOR_SALT?.trim() ?? "",
    webhookUrl: env.MODERATION_ALERT_WEBHOOK_URL?.trim() ?? "",
    webhookTimeoutMs: num(env.MODERATION_WEBHOOK_TIMEOUT_MS, 2000),
    llmBaseUrl: (env.MODERATION_LLM_BASE_URL?.trim() ?? "").replace(/\/$/, ""),
    llmApiKey: env.MODERATION_LLM_API_KEY?.trim() ?? "",
    llmModel: env.MODERATION_LLM_MODEL?.trim() ?? "",
    llmTimeoutMs: num(env.MODERATION_LLM_TIMEOUT_MS, 4000),
    visionModel: env.MODERATION_VISION_MODEL?.trim() ?? "",
    visionTimeoutMs: num(env.MODERATION_VISION_TIMEOUT_MS, 5000),
    scanTimeoutMs: num(env.MODERATION_SCAN_TIMEOUT_MS, 4000),
    auditPath: env.MODERATION_AUDIT_PATH?.trim() ?? "",
    publicInspect: flag(env.MODERATION_PUBLIC_INSPECT, true),
    corsOrigin: env.MODERATION_CORS_ORIGIN?.trim() ?? "",
    maxBodyBytes: num(env.MODERATION_MAX_BODY_BYTES, 700_000),
    policy: {
      maxPerWindow: num(env.MODERATION_RATE_MAX, DEFAULT_RATE.maxPerWindow),
      windowMs: num(env.MODERATION_RATE_WINDOW_MS, DEFAULT_RATE.windowMs),
      strikeLimit: num(env.MODERATION_STRIKE_LIMIT, DEFAULT_RATE.strikeLimit),
      strikeWindowMs: num(env.MODERATION_STRIKE_WINDOW_MS, DEFAULT_RATE.strikeWindowMs),
      cooldownMs: num(env.MODERATION_COOLDOWN_MS, DEFAULT_RATE.cooldownMs),
    },
  };
}

export function llmEnabled(config: AgentConfig): boolean {
  return Boolean(config.llmBaseUrl && config.llmApiKey && config.llmModel);
}

export function visionEnabled(config: AgentConfig): boolean {
  return Boolean(llmEnabled(config) && config.visionModel);
}
