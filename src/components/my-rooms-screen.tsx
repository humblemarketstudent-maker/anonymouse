import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { backend } from "@/backend";
import { EmptyState } from "@/components/empty-state";
import { PickPane, SplitView } from "@/components/split-view";
import { RoomLink } from "@/components/room-link";
import { RoomScreen } from "@/components/room-screen";
import { Button } from "@/components/ui/button";
import { useFloor } from "@/hooks/use-floor";

export function MyRoomsScreen() {
  const { rooms, joinedRoomIds } = useFloor();
  const [params, setParams] = useSearchParams();
  const roomId = params.get("room") ?? "";
  const joined = joinedRoomIds.map((id) => rooms.find((room) => room.id === id)).filter((room) => room != null);

  return (
    <SplitView
      open={Boolean(roomId)}
      list={
        <>
          <header className="shrink-0 px-4 pt-4 pb-2">
            <h1 className="text-lg font-semibold tracking-tight">My Rooms</h1>
            <p className="text-sm text-muted-foreground">Open a room to see who's in it. Leave any time.</p>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto">
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
                          if (!result.ok) {
                            toast.error(result.error);
                            return;
                          }
                          toast(`Left ${room.name}`);
                          if (params.get("room") === room.id) {
                            const next = new URLSearchParams(params);
                            next.delete("room");
                            setParams(next, { replace: true });
                          }
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
        </>
      }
      panel={
        roomId ? (
          <RoomScreen key={roomId} roomId={roomId} backTo="/mine" />
        ) : (
          <PickPane title="Pick a room" body="Open one of your rooms. It stays on this screen." />
        )
      }
    />
  );
}
