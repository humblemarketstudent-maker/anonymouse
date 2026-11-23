import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { SECTORS, SECTOR_SHORT, type Sector } from "@/backend/types";
import { AliasMenu } from "@/components/alias-menu";
import { Composer } from "@/components/composer";
import { EmptyState } from "@/components/empty-state";
import { NewsCard } from "@/components/news-card";
import { SectorBadge } from "@/components/sector-badge";
import { ROOMS } from "@/data/floor";
import { useFloor } from "@/hooks/use-floor";
import { useNow } from "@/hooks/use-now";
import { openLine } from "@/lib/open-line";
import { formatAge } from "@/lib/time";
import { cn } from "@/lib/utils";

export function FeedScreen() {
  const { chatters, usersById, me } = useFloor();
  const navigate = useNavigate();
  const [sector, setSector] = useState<Sector | "all">("all");
  const now = useNow();
  const scroller = useRef<HTMLDivElement>(null);
  const away = useRef(false);
  const [unseen, setUnseen] = useState(0);

  const feed = useMemo(
    () =>
      chatters
        .filter((chatter) => chatter.roomId === null)
        .filter((chatter) => sector === "all" || usersById.get(chatter.authorId)?.sector === sector)
        .sort((a, b) => b.createdAt - a.createdAt),
    [chatters, sector, usersById],
  );
  const newest = feed[0]?.id;
  const previous = useRef(newest);

  useEffect(() => {
    if (newest && previous.current && newest !== previous.current && away.current) {
      setUnseen((count) => count + 1);
    }
    previous.current = newest;
  }, [newest]);

  const tape = chatters.filter((chatter) => chatter.roomId === null && chatter.news).slice(-4).reverse();

  return (
    <div className="flex min-h-0 flex-1">
      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="no-scrollbar flex shrink-0 gap-1.5 overflow-x-auto px-3 py-2">
          <FilterChip active={sector === "all"} onClick={() => setSector("all")}>
            All
          </FilterChip>
          {SECTORS.map((item) => (
            <FilterChip key={item} active={sector === item} onClick={() => setSector(item)} title={item}>
              {SECTOR_SHORT[item]}
            </FilterChip>
          ))}
        </div>
        <div
          ref={scroller}
          className="min-h-0 flex-1 overflow-y-auto"
          onScroll={() => {
            const element = scroller.current;
            if (!element) return;
            const nextAway = element.scrollTop > 96;
            away.current = nextAway;
            if (!nextAway) setUnseen(0);
          }}
        >
          {unseen > 0 ? (
            <div className="sticky top-2 z-10 flex justify-center py-1">
              <button
                type="button"
                className="rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground shadow"
                onClick={() => {
                  scroller.current?.scrollTo({ top: 0, behavior: "smooth" });
                  setUnseen(0);
                  away.current = false;
                }}
              >
                {unseen} new
              </button>
            </div>
          ) : null}
          {feed.length === 0 ? (
            <EmptyState title="Nothing on this desk" body="No chatters in this sector right now. The rest of the floor is still live." />
          ) : (
            feed.map((chatter) => {
              const author = usersById.get(chatter.authorId);
              if (!author) return null;
              return (
                <article
                  key={chatter.id}
                  className="animate-in cursor-pointer border-b border-border px-4 py-4 fade-in slide-in-from-top-1 duration-300 hover:bg-white/[0.025] motion-reduce:animate-none"
                  onClick={() => openChatter(author.id, author.id === me?.id, navigate)}
                >
                  <div className="flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2">
                        <AliasButton userId={author.id} alias={author.alias} mine={author.id === me?.id} />
                        {author.id === me?.id ? (
                          <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-primary">You</span>
                        ) : null}
                        <time className="ml-auto shrink-0 text-xs tabular-nums text-muted-foreground" dateTime={new Date(chatter.createdAt).toISOString()}>
                          {formatAge(chatter.createdAt, now)}
                        </time>
                      </div>
                      <div className="mt-1.5">
                        <SectorBadge sector={author.sector} />
                      </div>
                      <p className="mt-2 text-[13px] italic text-muted-foreground">{author.bioQuote}</p>
                    </div>
                    <div onClick={(event) => event.stopPropagation()}>
                      <AliasMenu userId={author.id} chatterId={chatter.id} />
                    </div>
                  </div>
                  {chatter.body ? (
                    <p className="mt-3 font-serif text-[1.35rem] leading-snug font-medium tracking-[-0.015em] text-pretty">
                      {chatter.body}
                    </p>
                  ) : null}
                  {chatter.news ? <NewsCard news={chatter.news} className="mt-3" /> : null}
                  {author.id !== me?.id ? (
                    <div className="mt-3" onClick={(event) => event.stopPropagation()}>
                      <MessageLink userId={author.id} />
                    </div>
                  ) : null}
                </article>
              );
            })
          )}
        </div>
        <Composer roomId={null} placeholder="Drop a take on the floor" />
      </div>
      <aside className="hidden w-[300px] shrink-0 flex-col border-l lg:flex">
        <div className="px-4 pt-4 pb-2">
          <h2 className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">On the tape</h2>
        </div>
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 pb-4">
          {tape.map((chatter) => (chatter.news ? <NewsCard key={chatter.id} news={chatter.news} /> : null))}
          <div className="pt-2">
            <h2 className="px-1 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">Desks</h2>
            <ul className="mt-1">
              {ROOMS.map((room) => (
                <li key={room.id}>
                  <Link to={`/rooms/${room.id}`} className="block rounded-lg px-2 py-2 hover:bg-muted">
                    <div className="text-sm font-medium">#{room.name}</div>
                    <div className="text-xs text-muted-foreground">{room.blurb}</div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </aside>
    </div>
  );
}

function FilterChip({
  active,
  children,
  onClick,
  title,
}: {
  active: boolean;
  children: string;
  onClick: () => void;
  title?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-full border px-3 py-1 text-xs font-medium",
        active ? "border-primary/40 bg-primary/15 text-primary" : "border-border text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function openChatter(userId: string, mine: boolean, navigate: (path: string) => void) {
  if (mine) {
    toast("That's your chatter.");
    return;
  }
  const threadId = openLine(userId);
  if (threadId) navigate(`/inbox/${threadId}`);
}

function AliasButton({ userId, alias, mine }: { userId: string; alias: string; mine: boolean }) {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      className="truncate text-[15px] font-semibold tracking-tight hover:text-primary"
      onClick={(event) => {
        event.stopPropagation();
        openChatter(userId, mine, navigate);
      }}
    >
      {alias}
    </button>
  );
}

function MessageLink({ userId }: { userId: string }) {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      className="text-xs font-medium text-primary"
      onClick={(event) => {
        event.stopPropagation();
        openChatter(userId, false, navigate);
      }}
    >
      Message
    </button>
  );
}
