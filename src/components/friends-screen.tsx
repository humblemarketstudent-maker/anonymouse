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
import { openLine, threadPath } from "@/lib/open-line";

export function FriendsScreen() {
  const { friendIds, usersById } = useFloor();
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

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <header className="px-4 pt-4 pb-3">
        <h1 className="text-lg font-semibold tracking-tight">Friends</h1>
        <p className="text-sm text-muted-foreground">
          Friends you added. This is separate from a Match tap. Message them directly, or include them on a blast.
        </p>
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Alias, quote, or #hashtag"
          aria-label="Find a friend"
          className="mt-3 h-10"
        />
      </header>
      {friends.length === 0 ? (
        q && friendIds.length > 0 ? (
          <p className="px-4 pb-8 text-sm text-muted-foreground">No friends match that search.</p>
        ) : (
          <EmptyState
            title="No friends yet"
            body="Add someone from their profile in a room, a conversation, or Match."
          />
        )
      ) : (
        <ul className="pb-6">
          {friends.map((user) => (
            <FriendRow key={user.id} user={user} />
          ))}
        </ul>
      )}
    </div>
  );
}

function FriendRow({ user }: { user: PublicUser }) {
  const navigate = useNavigate();
  return (
    <li className="flex items-start gap-3 border-b border-border px-4 py-3">
      <Persona label={user.alias} avatar={user.avatar} className="mt-0.5 size-10" />
      <div className="min-w-0 flex-1">
        <button
          type="button"
          className="font-semibold hover:text-primary"
          onClick={() => {
            const threadId = openLine(user.id);
            if (threadId) navigate(threadPath(threadId));
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
            if (threadId) navigate(threadPath(threadId));
          }}
        >
          Message
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => {
            backend.removeFriend(user.id);
            toast("Removed from Friends");
          }}
        >
          Remove
        </Button>
      </div>
    </li>
  );
}
