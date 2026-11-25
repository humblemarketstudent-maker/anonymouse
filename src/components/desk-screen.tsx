import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Send } from "lucide-react";
import { toast } from "sonner";
import { backend } from "@/backend";
import type { ThreadOrigin } from "@/backend/types";
import { EmptyState } from "@/components/empty-state";
import { Persona } from "@/components/persona";
import { PickPane, SplitView } from "@/components/split-view";
import { RoomScreen } from "@/components/room-screen";
import { ThreadScreen } from "@/components/thread-screen";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useFloor } from "@/hooks/use-floor";
import { useNow } from "@/hooks/use-now";
import { formatChatListTime } from "@/lib/time";
import { cn } from "@/lib/utils";

type Scope = "joined" | "people";

export function DeskScreen({ scope }: { scope: Scope }) {
  const [params] = useSearchParams();
  const roomId = scope === "joined" ? (params.get("room") ?? "") : "";
  const threadId = scope === "people" ? (params.get("thread") ?? "") : "";
  const open = Boolean(roomId || threadId);
  const back = new URLSearchParams(params);
  back.delete("room");
  back.delete("thread");
  const path = scope === "joined" ? "/mine" : "/msg";
  const query = back.toString();
  const backTo = query ? `${path}?${query}` : path;

  return (
    <SplitView
      open={open}
      list={<DeskList scope={scope} />}
      panel={
        threadId ? (
          <ThreadScreen key={threadId} threadId={threadId} backTo={backTo} />
        ) : roomId ? (
          <RoomScreen key={roomId} roomId={roomId} backTo={backTo} />
        ) : (
          <PickPane
            title={scope === "joined" ? "Pick a room" : "Pick a person"}
            body={
              scope === "joined"
                ? "Rooms you joined. The script opens on the right."
                : "Private lines only. Rooms stay in Chats. The script opens on the right."
            }
          />
        )
      }
    />
  );
}

