import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { EmptyState } from "@/components/empty-state";
import { PickPane, SplitView } from "@/components/split-view";
import { RoomLink } from "@/components/room-link";
import { RoomScreen } from "@/components/room-screen";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useFloor } from "@/hooks/use-floor";
import { searchRooms } from "@/lib/search";
import { cn } from "@/lib/utils";

export function ChatsScreen() {
  const { rooms, topHashtags } = useFloor();
  const [params] = useSearchParams();
  const roomId = params.get("room") ?? "";
  const qParam = params.get("q");
  const [query, setQuery] = useState(qParam ?? "");
  const [appliedQ, setAppliedQ] = useState(qParam);
  if (qParam !== appliedQ) {
    setAppliedQ(qParam);
    if (qParam != null) setQuery(qParam);
  }
  const trimmed = query.trim();
  const tagMode = trimmed.startsWith("#");
  const term = trimmed.replace(/^#+/, "").trim().toLowerCase();
  const results = useMemo(() => searchRooms(rooms, query), [rooms, query]);
  const tagHits = !tagMode && term ? topHashtags.filter((item) => item.tag.includes(term)).slice(0, 8) : [];
  const createTag = tagMode ? term : "";
  const back = new URLSearchParams(params);
  back.delete("room");
  const backTo = back.toString() ? `/?${back.toString()}` : "/";

  return (
    <SplitView
      open={Boolean(roomId)}
      list={
        <>
          <header className="shrink-0 px-4 pt-4 pb-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="text-lg font-semibold tracking-tight">Chats</h1>
                <p className="text-sm text-muted-foreground">Rooms by name or hashtag. No fixed list of desks.</p>
              </div>
              <Button asChild size="sm">
                <Link to={createTag ? `/chats/new?tag=${encodeURIComponent(createTag)}` : "/chats/new"}>New room</Link>
              </Button>
            </div>
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search a name or #hashtag"
              aria-label="Search rooms"
              className="mt-3 h-10"
            />
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {!trimmed ? (
              <div className="px-4 pb-3">
                <p className="text-[11px] font-medium tracking-[0.14em] text-muted-foreground uppercase">Browse hashtags</p>
                <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1">
                  {topHashtags.map((item) => (
                    <button
                      key={item.tag}
                      type="button"
                      onClick={() => setQuery(`#${item.tag}`)}
                      className="shrink-0 rounded-full border border-border px-2.5 py-1 text-xs text-foreground hover:border-primary hover:text-primary"
                    >
                      #{item.tag}
                      <span className="ml-1 tabular-nums text-muted-foreground">{item.count}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {tagHits.length > 0 ? (
              <div className="px-4 pb-3">
                <p className="text-[11px] font-medium tracking-[0.14em] text-muted-foreground uppercase">Hashtags</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {tagHits.map((item) => (
                    <button
                      key={item.tag}
                      type="button"
                      onClick={() => setQuery(`#${item.tag}`)}
                      className={cn("rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary")}
                    >
                      #{item.tag}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {results.length === 0 ? (
              <EmptyState
                title="No room matches"
                body="Try another name, search a hashtag with #, or start a room with the tags you meant."
              />
            ) : (
              <ul>
                {results.map((room) => (
                  <RoomLink key={room.id} room={room} />
                ))}
              </ul>
            )}
            <p className="px-4 py-4 text-[11px] text-muted-foreground">
              {results.length} {results.length === 1 ? "room" : "rooms"}
              {trimmed ? " matching" : ""}. Open one to read it. Join to post.
            </p>
          </div>
        </>
      }
      panel={
        roomId ? (
          <RoomScreen key={roomId} roomId={roomId} backTo={backTo} />
        ) : (
          <PickPane title="Pick a room" body="Choose a room from the list. The conversation opens here." />
        )
      }
    />
  );
}
