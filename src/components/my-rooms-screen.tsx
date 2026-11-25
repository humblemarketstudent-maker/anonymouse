import { toast } from "sonner";
import { backend } from "@/backend";
import { EmptyState } from "@/components/empty-state";
import { RoomLink } from "@/components/room-link";
import { Button } from "@/components/ui/button";
import { useFloor } from "@/hooks/use-floor";

export function MyRoomsScreen() {
  const { rooms, joinedRoomIds } = useFloor();
  const joined = joinedRoomIds
    .map((id) => rooms.find((room) => room.id === id))
    .filter((room) => room != null);

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <header className="px-4 pt-4 pb-2">
        <h1 className="text-lg font-semibold tracking-tight">My Rooms</h1>
        <p className="text-sm text-muted-foreground">Open a room to see who's in it. Leave any time.</p>
      </header>
      {joined.length === 0 ? (
        <EmptyState title="No rooms yet" body="Search Chats for a name or a hashtag, then join. A room you create lands here too." />
      ) : (
        <ul>
          {joined.map((room) => (
            <RoomLink
              key={room.id}
              room={room}
              trailing={
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="mt-1 shrink-0"
                  onClick={() => {
                    const result = backend.leaveRoom(room.id);
                    if (!result.ok) toast.error(result.error);
                    else toast(`Left ${room.name}`);
                  }}
                >
                  Leave
                </Button>
              }
            />
          ))}
        </ul>
      )}
    </div>
  );
}
