import type { ChatAttachment, ModerationStamp, NewsLink } from "@/backend/types";
import type { Journal } from "@/moderation/journal";
import { NOTICE } from "@/moderation/notices";
import { commit, previewOf, textIsPublishable, evaluate, type EvaluateInput, type Evaluation } from "@/moderation/pipeline";
import type { RateStore } from "@/moderation/rate";
import { sharedModeration, type ModerationRuntime } from "@/lib/moderation-runtime";

export interface ReviewInput {
  body: string;
  news?: NewsLink;
  attachment?: ChatAttachment;
  channelId: string;
  actorId: string;
}

export type ReviewResult =
  | {
      ok: true;
      body: string;
      news?: NewsLink;
      attachment?: ChatAttachment;
      pii_redacted: boolean;
      redacted_types: string[];
      notice?: string;
      stamp: ModerationStamp;
    }
  | { ok: false; error: string };

interface RemoteDecision {
  action: Evaluation["action"];
  body: string;
  url: string;
  title: string;
  summary: string;
  source: string;
  attachmentAllowed: boolean;
  pii_redacted: boolean;
  redacted_types: string[];
  notice: string;
  rule: string;
  severity: Evaluation["severity"];
}

function rank(action: Evaluation["action"]): number {
  if (action === "block") return 5;
  if (action === "quarantine") return 4;
  if (action === "rate_limit") return 3;
  if (action === "redact") return 2;
  return 1;
}

function fromLocal(input: ReviewInput): Evaluation {
  return evaluate({
    parts: {
      body: input.body,
      url: input.news?.url,
      title: input.news?.title,
      summary: input.news?.summary,
      source: input.news?.source,
    },
    attachment: input.attachment,
    channelId: input.channelId,
    actorId: input.actorId,
  });
}

function remoteIsClean(remote: RemoteDecision): boolean {
  const blob = [remote.body, remote.url, remote.title, remote.summary, remote.source].filter(Boolean).join("\n");
  if (!blob) return remote.action === "block" || remote.action === "quarantine" || remote.action === "rate_limit";
  return textIsPublishable(blob);
}

async function consult(input: ReviewInput, fetchImpl: typeof fetch, timeoutMs: number): Promise<"down" | "timeout" | RemoteDecision> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl("/api/moderation/inspect", {
      method: "POST",
      headers: { "content-type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        text: input.body,
        url: input.news?.url ?? "",
        title: input.news?.title ?? "",
        summary: input.news?.summary ?? "",
        source: input.news?.source ?? "",
        channelId: input.channelId,
        actorId: input.actorId,
        attachment: input.attachment ?? null,
      }),
    });
    if (!response.ok) return "down";
    const payload = (await response.json()) as Partial<RemoteDecision>;
    if (!payload || typeof payload.action !== "string" || typeof payload.body !== "string") return "timeout";
    return {
      action: payload.action,
      body: payload.body,
      url: payload.url ?? "",
      title: payload.title ?? "",
      summary: payload.summary ?? "",
      source: payload.source ?? "",
      attachmentAllowed: payload.attachmentAllowed === true,
      pii_redacted: payload.pii_redacted === true,
      redacted_types: Array.isArray(payload.redacted_types) ? payload.redacted_types.filter((item) => typeof item === "string") : [],
      notice: typeof payload.notice === "string" ? payload.notice : "",
      rule: typeof payload.rule === "string" ? payload.rule : "remote",
      severity: payload.severity === "critical" || payload.severity === "high" || payload.severity === "medium" || payload.severity === "low" || payload.severity === "info" ? payload.severity : "info",
    };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") return "timeout";
    return "down";
  } finally {
    clearTimeout(timer);
  }
}

function toResult(input: ReviewInput, decision: Evaluation): ReviewResult {
  if (decision.action === "block" || decision.action === "quarantine" || decision.action === "rate_limit") {
    return { ok: false, error: decision.notice || NOTICE.blocked };
  }
  const news =
    input.news && decision.parts.url && decision.parts.title
      ? {
          url: decision.parts.url,
          title: decision.parts.title,
          summary: decision.parts.summary ?? "",
          source: decision.parts.source || input.news.source,
        }
      : undefined;
  const stamp = { pii_redacted: decision.pii_redacted, redacted_types: decision.redacted_types };
  return {
    ok: true,
    body: decision.parts.body,
    news,
    attachment: input.attachment && decision.attachmentAllowed ? input.attachment : undefined,
    pii_redacted: decision.pii_redacted,
    redacted_types: decision.redacted_types,
    notice: decision.notice,
    stamp,
  };
}

