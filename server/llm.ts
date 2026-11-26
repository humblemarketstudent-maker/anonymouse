import type { AgentConfig } from "./config.ts";

export interface LlmVerdict {
  nsfw: boolean;
  minor: boolean;
  leak: boolean;
}

function asBool(value: unknown): boolean {
  return value === true;
}

export function parseVerdict(raw: string): LlmVerdict {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) return { nsfw: false, minor: false, leak: false };
  try {
    const parsed = JSON.parse(raw.slice(start, end + 1)) as Record<string, unknown>;
    return { nsfw: asBool(parsed.nsfw), minor: asBool(parsed.minor), leak: asBool(parsed.leak) };
  } catch {
    return { nsfw: false, minor: false, leak: false };
  }
}

async function postJson(url: string, apiKey: string, body: unknown, timeoutMs: number, fetchImpl: typeof fetch): Promise<string> {
  const response = await fetchImpl(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!response.ok) throw new Error("classifier unavailable");
  const payload = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return payload.choices?.[0]?.message?.content ?? "";
}

export async function classifyText(
  text: string,
  config: AgentConfig,
  fetchImpl: typeof fetch,
): Promise<LlmVerdict> {
  const content = await postJson(
    `${config.llmBaseUrl}/chat/completions`,
    config.llmApiKey,
    {
      model: config.llmModel,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "Classify one chat message. Reply with JSON {\"nsfw\":boolean,\"minor\":boolean,\"leak\":boolean}. nsfw means adult sexual content. minor means sexual content that appears to involve anyone under 18. leak means credentials, secrets, or non-public client data. Do not quote the message.",
        },
        { role: "user", content: text.slice(0, 4000) },
      ],
    },
    config.llmTimeoutMs,
    fetchImpl,
  );
  return parseVerdict(content);
}

export async function classifyImage(
  dataUrl: string,
  config: AgentConfig,
  fetchImpl: typeof fetch,
): Promise<LlmVerdict> {
  const content = await postJson(
    `${config.llmBaseUrl}/chat/completions`,
    config.llmApiKey,
    {
      model: config.visionModel,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Does this image contain adult sexual content, or sexual content that appears to involve a minor? Reply JSON {\"nsfw\":boolean,\"minor\":boolean,\"leak\":false}. Do not describe the image.",
            },
            { type: "image_url", image_url: { url: dataUrl } },
          ],
        },
      ],
    },
    config.visionTimeoutMs,
    fetchImpl,
  );
  return parseVerdict(content);
}
