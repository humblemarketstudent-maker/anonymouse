import { Link } from "react-router-dom";
import { ROOMS } from "@/data/floor";
import { useFloor } from "@/hooks/use-floor";
import { useNow } from "@/hooks/use-now";
import { formatAge } from "@/lib/time";

export function RoomsScreen() {
  const { chatters, usersById } = useFloor();
  const now = useNow();

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <header className="px-4 pt-4 pb-2">
        <h1 className="text-lg font-semibold tracking-tight">Rooms</h1>
        <p className="text-sm text-muted-foreground">Public desks. Post a take or a link. Still no names.</p>
      </header>
      <ul>
        {ROOMS.map((room) => {
          const latest = chatters
            .filter((chatter) => chatter.roomId === room.id)
            .sort((a, b) => b.createdAt - a.createdAt)[0];
          const author = latest ? usersById.get(latest.authorId) : undefined;
          const listeners = room.listeners + ((Math.floor(now / 5000) + room.name.length) % 7) - 3;
          return (
            <li key={room.id} className="border-b border-border">
              <Link to={`/rooms/${room.id}`} className="block px-4 py-3.5 hover:bg-muted/60">
                <div className="flex items-baseline justify-between gap-3">
                  <h2 className="text-[15px] font-semibold">#{room.name}</h2>
                  <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">{listeners} listening</span>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">{room.blurb}</p>
                {latest && author ? (
                  <p className="mt-2 truncate text-sm text-foreground/80">
                    <span className="font-medium">{author.alias}</span>
                    <span className="text-muted-foreground"> · {formatAge(latest.createdAt, now)} · </span>
                    {latest.body || latest.news?.title}
                  </p>
                ) : (
                  <p className="mt-2 text-sm text-muted-foreground">The desk is quiet.</p>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