function merge(local: Evaluation, remote: RemoteDecision): Evaluation {
  if (remote.severity === "critical" || local.severity === "critical") {
    return local.severity === "critical" ? local : {
      ...local,
      action: "block",
      parts: { body: "" },
      attachmentAllowed: false,
      notice: NOTICE.blocked,
      rule: "minor_safety",
      severity: "critical",
      preview: "[withheld]",
      alert: true,
      withhold: true,
      pii_redacted: false,
      redacted_types: [],
    };
  }
  if (!remoteIsClean(remote) && remote.action !== "block" && remote.action !== "quarantine" && remote.action !== "rate_limit") {
    return local;
  }
  if (rank(local.action) > rank(remote.action)) return local;
  if (remote.action === "block" || remote.action === "quarantine" || remote.action === "rate_limit") {
    return {
      ...local,
      action: remote.action,
      parts: { body: "" },
      attachmentAllowed: false,
      notice: remote.notice || (remote.action === "quarantine" ? NOTICE.held : remote.action === "rate_limit" ? NOTICE.paused : NOTICE.blocked),
      rule: remote.rule,
      severity: remote.severity,
      alert: remote.action !== "rate_limit",
      withhold: false,
      preview: local.preview,
    };
  }
  if (remote.pii_redacted || local.pii_redacted) {
    const useRemote = remote.pii_redacted && textIsPublishable([remote.body, remote.url, remote.title, remote.summary].join("\n"));
    return {
      ...local,
      action: "redact",
      pii_redacted: true,
      redacted_types: [...new Set([...local.redacted_types, ...remote.redacted_types])],
      notice: NOTICE.pii,
      parts: useRemote
        ? { body: remote.body, url: remote.url || undefined, title: remote.title || undefined, summary: remote.summary || undefined, source: remote.source || undefined }
        : local.parts,
      attachmentAllowed: local.attachmentAllowed && remote.attachmentAllowed,
    };
  }
  return { ...local, attachmentAllowed: local.attachmentAllowed && remote.attachmentAllowed };
}

function evaluatedInput(input: ReviewInput): EvaluateInput {
  return {
    parts: {
      body: input.body,
      url: input.news?.url,
      title: input.news?.title,
      summary: input.news?.summary,
      source: input.news?.source,
    },
    attachment: input.attachment,
    channelId: input.channelId,
    actorId: input.actorId,
  };
}

function remember(input: ReviewInput, decision: Evaluation, runtime: ModerationRuntime) {
  if (decision.action === "allow" || decision.action === "redact") return;
  commit(decision, evaluatedInput(input), { journal: runtime.journal, rate: runtime.rate, now: Date.now() });
}

export async function reviewForSend(
  input: ReviewInput,
  options: { fetchImpl?: typeof fetch; timeoutMs?: number; journal?: Journal; rate?: RateStore } = {},
): Promise<ReviewResult> {
  const runtime = {
    journal: options.journal ?? sharedModeration().journal,
    rate: options.rate ?? sharedModeration().rate,
  };
  const local = fromLocal(input);
  const timeoutMs = options.timeoutMs ?? (input.attachment ? 3500 : 1200);
  const remote = await consult(input, options.fetchImpl ?? fetch, timeoutMs);
  let decision = local;
  if (remote === "timeout" && input.attachment && local.action !== "block") {
    decision = {
      ...local,
      action: "quarantine",
      parts: { body: "" },
      attachmentAllowed: false,
      notice: NOTICE.held,
      rule: "scanner_timeout",
      confidence: 1,
      severity: "high",
      preview: previewOf(input.body),
      alert: true,
      withhold: false,
      quarantine: {
        rule: "scanner_timeout",
        reason: "Pending scan",
        preview: previewOf(input.body),
        name: input.attachment.name.replace(/[^\w.\- ]+/g, "").slice(0, 60) || "file",
        mime: input.attachment.mime,
        size: input.attachment.size,
      },
    };
  } else if (remote !== "down" && remote !== "timeout") {
    decision = merge(local, remote);
  }
  const result = toResult(input, decision);
  if (!result.ok) remember(input, decision, runtime);
  return result;
}
