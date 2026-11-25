import type { ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import type { Room } from "@/backend/types";
import { Hashtags } from "@/components/hashtags";
import { HeatRadar } from "@/components/heat-radar";
import { useFloor } from "@/hooks/use-floor";
import { useNow } from "@/hooks/use-now";
import { countRecent } from "@/lib/heat";
import { formatAge } from "@/lib/time";
import { cn } from "@/lib/utils";

export function RoomLink({ room, trailing }: { room: Room; trailing?: ReactNode }) {
  const { chatters, usersById, joinedRoomIds } = useFloor();
  const now = useNow();
  const [params, setParams] = useSearchParams();
  const joined = joinedRoomIds.includes(room.id);
  const active = params.get("room") === room.id;
  const lines = chatters.filter((chatter) => chatter.roomId === room.id);
  const latest = [...lines].sort((a, b) => b.createdAt - a.createdAt)[0];
  const author = latest ? usersById.get(latest.authorId) : undefined;
  const recent = countRecent(
    lines.map((line) => line.createdAt),
    now,
  );
  const usersLabel = `${room.listeners} ${room.listeners === 1 ? "user" : "users"}`;

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
          </div>
          {room.blurb ? <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{room.blurb}</p> : null}
          <Hashtags tags={room.hashtags} className="mt-1.5" />
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="text-xs text-foreground tabular-nums">{usersLabel}</span>
            <HeatRadar count={recent} />
          </div>
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
