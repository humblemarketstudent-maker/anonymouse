import { useMemo } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { backend } from "@/backend";
import type { PublicUser } from "@/backend/types";
import { Composer } from "@/components/composer";
import { Button } from "@/components/ui/button";
import { useFloor } from "@/hooks/use-floor";

export function RoomScreen() {
  const { roomId = "" } = useParams();
  const { rooms, chatters, usersById, me, joinedRoomIds } = useFloor();
  const room = rooms.find((item) => item.id === roomId);
  const navigate = useNavigate();
  const joined = joinedRoomIds.includes(roomId);

  const people = useMemo(() => {
    const latest = new Map<string, { at: number; text: string }>();
    for (const line of chatters) {
      if (line.roomId !== roomId) continue;
      const text = line.body || line.news?.title || "";
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
  }, [chatters, roomId, usersById]);

  if (!room) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
        <p className="text-sm text-muted-foreground">That room isn't here.</p>
        <Button variant="outline" asChild>
          <Link to="/mine">My Rooms</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex shrink-0 items-center gap-2 border-b px-2 py-2.5">
        <Button variant="ghost" size="icon" asChild>
          <Link to={joined ? "/mine" : "/"} aria-label={joined ? "My rooms" : "Chats"}>
            <ArrowLeft />
          </Link>
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-semibold">{room.name}</h1>
          <p className="truncate text-xs text-muted-foreground">{people.length} in this room</p>
        </div>
        {joined ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
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
      <ul className="min-h-0 flex-1 overflow-y-auto">
        {people.length === 0 ? (
          <li className="px-4 py-10 text-center text-sm text-muted-foreground">No one has spoken in here yet.</li>
        ) : (
          people.map(({ user, text }) => {
            const mine = user.id === me?.id;
            return (
              <li key={user.id} className="border-b border-border px-4 py-3">
                <button
                  type="button"
                  className="text-left text-[15px] font-semibold hover:text-primary"
                  onClick={() => navigate(mine ? "/you" : `/profile/${user.id}`)}
                >
                  {user.alias}
                  {mine ? <span className="ml-2 text-[10px] font-medium uppercase tracking-[0.14em] text-primary">You</span> : null}
                </button>
                <p className="mt-0.5 truncate text-sm text-muted-foreground">{text || "…"}</p>
              </li>
            );
          })
        )}
      </ul>
      {joined ? (
        <Composer roomId={room.id} placeholder={`Message ${room.name}`} />
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
