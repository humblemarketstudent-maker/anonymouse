import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Flame, Send } from "lucide-react";
import { toast } from "sonner";
import { backend } from "@/backend";
import { AliasMenu } from "@/components/alias-menu";
import { Hashtags } from "@/components/hashtags";
import { NewsCard } from "@/components/news-card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useFloor } from "@/hooks/use-floor";
import { useNow } from "@/hooks/use-now";
import { formatAge } from "@/lib/time";
import { cn } from "@/lib/utils";

export function ThreadScreen() {
  const { threadId = "" } = useParams();
  const { threads, messages, me, usersById } = useFloor();
  const thread = threads.find((item) => item.id === threadId);
  const peer = thread ? usersById.get(thread.peerId) : undefined;
  const lines = messages.filter((message) => message.threadId === threadId);
  const now = useNow();
  const navigate = useNavigate();
  const scroller = useRef<HTMLDivElement>(null);
  const stick = useRef(true);
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [burnOpen, setBurnOpen] = useState(false);
  const [endOpen, setEndOpen] = useState(false);

  useEffect(() => {
    backend.setPresence({ threadId });
    backend.markThreadRead(threadId);
    return () => backend.setPresence({ threadId: null });
  }, [threadId]);

  useEffect(() => {
    backend.markThreadRead(threadId);
  }, [threadId, lines.length]);

  useEffect(() => {
    const element = scroller.current;
    if (!element || !stick.current) return;
    element.scrollTop = element.scrollHeight;
  }, [lines.length, threadId]);

  if (!thread || !peer || !me) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
        <p className="text-sm text-muted-foreground">This conversation is gone.</p>
        <Button variant="outline" asChild>
          <Link to="/msg">Back to MSG</Link>
        </Button>
      </div>
    );
  }

  function send() {
    const result = backend.sendMessage(threadId, body);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setBody("");
    setError(null);
    stick.current = true;
  }

  const fromMatch = thread.origin === "match";

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex shrink-0 items-start gap-1 border-b px-2 py-2">
        <Button variant="ghost" size="icon" className="md:hidden" asChild>
          <Link to="/msg" aria-label="Back to MSG">
            <ArrowLeft />
          </Link>
        </Button>
        <div className="min-w-0 flex-1 px-1 py-1">
          <div className="flex items-center gap-2">
            <h1 className="truncate text-base font-semibold">{peer.alias}</h1>
            <span className="shrink-0 text-[10px] font-medium uppercase tracking-[0.14em] text-primary">
              {fromMatch ? "Match" : "Direct"}
            </span>
          </div>
          <p className="truncate text-xs italic text-muted-foreground">{peer.bioQuote}</p>
          <Hashtags tags={peer.hashtags} className="mt-1" />
        </div>
        {fromMatch ? (
          <Button type="button" variant="ghost" size="sm" className="mt-1" onClick={() => setEndOpen(true)}>
            End
          </Button>
        ) : null}
        <Button type="button" variant="ghost" size="icon" aria-label="Burn this chat" onClick={() => setBurnOpen(true)}>
          <Flame />
        </Button>
        <AliasMenu userId={peer.id} />
      </header>
      <div
        ref={scroller}
        className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4"
        onScroll={() => {
          const element = scroller.current;
          if (!element) return;
          stick.current = element.scrollHeight - element.scrollTop - element.clientHeight < 80;
        }}
      >
        {lines.length === 0 ? (
          <p className="pt-10 text-center text-sm text-muted-foreground">
            {fromMatch ? "They accepted. Say something." : "Say something. This stays between aliases."}
          </p>
        ) : null}
        {lines.map((message) => {
          const mine = message.senderId === me.id;
          return (
            <div key={message.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
              <div className={cn("max-w-[85%] rounded-2xl px-3 py-2", mine ? "bg-primary/15" : "bg-card")}>
                {message.kind === "blast" ? (
                  <div className="mb-1 text-[10px] font-medium uppercase tracking-[0.16em] text-primary">Blast</div>
                ) : null}
                {message.body ? <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.body}</p> : null}
                {message.news ? <NewsCard news={message.news} className="mt-2 bg-background/40" /> : null}
                <time className="mt-1 block text-[10px] tabular-nums text-muted-foreground">
                  {formatAge(message.createdAt, now)}
                </time>
              </div>
            </div>
          );
        })}
      </div>
      <form
        className="shrink-0 border-t px-3 py-2.5"
        onSubmit={(event) => {
          event.preventDefault();
          send();
        }}
      >
        <div className="flex items-end gap-2">
          <Textarea
            value={body}
            onChange={(event) => {
              setBody(event.target.value);
              if (error) setError(null);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                event.preventDefault();
                send();
              }
            }}
            placeholder={`Message ${peer.alias}`}
            aria-label={`Message ${peer.alias}`}
            rows={1}
            maxLength={600}
            className="max-h-28 min-h-10 flex-1 resize-none py-2.5"
          />
          <Button type="submit" size="icon" aria-label="Send">
            <Send />
          </Button>
        </div>
        {error ? <p className="mt-1 text-xs text-destructive">{error}</p> : null}
      </form>
      <Dialog open={burnOpen} onOpenChange={setBurnOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Burn this chat?</DialogTitle>
            <DialogDescription>
              {fromMatch
                ? `Every message with ${peer.alias} is wiped on this device, the match ends, and they stay out of Match for a while.`
                : `Every message in this line is wiped on this device. You can open a new line with ${peer.alias} later.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setBurnOpen(false)}>
              Keep it
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                backend.burnThread(thread.id);
                toast("Chat burned.");
                navigate("/msg");
              }}
            >
              Burn chat
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={endOpen} onOpenChange={setEndOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>End this match?</DialogTitle>
            <DialogDescription>
              The conversation closes and {peer.alias} won't show up in the next Match passes.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setEndOpen(false)}>
              Keep talking
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                const result = backend.endMatch(thread.id);
                if (!result.ok) {
                  toast.error(result.error);
                  return;
                }
                toast("Match ended.");
                navigate("/msg");
              }}
            >
              End match
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
