import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { Check } from "lucide-react";
import type { NewsLink } from "@/backend/types";
import { NewsCard } from "@/components/news-card";
import { buildTranscript } from "@/lib/transcript";
import { formatClock } from "@/lib/time";
import { cn } from "@/lib/utils";

export interface ChatBubble {
  id: string;
  senderId: string;
  body: string;
  createdAt: number;
  news?: NewsLink;
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
      <div
        ref={content}
        className={cn("flex min-h-full flex-col px-3 py-3", items.length === 0 ? "justify-center" : "justify-end")}
      >
        {items.length === 0 ? (
          <p className="px-6 py-16 text-center text-sm text-muted-foreground">{empty}</p>
        ) : (
          items.map((item) => {
            if (item.kind === "day") {
              return (
                <div key={item.id} className="flex justify-center py-2">
                  <span className="rounded-full bg-card/90 px-2.5 py-1 text-[11px] font-medium text-muted-foreground ring-1 ring-border">
                    {item.label}
                  </span>
                </div>
              );
            }
            const message = item.message;
            const mine = meId != null && message.senderId === meId;
            const alias = aliasFor(message.senderId);
            return (
              <div key={message.id} className={cn("flex", mine ? "justify-end" : "justify-start", item.grouped ? "mt-0.5" : "mt-2")}>
                <div className={cn("flex max-w-[min(82%,26rem)] flex-col", mine ? "items-end" : "items-start")}>
                  {item.showAlias && alias ? (
                    onAlias ? (
                      <button
                        type="button"
                        className="mb-0.5 px-1 text-xs font-semibold text-primary hover:underline"
                        onClick={() => onAlias(message.senderId)}
                      >
                        {alias}
                      </button>
                    ) : (
                      <span className="mb-0.5 px-1 text-xs font-semibold text-primary">{alias}</span>
                    )
                  ) : null}
                  <div
                    className={cn(
                      "px-2.5 pt-1.5 pb-1",
                      mine
                        ? "rounded-2xl rounded-br-md bg-[color-mix(in_oklch,var(--primary)_16%,var(--card))]"
                        : "rounded-2xl rounded-bl-md bg-card",
                    )}
                  >
                    {message.kind === "blast" ? (
                      <div className="mb-0.5 text-[10px] font-medium tracking-[0.16em] text-primary uppercase">Blast</div>
                    ) : null}
                    {message.body ? (
                      <p className="text-[15px] leading-snug whitespace-pre-wrap text-foreground">{message.body}</p>
                    ) : null}
                    {message.news ? <NewsCard news={message.news} className="mt-1.5 bg-background/50" /> : null}
                    <div className="mt-0.5 flex items-center justify-end gap-1">
                      <time dateTime={new Date(message.createdAt).toISOString()} className="text-[10px] text-muted-foreground tabular-nums">
                        {formatClock(message.createdAt)}
                      </time>
                      {mine ? (
                        <span className="inline-flex text-primary" title="Sent">
                          <Check className="size-3" aria-hidden />
                          <span className="sr-only">Sent</span>
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
