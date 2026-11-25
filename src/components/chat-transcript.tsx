import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { Check } from "lucide-react";
import type { ChatAttachment, NewsLink } from "@/backend/types";
import { FileCard } from "@/components/file-card";
import { NewsCard } from "@/components/news-card";
import { buildTranscript } from "@/lib/transcript";
import { formatScriptDay, formatScriptTime } from "@/lib/time";
import { cn } from "@/lib/utils";

export interface ChatBubble {
  id: string;
  senderId: string;
  body: string;
  createdAt: number;
  news?: NewsLink;
  attachment?: ChatAttachment;
  kind?: "text" | "blast";
}

export function ChatTranscript({
  messages,
  meId,
  aliasFor,
  showAliases,
  conversationId,
  pin,
  now,
  empty,
  onAlias,
}: {
  messages: ChatBubble[];
  meId: string | null;
  aliasFor: (senderId: string) => string | undefined;
  showAliases: boolean;
  conversationId: string;
  pin: number;
  now: number;
  empty: string;
  onAlias?: (senderId: string) => void;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const stick = useRef(true);
  const seen = useRef({ id: "", pin: -1 });
  const items = useMemo(
    () => buildTranscript(messages, now, { meId, showAliases }),
    [messages, now, meId, showAliases],
  );
  const signature = messages.map((message) => message.id).join("\n");

  function jumpToLatest() {
    const element = scroller.current;
    if (!element || !stick.current) return;
    element.scrollTop = element.scrollHeight;
  }

  useLayoutEffect(() => {
    if (seen.current.id !== conversationId) {
      seen.current = { id: conversationId, pin };
      stick.current = true;
    } else if (seen.current.pin !== pin) {
      seen.current.pin = pin;
      stick.current = true;
    }
    jumpToLatest();
  }, [conversationId, pin, signature]);

  useEffect(() => {
    const node = content.current;
    if (!node) return;
    const observer = new ResizeObserver(() => jumpToLatest());
    observer.observe(node);
    return () => observer.disconnect();
  }, [conversationId]);

  return (
    <div
      ref={scroller}
      className="chat-canvas min-h-0 flex-1 overflow-y-auto"
      role="log"
      aria-label="Conversation"
      aria-relevant="additions"
      onScroll={() => {
        const element = scroller.current;
        if (!element) return;
        stick.current = element.scrollHeight - element.scrollTop - element.clientHeight < 80;
      }}
    >
      <div ref={content} className={cn("flex min-h-full flex-col px-2 py-2", items.length === 0 && "justify-center")}>
        {items.length === 0 ? (
          <p className="px-6 py-16 text-center text-sm text-muted-foreground">{empty}</p>
        ) : (
          items.map((item) => {
            if (item.kind === "day") {
              return (
                <p key={item.id} className="py-2 text-center text-[11px] font-medium tracking-wide text-primary">
                  {formatScriptDay(item.at)}
                </p>
              );
            }
            const message = item.message;
            const mine = meId != null && message.senderId === meId;
            const alias = aliasFor(message.senderId) ?? "Alias";
            const aliasNode = onAlias ? (
              <button type="button" className="font-semibold text-primary hover:underline" onClick={() => onAlias(message.senderId)}>
                {alias}
              </button>
            ) : (
              <span className={cn("font-semibold", mine ? "text-foreground" : "text-primary")}>{alias}</span>
            );
            return (
              <div key={message.id} className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-x-2 px-1 py-0.5 text-[13px] leading-5 hover:bg-white/5">
                <time dateTime={new Date(message.createdAt).toISOString()} className="pt-px text-[11px] text-muted-foreground tabular-nums">
                  {formatScriptTime(message.createdAt)}
                </time>
                <div className="min-w-0">
                  <p className="whitespace-pre-wrap">
                    {aliasNode}
                    {message.kind === "blast" ? (
                      <span className="mx-1.5 text-[10px] font-medium tracking-[0.14em] text-primary uppercase">Blast</span>
                    ) : null}
                    {message.body ? <span className="text-foreground"> {message.body}</span> : null}
                    {mine ? (
                      <span className="ml-1 inline-flex translate-y-px text-primary" title="Sent">
                        <Check className="size-3" aria-hidden />
                        <span className="sr-only">Sent</span>
                      </span>
                    ) : null}
                  </p>
                  {message.attachment ? <FileCard file={message.attachment} /> : null}
                  {message.news ? <NewsCard news={message.news} className="mt-1 max-w-md bg-background/40 p-2" /> : null}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