function DeskList({ scope }: { scope: Scope }) {
  const { rooms, threads, usersById, joinedRoomIds, chatters } = useFloor();
  const now = useNow();
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [blast, setBlast] = useState("");
  const [blastError, setBlastError] = useState<string | null>(null);
  const [ending, setEnding] = useState<{ id: string; alias: string; origin: ThreadOrigin } | null>(null);
  const roomId = params.get("room") ?? "";
  const threadId = params.get("thread") ?? "";
  const term = query.trim().toLowerCase();

  const roomRows = useMemo(() => {
    if (scope !== "joined") return [];
    const source = rooms.filter((room) => joinedRoomIds.includes(room.id));
    return source.filter((room) => !term || room.name.toLowerCase().includes(term) || room.hashtags.some((tag) => tag.includes(term)));
  }, [rooms, joinedRoomIds, scope, term]);

  const people = useMemo(() => {
    if (scope !== "people") return [];
    return threads
      .map((thread) => {
        const peer = usersById.get(thread.peerId);
        return peer ? { thread, peer } : null;
      })
      .filter((item): item is { thread: (typeof threads)[number]; peer: NonNullable<ReturnType<typeof usersById.get>> } => item != null)
      .filter((item) => !term || item.peer.alias.toLowerCase().includes(term));
  }, [threads, usersById, scope, term]);

  const showRooms = scope === "joined";
  const showPeople = scope === "people";

  function select(kind: "room" | "thread", id: string) {
    const next = new URLSearchParams(params);
    if (kind === "room") {
      next.delete("thread");
      next.set("room", id);
    } else {
      next.delete("room");
      next.set("thread", id);
    }
    setParams(next);
  }

  function toggle(id: string, on: boolean) {
    setPicked((current) => {
      const next = current.filter((item) => item !== id);
      return on ? [...next, id] : next;
    });
  }

  function sendBlast() {
    const threadIds = picked.filter((id) => threads.some((thread) => thread.id === id));
    const roomIds = scope === "people" ? [] : picked.filter((id) => rooms.some((room) => room.id === id));
    if (threadIds.length === 0 && roomIds.length === 0) {
      setBlastError("Select at least one chat.");
      return;
    }
    if (threadIds.length > 0) {
      const result = backend.blastThreads(threadIds, blast);
      if (!result.ok) {
        setBlastError(result.error);
        return;
      }
    }
    for (const id of roomIds) {
      const result = backend.postChatter({ body: blast, roomId: id });
      if (!result.ok) {
        setBlastError(result.error);
        return;
      }
    }
    const count = threadIds.length + roomIds.length;
    setBlast("");
    setBlastError(null);
    if (scope !== "people") setPicked([]);
    toast.success(`Blasted to ${count}`);
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
    if (threadId === endedId) {
      const next = new URLSearchParams(params);
      next.delete("thread");
      setParams(next, { replace: true });
    }
  }

  return (
    <>
      <header className="shrink-0 border-b px-3 pt-3 pb-2">
        <h1 className="text-sm font-semibold tracking-tight">{scope === "joined" ? "My Rooms" : "MSG"}</h1>
        {scope === "people" ? (
          <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
            People only. Checked rows stay checked after a blast. Keep a chat to leave it on this list.
          </p>
        ) : null}
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={scope === "people" ? "Find a person" : "Find a room"}
          aria-label={scope === "people" ? "Find a person" : "Find a room"}
          className="mt-2 h-8 rounded-md text-sm"
        />
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {showRooms ? (
          <section>
            <p className="px-3 pt-2 pb-1 text-[10px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">Rooms</p>
            {roomRows.length === 0 ? (
              <p className="px-3 py-2 text-xs text-muted-foreground">No rooms.</p>
            ) : (
              <ul>
                {roomRows.map((room) => {
                  const latest = chatters.filter((line) => line.roomId === room.id).sort((a, b) => b.createdAt - a.createdAt)[0];
                  const author = latest ? usersById.get(latest.authorId) : undefined;
                  const active = roomId === room.id;
                  const checked = picked.includes(room.id);
                  return (
                    <li key={room.id} className={cn("border-b border-border/70", active && "bg-primary/10")}>
                      <div className="flex items-center">
                        <div className="pl-2">
                          <Checkbox
                            checked={checked}
                            aria-label={`Select ${room.name}`}
                            onCheckedChange={(value) => toggle(room.id, value === true)}
                          />
                        </div>
                        <button type="button" onClick={() => select("room", room.id)} className="min-w-0 flex-1 px-2 py-2 text-left">
                          <span className="flex items-baseline gap-2">
                            <span className="truncate text-sm font-semibold">{room.name}</span>
                            {joinedRoomIds.includes(room.id) ? (
                              <span className="text-[10px] font-medium tracking-wide text-primary uppercase">Joined</span>
                            ) : null}
                            <time className="ml-auto shrink-0 text-[10px] text-muted-foreground tabular-nums">
                              {latest ? formatChatListTime(latest.createdAt, now) : ""}
                            </time>
                          </span>
                          <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                            {author && latest ? `${author.alias}: ${latest.body || latest.news?.title || "Attachment"}` : room.blurb || "No lines yet."}
                          </span>
                        </button>
                        {scope === "joined" ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="mr-1 h-7 px-2 text-xs"
                            onClick={() => {
                              const result = backend.leaveRoom(room.id);
                              if (!result.ok) toast.error(result.error);
                              else {
                                toast(`Left ${room.name}`);
                                if (roomId === room.id) {
                                  const next = new URLSearchParams(params);
                                  next.delete("room");
                                  setParams(next, { replace: true });
                                }
                              }
                            }}
                          >
                            Leave
                          </Button>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        ) : null}
        {showPeople ? (
          <section>
            <p className="px-3 pt-2 pb-1 text-[10px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">People</p>
            {people.length === 0 ? (
              <EmptyState title="No people" body="Open a line from a room, a friend, or an accepted tap." />
            ) : (
              <ul>
                {people.map(({ thread, peer }) => {
                  const active = threadId === thread.id;
                  const checked = picked.includes(thread.id);
                  return (
                    <li key={thread.id} className={cn("border-b border-border/70", active && "bg-primary/10")}>
                      <div className="flex items-start">
                        <div className="pt-3 pl-2">
                          <Checkbox
                            checked={checked}
                            aria-label={`Select chat with ${peer.alias}`}
                            onCheckedChange={(value) => toggle(thread.id, value === true)}
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <button type="button" onClick={() => select("thread", thread.id)} className="flex w-full min-w-0 items-center gap-2 px-2 pt-2 text-left">
                            <Persona label={peer.alias} avatar={peer.avatar} className="size-8 text-xs" />
                            <span className="min-w-0 flex-1">
                              <span className="flex items-baseline gap-2">
                                <span className={cn("truncate text-sm", thread.unread ? "font-semibold" : "font-medium")}>{peer.alias}</span>
                                <time className="ml-auto shrink-0 text-[10px] text-muted-foreground tabular-nums">
                                  {formatChatListTime(thread.updatedAt, now)}
                                </time>
                              </span>
                              <span className="block truncate text-xs text-muted-foreground">{thread.preview}</span>
                            </span>
                          </button>
                          <div className="flex justify-end gap-1 pr-1 pb-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              aria-pressed={thread.permanent}
                              aria-label={
                                thread.permanent
                                  ? `Permanent chat with ${peer.alias}. Messages still expire after 3 days.`
                                  : `Make chat with ${peer.alias} permanent`
                              }
                              className={cn("h-7 px-2 text-xs", thread.permanent ? "text-primary" : "text-muted-foreground")}
                              onClick={() => {
                                const result = backend.setThreadPermanent(thread.id, !thread.permanent);
                                if (!result.ok) toast.error(result.error);
                              }}
                            >
                              {thread.permanent ? "Permanent" : "Keep"}
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                              aria-label={`End chat with ${peer.alias}`}
                              onClick={() => setEnding({ id: thread.id, alias: peer.alias, origin: thread.origin })}
                            >
                              End
                            </Button>
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        ) : null}
      </div>
      <form
        className="shrink-0 border-t px-2 py-2"
        onSubmit={(event) => {
          event.preventDefault();
          sendBlast();
        }}
      >
        <p className="px-1 pb-1 text-[10px] text-muted-foreground">
          {picked.length === 0
            ? scope === "people"
              ? "Check people, then blast one note. They stay checked."
              : "Check chats, then blast one note."
            : `Blast to ${picked.length}.`}
        </p>
        <div className="flex items-end gap-1.5">
          <Textarea
            value={blast}
            onChange={(event) => {
              setBlast(event.target.value);
              if (blastError) setBlastError(null);
            }}
            placeholder="Blast"
            aria-label="Blast message"
            rows={1}
            maxLength={600}
            className="max-h-20 min-h-9 flex-1 resize-none rounded-md border-border bg-background px-2 py-1.5 text-sm"
          />
          <Button type="submit" className="size-9 rounded-md" aria-label="Send blast" disabled={picked.length === 0}>
            <Send />
          </Button>
        </div>
        {blastError ? <p className="mt-1 px-1 text-xs text-destructive">{blastError}</p> : null}
      </form>
      <Dialog open={ending != null} onOpenChange={(next) => { if (!next) setEnding(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>End this chat?</DialogTitle>
            <DialogDescription>
              {ending
                ? ending.origin === "match"
                  ? `The conversation with ${ending.alias} closes. They stay out of Match for a while.`
                  : `The conversation with ${ending.alias} closes.`
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
