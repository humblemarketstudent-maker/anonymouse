import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { backend } from "@/backend";
import type { PublicUser } from "@/backend/types";
import { EmptyState } from "@/components/empty-state";
import { Persona } from "@/components/persona";
import { Hashtags } from "@/components/hashtags";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useFloor } from "@/hooks/use-floor";
import { openLine } from "@/lib/open-line";

export function FriendsScreen() {
  const { directory, friendIds, usersById } = useFloor();
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase().replace(/^#/, "");
  const matches = (user: PublicUser) =>
    !q ||
    user.alias.toLowerCase().includes(q) ||
    user.bioQuote.toLowerCase().includes(q) ||
    user.hashtags.some((tag) => tag.includes(q));

  const friends = friendIds
    .map((id) => usersById.get(id))
    .filter((user): user is PublicUser => !!user)
    .filter(matches);
  const others = directory.filter((user) => !friendIds.includes(user.id) && matches(user));

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <header className="px-4 pt-4 pb-3">
        <h1 className="text-lg font-semibold tracking-tight">Friends</h1>
        <p className="text-sm text-muted-foreground">
          Adding a friend is separate from a Match tap. Friends can be messaged directly and included on a blast.
        </p>
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Alias, quote, or #hashtag"
          aria-label="Find an alias"
          className="mt-3 h-10"
        />
      </header>
      <section className="px-4 pb-2">
        <h2 className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">Your friends</h2>
      </section>
      {friends.length === 0 ? (
        q && friendIds.length > 0 ? (
          <p className="px-4 pb-2 text-sm text-muted-foreground">No friends match that search.</p>
        ) : (
          <EmptyState title="No friends yet" body="Add someone from their profile in a room, a conversation, or the list below." />
        )
      ) : (
        <ul>
          {friends.map((user) => (
            <FriendRow key={user.id} user={user} friend />
          ))}
        </ul>
      )}
      <section className="px-4 pt-6 pb-2">
        <h2 className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">Everyone else</h2>
      </section>
      {others.length === 0 ? (
        <p className="px-4 pb-8 text-sm text-muted-foreground">No aliases match.</p>
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
      {user.avatar ? <Persona label={user.alias} avatar={user.avatar} className="mt-0.5 size-10" /> : null}
      <div className="min-w-0 flex-1">
        <button
          type="button"
          className="font-semibold hover:text-primary"
          onClick={() => {
            const threadId = openLine(user.id);
            if (threadId) navigate(`/msg/${threadId}`);
          }}
        >
          {user.alias}
        </button>
        <p className="mt-1 text-sm italic text-muted-foreground">{user.bioQuote}</p>
        <Hashtags tags={user.hashtags} className="mt-1.5" />
      </div>
      <div className="flex shrink-0 flex-col gap-1">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => {
            const threadId = openLine(user.id);
            if (threadId) navigate(`/msg/${threadId}`);
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
              toast("Removed from Friends");
              return;
            }
            const result = backend.addFriend(user.id);
            if (!result.ok) toast.error(result.error);
            else toast(`${user.alias} is in Friends`);
          }}
        >
          {friend ? "Remove" : "Add"}
        </Button>
      </div>
    </li>
  );
}
