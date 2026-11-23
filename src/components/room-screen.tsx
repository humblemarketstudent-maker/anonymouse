import { useEffect, useRef } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { AliasMenu } from "@/components/alias-menu";
import { Composer } from "@/components/composer";
import { NewsCard } from "@/components/news-card";
import { SectorBadge } from "@/components/sector-badge";
import { Button } from "@/components/ui/button";
import { roomById } from "@/data/floor";
import { useFloor } from "@/hooks/use-floor";
import { useNow } from "@/hooks/use-now";
import { openLine } from "@/lib/open-line";
import { formatAge } from "@/lib/time";

export function RoomScreen() {
  const { roomId = "" } = useParams();
  const room = roomById(roomId);
  const { chatters, usersById, me } = useFloor();
  const now = useNow();
  const scroller = useRef<HTMLDivElement>(null);
  const stick = useRef(true);
  const navigate = useNavigate();
  const lines = chatters.filter((chatter) => chatter.roomId === roomId).sort((a, b) => a.createdAt - b.createdAt);

  useEffect(() => {
    const element = scroller.current;
    if (!element || !stick.current) return;
    element.scrollTop = element.scrollHeight;
  }, [lines.length, roomId]);

  if (!room) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
        <p className="text-sm text-muted-foreground">That room isn't on the floor.</p>
        <Button variant="outline" asChild>
          <Link to="/rooms">All rooms</Link>
        </Button>
      </div>
    );
  }

  const listeners = room.listeners + ((Math.floor(now / 5000) + room.name.length) % 7) - 3;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex shrink-0 items-start gap-2 border-b px-2 py-2.5">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/rooms" aria-label="All rooms">
            <ArrowLeft />
          </Link>
        </Button>
        <div className="min-w-0 pt-0.5">
          <h1 className="truncate text-base font-semibold">#{room.name}</h1>
          <p className="truncate text-xs text-muted-foreground">
            {room.blurb} · {listeners} listening
          </p>
        </div>
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
                          toast("That's your chatter.");
                          return;
                        }
                        const threadId = openLine(author.id);
                        if (threadId) navigate(`/inbox/${threadId}`);
                      }}
                    >
                      {author.alias}
                    </button>
                    {mine ? <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-primary">You</span> : null}
                    <SectorBadge sector={author.sector} />
                    <time className="ml-auto text-[11px] tabular-nums text-muted-foreground">
                      {formatAge(chatter.createdAt, now)}
                    </time>
                  </div>
                  <p className="mt-1 text-xs italic text-muted-foreground">{author.bioQuote}</p>
                  {chatter.body ? <p className="mt-1.5 text-[15px] leading-relaxed text-pretty">{chatter.body}</p> : null}
                  {chatter.news ? <NewsCard news={chatter.news} className="mt-2" /> : null}
                </div>
                <AliasMenu userId={author.id} chatterId={chatter.id} />
              </div>
            </article>
          );
        })}
      </div>
      <Composer roomId={room.id} placeholder={`Say it in #${room.name}`} />
    </div>
  );
}
