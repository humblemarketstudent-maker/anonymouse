import type { ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import type { Room } from "@/backend/types";
import { Hashtags } from "@/components/hashtags";
import { useFloor } from "@/hooks/use-floor";
import { useNow } from "@/hooks/use-now";
import { formatAge } from "@/lib/time";
import { cn } from "@/lib/utils";

export function RoomLink({ room, trailing }: { room: Room; trailing?: ReactNode }) {
  const { chatters, usersById, joinedRoomIds } = useFloor();
  const now = useNow();
  const [params, setParams] = useSearchParams();
  const joined = joinedRoomIds.includes(room.id);
  const active = params.get("room") === room.id;
  const latest = chatters.filter((chatter) => chatter.roomId === room.id).sort((a, b) => b.createdAt - a.createdAt)[0];
  const author = latest ? usersById.get(latest.authorId) : undefined;

  function open() {
    const next = new URLSearchParams(params);
    next.set("room", room.id);
    setParams(next);
  }

  return (
    <li className={cn("border-b border-border", active && "bg-muted")}>
      <div className="flex items-start gap-2 px-4 py-3.5">
        <button
          type="button"
          onClick={open}
          aria-current={active ? "true" : undefined}
          className="min-w-0 flex-1 text-left hover:opacity-90"
        >
          <div className="flex items-baseline gap-2">
            <h2 className="truncate text-[15px] font-semibold">{room.name}</h2>
            {joined ? <span className="shrink-0 text-[10px] font-medium tracking-[0.14em] text-primary uppercase">Joined</span> : null}
            <span className="ml-auto shrink-0 text-[11px] tabular-nums text-muted-foreground">{room.listeners}</span>
          </div>
          <Hashtags tags={room.hashtags} className="mt-1.5" />
          {room.blurb ? <p className="mt-1.5 line-clamp-2 text-xs text-muted-foreground">{room.blurb}</p> : null}
          {latest && author ? (
            <p className="mt-2 truncate text-sm text-foreground/80">
              <span className="font-medium">{author.alias}</span>
              <span className="text-muted-foreground"> · {formatAge(latest.createdAt, now)} · </span>
              {latest.body || latest.news?.title}
            </p>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">No lines yet.</p>
          )}
        </button>
        {trailing}
      </div>
    </li>
  );
}
