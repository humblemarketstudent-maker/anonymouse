import { useEffect, useRef } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { backend } from "@/backend";
import { AliasMenu } from "@/components/alias-menu";
import { Composer } from "@/components/composer";
import { Hashtags } from "@/components/hashtags";
import { NewsCard } from "@/components/news-card";
import { Button } from "@/components/ui/button";
import { useFloor } from "@/hooks/use-floor";
import { useNow } from "@/hooks/use-now";
import { openLine } from "@/lib/open-line";
import { formatAge } from "@/lib/time";

export function RoomScreen() {
  const { roomId = "" } = useParams();
  const { rooms, chatters, usersById, me, joinedRoomIds } = useFloor();
  const room = rooms.find((item) => item.id === roomId);
  const now = useNow();
  const scroller = useRef<HTMLDivElement>(null);
  const stick = useRef(true);
  const navigate = useNavigate();
  const joined = joinedRoomIds.includes(roomId);
  const lines = chatters.filter((chatter) => chatter.roomId === roomId).sort((a, b) => a.createdAt - b.createdAt);

  useEffect(() => {
    const element = scroller.current;
    if (!element || !stick.current) return;
    element.scrollTop = element.scrollHeight;
  }, [lines.length, roomId]);

  if (!room) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
        <p className="text-sm text-muted-foreground">That room isn't here.</p>
        <Button variant="outline" asChild>
          <Link to="/">All chats</Link>
        </Button>
      </div>
    );
  }

  const listeners = Math.max(1, room.listeners + ((Math.floor(now / 5000) + room.name.length) % 7) - 3);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex shrink-0 items-start gap-2 border-b px-2 py-2.5">
        <Button variant="ghost" size="icon" asChild>
          <Link to={joined ? "/mine" : "/"} aria-label={joined ? "My rooms" : "Chats"}>
            <ArrowLeft />
          </Link>
        </Button>
        <div className="min-w-0 flex-1 pt-0.5">
          <h1 className="truncate text-base font-semibold">{room.name}</h1>
          <p className="truncate text-xs text-muted-foreground">
            {room.blurb || "A room"} · {listeners} here
          </p>
          <Hashtags
            tags={room.hashtags}
            className="mt-1.5"
            onTag={(tag) => navigate(`/?q=${encodeURIComponent(`#${tag}`)}`)}
          />
        </div>
        {joined ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="mt-1"
            onClick={() => {
              const result = backend.leaveRoom(room.id);
              if (!result.ok) toast.error(result.error);
              else toast(`Left ${room.name}`);
            }}
          >
            Leave
          </Button>
        ) : null}
      </header>
      <div
        ref={scroller}
        className="min-h-0 flex-1 overflow-y-auto"
        onScroll={() => {
          const element = scroller.current;
          if (!element) return;
          stick.current = element.scrollHeight - element.scrollTop - element.clientHeight < 80;
        }}
      >
        {lines.map((chatter) => {
          const author = usersById.get(chatter.authorId);
          if (!author) return null;
          const mine = author.id === me?.id;
          return (
            <article key={chatter.id} className="border-b border-border px-4 py-3">
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      className="text-sm font-semibold hover:text-primary"
                      onClick={() => {
                        if (mine) {
                          toast("That's you.");
                          return;
                        }
                        const threadId = openLine(author.id);
                        if (threadId) navigate(`/msg/${threadId}`);
                      }}
                    >
                      {author.alias}
                    </button>
                    {mine ? <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-primary">You</span> : null}
                    <time className="ml-auto text-[11px] tabular-nums text-muted-foreground">
                      {formatAge(chatter.createdAt, now)}
                    </time>
                  </div>
                  <p className="mt-1 text-xs italic text-muted-foreground">{author.bioQuote}</p>
                  <Hashtags tags={author.hashtags} className="mt-1.5" />
                  {chatter.body ? <p className="mt-1.5 text-[15px] leading-relaxed text-pretty">{chatter.body}</p> : null}
                  {chatter.news ? <NewsCard news={chatter.news} className="mt-2" /> : null}
                </div>
                <AliasMenu userId={author.id} chatterId={chatter.id} />
              </div>
            </article>
          );
        })}
      </div>
      {joined ? (
        <Composer roomId={room.id} placeholder={`Say it in ${room.name}`} />
      ) : (
        <div className="shrink-0 border-t px-4 py-3">
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
    </div>
  );
}
