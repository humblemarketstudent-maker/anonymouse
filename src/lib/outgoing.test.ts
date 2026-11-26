import { describe, expect, it } from "vitest";
import { ATTACHMENT_TOO_BIG, validateAttachment } from "@/lib/files";
import { buildOutgoing } from "@/lib/outgoing";
import type { ChatAttachment } from "@/backend/types";

const limits = { maxLength: 600, lengthError: "Keep the message under 600 characters." };

function textFile(contents: string, name = "note.txt"): ChatAttachment {
  const bytes = new TextEncoder().encode(contents);
  const dataUrl = `data:text/plain;base64,${btoa(String.fromCharCode(...bytes))}`;
  return { name, mime: "text/plain", size: bytes.length, dataUrl };
}

describe("buildOutgoing", () => {
  it("sends a caption, a file, or a link card", () => {
    const file = textFile("hello");
    const onlyFile = buildOutgoing({ body: "", url: "", linkOpen: false, attachment: file, ...limits });
    expect(onlyFile).toMatchObject({ body: "", attachment: file });
    const link = buildOutgoing({
      body: "Worth a look",
      url: "https://www.reuters.com/markets/us/dollar-holds",
      linkOpen: true,
      ...limits,
    });
    expect(link).toMatchObject({ body: "Worth a look" });
    if ("error" in link) return;
    expect(link.news?.url).toContain("reuters.com");
    expect(link.news?.source).toBe("Reuters");
  });

  it("does not turn a contact link into a card", () => {
    const held = [
      { body: "text me 212-555-0199", url: "", linkOpen: false },
      { body: "", url: "mailto:jane@gmail.com", linkOpen: true },
      { body: "", url: "tel:+12125550148", linkOpen: true },
      { body: "come through", url: "https://t.me/nightowl", linkOpen: true },
      { body: "", url: "https://telegram.me/nightowl", linkOpen: true },
    ];
    for (const input of held) {
      const result = buildOutgoing({ ...input, ...limits });
      expect("error" in result, input.url || input.body).toBe(false);
      if ("error" in result) continue;
      expect(result.news, input.url || input.body).toBeUndefined();
    }
  });

  it("rejects an oversized attachment", () => {
    const file = textFile("hello");
    file.size = 500_000;
    expect(validateAttachment(file)).toBe(ATTACHMENT_TOO_BIG);
  });
});
