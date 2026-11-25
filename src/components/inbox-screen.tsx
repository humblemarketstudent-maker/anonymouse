import { useState } from "react";
import { NavLink, Outlet, useMatch, useNavigate } from "react-router-dom";
import { Send } from "lucide-react";
import { toast } from "sonner";
import { backend } from "@/backend";
import type { ThreadOrigin } from "@/backend/types";
import { EmptyState } from "@/components/empty-state";
import { Persona } from "@/components/persona";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { formatChatListTime } from "@/lib/time";
import { cn } from "@/lib/utils";

export function InboxLayout() {
  const match = useMatch("/msg/:threadId");
  const open = Boolean(match);
  return (
    <div className="flex min-h-0 flex-1">
      <section
        className={cn(
          "min-h-0 w-full flex-1 flex-col md:w-[340px] md:flex-none md:border-r",
          open ? "hidden" : "flex",
        )}
      >
        <header className="shrink-0 px-4 pt-3 pb-2">
          <h1 className="text-lg font-semibold tracking-tight">MSG</h1>
          <p className="text-xs text-muted-foreground">Private lines. Messages older than 3 days are removed.</p>
        </header>
        <ThreadList />
      </section>
      <section className={cn("min-h-0 min-w-0 flex-1 flex-col", open ? "flex" : "hidden md:flex")}>
        <Outlet />
      </section>
    </div>
  );
}

export function InboxHome() {
  return <EmptyState title="Pick a line" body="Open a conversation, or start one from a room, a friend, or an accepted tap." />;
}

function ThreadList() {
  const { threads, usersById } = useFloor();
  const now = useNow();
  const navigate = useNavigate();
  const open = useMatch("/msg/:threadId");
  const [ending, setEnding] = useState<{ id: string; alias: string; origin: ThreadOrigin } | null>(null);
  const [picked, setPicked] = useState<string[]>([]);
  const [blast, setBlast] = useState("");
  const [blastError, setBlastError] = useState<string | null>(null);
  const selected = picked.filter((id) => threads.some((thread) => thread.id === id));

  function toggle(id: string, on: boolean) {
    setPicked((current) => {
      const next = current.filter((item) => item !== id);
      return on ? [...next, id] : next;
    });
  }

  function confirmEnd() {
    if (!ending) return;
    const result = backend.endChat(ending.id);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    const endedId = ending.id;
    setEnding(null);
    setPicked((current) => current.filter((id) => id !== endedId));
    toast("Chat ended.");
    if (open?.params.threadId === endedId) navigate("/msg");
  }

  function sendBlast() {
    if (selected.length === 0) {
      setBlastError("Select at least one chat.");
      return;
    }
    const result = backend.blastThreads(selected, blast);
    if (!result.ok) {
      setBlastError(result.error);
      return;
    }
    setBlast("");
    setBlastError(null);
    setPicked([]);
    toast.success(`Blasted to ${result.sent}`);
  }

  return (
    <>
      {threads.length === 0 ? (
        <div className="min-h-0 flex-1">
          <EmptyState
            title="No messages"
            body="Tap an alias in a room to start a private chat, or accept a Match tap. Nothing opens until a tap is accepted."
          />
        </div>
      ) : (
        <ul className="min-h-0 flex-1 overflow-y-auto">
          {threads.map((thread) => {
            const peer = usersById.get(thread.peerId);
            if (!peer) return null;
            const active = open?.params.threadId === thread.id;
            const unread = thread.unread > 0;
            const checked = selected.includes(thread.id);
            return (
              <li key={thread.id} className="border-b border-border/80">
                <div className={cn("relative flex items-center", active && "bg-muted")}>
                  <div className="flex shrink-0 items-center pl-2.5">
                    <Checkbox
                      checked={checked}
                      aria-label={`Select chat with ${peer.alias}`}
                      className="size-5"
                      onCheckedChange={(value) => toggle(thread.id, value === true)}
                    />
                  </div>
                  <NavLink
                    to={`/msg/${thread.id}`}
                    className="flex min-w-0 flex-1 items-center gap-3 py-2.5 pr-24 pl-2 hover:bg-muted/60"
                  >
                    <Persona label={peer.alias} avatar={peer.avatar} className="size-12 text-base" />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline gap-2">
                        <span className={cn("truncate text-[15px]", unread ? "font-semibold" : "font-medium")}>
                          {peer.alias}
                        </span>
                        {thread.origin === "match" ? (
                          <span className="shrink-0 text-[10px] font-medium tracking-[0.14em] text-primary uppercase">
                            Match
                          </span>
                        ) : null}
                        {unread ? (
                          <span className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">
                            {thread.unread}
                          </span>
                        ) : null}
                        <time
                          className={cn(
                            "ml-auto shrink-0 text-[11px] tabular-nums",
                            unread ? "font-medium text-primary" : "text-muted-foreground",
                          )}
                          dateTime={new Date(thread.updatedAt).toISOString()}
                        >
                          {formatChatListTime(thread.updatedAt, now)}
                        </time>
                      </span>
                      <span
                        className={cn(
                          "mt-0.5 block truncate text-sm",
                          unread ? "text-foreground" : "text-muted-foreground",
                        )}
                      >
                        {thread.preview}
                      </span>
                    </span>
                  </NavLink>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute top-1/2 right-1.5 z-10 h-8 -translate-y-1/2 px-2 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                    aria-label={`End chat with ${peer.alias}`}
                    onClick={() => setEnding({ id: thread.id, alias: peer.alias, origin: thread.origin })}
                  >
                    End chat
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <form
        className="shrink-0 border-t bg-background/95 px-2 py-2 backdrop-blur"
        onSubmit={(event) => {
          event.preventDefault();
          sendBlast();
        }}
      >
        <p className="px-1 pb-1 text-[11px] text-muted-foreground">
          {selected.length === 0 ? "Select chats, then blast one message." : `Blast to ${selected.length} chat${selected.length === 1 ? "" : "s"}.`}
        </p>
        <div className="flex items-end gap-1.5">
          <Textarea
            value={blast}
            onChange={(event) => {
              setBlast(event.target.value);
              if (blastError) setBlastError(null);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                event.preventDefault();
                sendBlast();
              }
            }}
            placeholder="Blast a message"
            aria-label="Blast message"
            rows={1}
            maxLength={600}
            className="composer-field max-h-28 min-h-11 w-auto min-w-0 flex-1 resize-none overflow-y-auto rounded-2xl border-transparent bg-secondary px-3 py-2.5 text-base leading-5 field-sizing-fixed"
          />
          <Button type="submit" className="size-11 shrink-0 rounded-full" aria-label="Send blast" disabled={selected.length === 0}>
            <Send />
          </Button>
        </div>
        {blastError ? (
          <p role="alert" className="mt-1 px-1 text-sm leading-snug text-destructive">
            {blastError}
          </p>
        ) : null}
      </form>
      <Dialog open={ending != null} onOpenChange={(next) => { if (!next) setEnding(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>End this chat?</DialogTitle>
            <DialogDescription>
              {ending
                ? ending.origin === "match"
                  ? `The conversation with ${ending.alias} closes and leaves MSG. They stay out of Match for a while.`
                  : `The conversation with ${ending.alias} closes and leaves MSG. This thread stays closed.`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setEnding(null)}>
              Keep it
            </Button>
            <Button type="button" variant="destructive" onClick={confirmEnd}>
              End chat
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
