import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { backend } from "@/backend";
import type { PublicUser } from "@/backend/types";
import { SectorBadge } from "@/components/sector-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/empty-state";
import { useFloor } from "@/hooks/use-floor";
import { openLine } from "@/lib/open-line";

export function FriendsScreen() {
  const { directory, friendIds, usersById } = useFloor();
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const matches = (user: PublicUser) =>
    !q ||
    user.alias.toLowerCase().includes(q) ||
    user.sector.toLowerCase().includes(q) ||
    user.bioQuote.toLowerCase().includes(q);

  const friends = friendIds
    .map((id) => usersById.get(id))
    .filter((user): user is PublicUser => !!user)
    .filter(matches);
  const others = directory.filter((user) => !friendIds.includes(user.id) && matches(user));

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <header className="px-4 pt-4 pb-3">
        <h1 className="text-lg font-semibold tracking-tight">Friends</h1>
        <p className="text-sm text-muted-foreground">Aliases you can blast. A few were seated with you so the list isn't empty.</p>
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Find an alias or a desk"
          aria-label="Find an alias"
          className="mt-3 h-10"
        />
      </header>
      <section className="px-4 pb-2">
        <h2 className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">Your list</h2>
      </section>
      {friends.length === 0 ? (
        <EmptyState title="No one on this list" body="Add an alias from the floor when you want them on a blast." />
      ) : (
        <ul>
          {friends.map((user) => (
            <FriendRow key={user.id} user={user} friend />
          ))}
        </ul>
      )}
      <section className="px-4 pt-6 pb-2">
        <h2 className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">On the floor</h2>
      </section>
      {others.length === 0 ? (
        <p className="px-4 pb-8 text-sm text-muted-foreground">No other aliases match.</p>
      ) : (
        <ul className="pb-6">
          {others.map((user) => (
            <FriendRow key={user.id} user={user} friend={false} />
          ))}
        </ul>
      )}
    </div>
  );
}

function FriendRow({ user, friend }: { user: PublicUser; friend: boolean }) {
  const navigate = useNavigate();
  return (
    <li className="flex items-start gap-3 border-b border-border px-4 py-3">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="font-semibold hover:text-primary"
            onClick={() => {
              const threadId = openLine(user.id);
              if (threadId) navigate(`/inbox/${threadId}`);
            }}
          >
            {user.alias}
          </button>
          <SectorBadge sector={user.sector} />
        </div>
        <p className="mt-1 text-sm italic text-muted-foreground">{user.bioQuote}</p>
      </div>
      <div className="flex shrink-0 flex-col gap-1">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => {
            const threadId = openLine(user.id);
            if (threadId) navigate(`/inbox/${threadId}`);
          }}
        >
          Message
        </Button>
        <Button
          type="button"
          size="sm"
          variant={friend ? "ghost" : "secondary"}
          onClick={() => {
            if (friend) {
              backend.removeFriend(user.id);
              toast("Removed from your list");
              return;
            }
            const result = backend.addFriend(user.id);
            if (!result.ok) toast.error(result.error);
            else toast(`${user.alias} is on your list`);
          }}
        >
          {friend ? "Remove" : "Add"}
        </Button>
      </div>
    </li>
  );
}
