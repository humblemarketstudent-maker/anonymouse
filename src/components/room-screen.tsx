import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { backend } from "@/backend";
import type { PublicUser } from "@/backend/types";
import { ChatHeader } from "@/components/chat-header";
import { ChatTranscript } from "@/components/chat-transcript";
import { Composer } from "@/components/composer";
import { Hashtags } from "@/components/hashtags";
import { Persona } from "@/components/persona";
import { attachmentPreview } from "@/lib/files";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useFloor } from "@/hooks/use-floor";
import { useNow } from "@/hooks/use-now";

export function RoomScreen({ roomId, backTo }: { roomId: string; backTo: string }) {
  const { rooms, chatters, usersById, me, joinedRoomIds } = useFloor();
  const room = rooms.find((item) => item.id === roomId);
  const navigate = useNavigate();
  const now = useNow();
  const joined = joinedRoomIds.includes(roomId);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [pin, setPin] = useState(0);

  const lines = useMemo(
    () => chatters.filter((chatter) => chatter.roomId === roomId),
    [chatters, roomId],
  );
  const bubbles = useMemo(
    () =>
      lines.map((line) => ({
        id: line.id,
        senderId: line.authorId,
        body: line.body,
        createdAt: line.createdAt,
        news: line.news,
        attachment: line.attachment,
      })),
    [lines],
  );

  const people = useMemo(() => {
    const latest = new Map<string, { at: number; text: string }>();
    for (const line of lines) {
      const text = line.body || (line.attachment ? attachmentPreview(line.attachment) : line.news?.title || "");
      const prev = latest.get(line.authorId);
      if (!prev || line.createdAt > prev.at) latest.set(line.authorId, { at: line.createdAt, text });
    }
    return [...latest.entries()]
      .map(([id, entry]) => {
        const user = usersById.get(id);
        if (!user) return null;
        return { user, ...entry };
      })
      .filter((item): item is { user: PublicUser; at: number; text: string } => !!item)
      .sort((a, b) => b.at - a.at);
  }, [lines, usersById]);

  function openProfile(userId: string) {
    setDetailsOpen(false);
    navigate(userId === me?.id ? "/you" : `/profile/${userId}`);
  }

  if (!room) {
    return (
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <ChatHeader backTo={backTo} backLabel="Back" title="Room" />
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
          <p className="text-sm text-muted-foreground">That room isn't here.</p>
          <Button variant="outline" asChild>
            <Link to={backTo}>Back</Link>
          </Button>
        </div>
      </div>
    );
  }

  const countLabel = `${room.listeners} ${room.listeners === 1 ? "user" : "users"}`;

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <ChatHeader
        backTo={backTo}
        backLabel="Back"
        title={room.name}
        subtitle={countLabel}
        onTitle={() => setDetailsOpen(true)}
        titleLabel={`${room.name}, room details`}
        aside={
          <Button
            type="button"
            variant="ghost"
            className="size-11 shrink-0"
            aria-label="Room details"
            onClick={() => setDetailsOpen(true)}
          >
            <MoreHorizontal />
          </Button>
        }
      />
      <ChatTranscript
        messages={bubbles}
        meId={me?.id ?? null}
        aliasFor={(senderId) => usersById.get(senderId)?.alias}
        showAliases
        conversationId={room.id}
        pin={pin}
        now={now}
        empty="No one has spoken in here yet."
        onAlias={openProfile}
      />
      {joined ? (
        <Composer roomId={room.id} placeholder="Message" onSent={() => setPin((value) => value + 1)} />
      ) : (
        <div className="sticky bottom-0 z-20 shrink-0 border-t bg-background/95 px-3 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur">
          <Button
            type="button"
            className="h-11 w-full"
            onClick={() => {
              const result = backend.joinRoom(room.id);
              if (!result.ok) toast.error(result.error);
              else toast(`Joined ${room.name}`);
            }}
          >
            Join room
          </Button>
        </div>
      )}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="flex max-h-[min(36rem,85dvh)] flex-col gap-3 overflow-hidden sm:max-w-md">
          <DialogHeader className="pr-8">
            <DialogTitle>{room.name}</DialogTitle>
            <DialogDescription>{room.blurb || countLabel}</DialogDescription>
          </DialogHeader>
          <Hashtags
            tags={room.hashtags}
            onTag={(tag) => {
              setDetailsOpen(false);
              navigate(`/?q=${encodeURIComponent(`#${tag}`)}`);
            }}
          />
          <p className="text-[11px] font-medium tracking-[0.14em] text-muted-foreground uppercase">People</p>
          <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto">
            {people.length === 0 ? (
              <li className="px-1 py-6 text-center text-sm text-muted-foreground">No one has spoken in here yet.</li>
            ) : (
              people.map(({ user, text }) => (
                <li key={user.id}>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2.5 rounded-lg px-1.5 py-2 text-left hover:bg-muted"
                    onClick={() => openProfile(user.id)}
                  >
                    <Persona label={user.alias} avatar={user.avatar} className="size-8 text-xs" />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold">
                        {user.alias}
                        {user.id === me?.id ? (
                          <span className="ml-2 text-[10px] font-medium tracking-[0.14em] text-primary uppercase">You</span>
                        ) : null}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">{text || "…"}</span>
                    </span>
                  </button>
                </li>
              ))
            )}
          </ul>
          {joined ? (
            <Button
              type="button"
              variant="outline"
              className="h-11"
              onClick={() => {
                const result = backend.leaveRoom(room.id);
                if (!result.ok) toast.error(result.error);
                else {
                  toast(`Left ${room.name}`);
                  setDetailsOpen(false);
                  if (backTo === "/mine") navigate("/mine");
                }
              }}
            >
              Leave room
            </Button>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
