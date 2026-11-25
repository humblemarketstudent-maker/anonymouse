import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { backend } from "@/backend";
import { Hashtags } from "@/components/hashtags";
import { Monogram } from "@/components/monogram";
import { Button } from "@/components/ui/button";
import { useFloor } from "@/hooks/use-floor";
import { openLine } from "@/lib/open-line";

export function ProfileScreen() {
  const { userId = "" } = useParams();
  const { usersById, me, friendIds } = useFloor();
  const navigate = useNavigate();
  const user = usersById.get(userId);

  if (!user || !me) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
        <p className="text-sm text-muted-foreground">That alias isn't here.</p>
        <Button variant="outline" asChild>
          <Link to="/mine">My Rooms</Link>
        </Button>
      </div>
    );
  }

  const mine = user.id === me.id;
  const friend = friendIds.includes(user.id);

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <header className="flex items-center gap-2 border-b px-2 py-2.5">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="Back">
          <ArrowLeft />
        </Button>
        <h1 className="truncate text-base font-semibold">Profile</h1>
      </header>
      <div className="mx-auto w-full max-w-lg px-4 py-6">
        <div className="flex items-center gap-3">
          <Monogram label={user.alias} className="size-12 text-lg" />
          <h2 className="min-w-0 truncate text-3xl font-semibold tracking-tight">{user.alias}</h2>
        </div>
        <p className="mt-3 font-serif text-xl leading-snug">{user.bioQuote}</p>
        <Hashtags tags={user.hashtags} className="mt-4" />
        {mine ? (
          <Button type="button" variant="outline" className="mt-8" onClick={() => navigate("/you")}>
            Edit your profile
          </Button>
        ) : (
          <div className="mt-8 flex flex-col gap-2">
            <Button
              type="button"
              onClick={() => {
                const threadId = openLine(user.id);
                if (threadId) navigate(`/msg/${threadId}`);
              }}
            >
              Message
            </Button>
            <Button
              type="button"
              variant={friend ? "ghost" : "outline"}
              onClick={() => {
                if (friend) {
                  backend.removeFriend(user.id);
                  toast(`Removed ${user.alias}`);
                  return;
                }
                const result = backend.addFriend(user.id);
                if (!result.ok) toast.error(result.error);
                else toast(`${user.alias} is in Friends`);
              }}
            >
              {friend ? "Remove friend" : "Add friend"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
