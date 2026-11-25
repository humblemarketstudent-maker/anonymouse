import { useEffect } from "react";
import { toast } from "sonner";
import { backend } from "@/backend";
import type { PublicUser } from "@/backend/types";
import { Hashtags } from "@/components/hashtags";
import { Button } from "@/components/ui/button";
import { useFloor } from "@/hooks/use-floor";

export function MatchScreen() {
  const { matchPeerIds, usersById, incomingTaps, outgoingTaps, tapsRemaining, tapLimit, friendIds } = useFloor();

  useEffect(() => {
    backend.ensureMatch();
  }, []);

  const cards = matchPeerIds
    .map((id) => usersById.get(id))
    .filter((user): user is PublicUser => !!user);
  const waiting = outgoingTaps
    .map((tap) => ({ tap, user: usersById.get(tap.toId) }))
    .filter((item): item is { tap: (typeof outgoingTaps)[number]; user: PublicUser } => !!item.user);
  const incoming = incomingTaps
    .map((tap) => ({ tap, user: usersById.get(tap.fromId) }))
    .filter((item): item is { tap: (typeof incomingTaps)[number]; user: PublicUser } => !!item.user);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="shrink-0 px-4 pt-4 pb-3">
        <h1 className="text-lg font-semibold tracking-tight">Match</h1>
        <p className="text-sm text-muted-foreground">Ten aliases at a time. A tap asks for a private chat. Nothing starts until they accept.</p>
        <p className="mt-2 text-sm">
          <span className="font-semibold tabular-nums text-primary">{tapsRemaining}</span>
          <span className="text-muted-foreground"> of {tapLimit} taps left today</span>
        </p>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {incoming.length > 0 ? (
          <section>
            <h2 className="px-4 pb-1 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
              Tapped you
            </h2>
            <ul>
              {incoming.map(({ tap, user }) => (
                <li key={tap.id} className="border-b border-border px-4 py-4">
                  <ProfileBlock user={user} />
                  <div className="mt-3 flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        const result = backend.declineTap(tap.id);
                        if (!result.ok) toast.error(result.error);
                        else toast(`${user.alias} stays out of Match for a while`);
                      }}
                    >
                      Decline
                    </Button>
                    <Button
                      type="button"
                      className="flex-1"
                      onClick={() => {
                        const result = backend.acceptTap(tap.id);
                        if (!result.ok) toast.error(result.error);
                        else toast.success(`Match started with ${user.alias}. It's in MSG.`);
                      }}
                    >
                      Accept
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {waiting.length > 0 ? (
          <section>
            <h2 className="px-4 pt-4 pb-1 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
              Waiting
            </h2>
            <ul>
              {waiting.map(({ tap, user }) => (
                <li key={tap.id} className="border-b border-border px-4 py-3">
                  <p className="text-sm font-medium">{user.alias}</p>
                  <p className="text-xs text-muted-foreground">Requested. They usually answer in a few seconds.</p>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {cards.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground">
            Nobody new in this pass. Another 10 pulls a fresh set. Declines stay out for a while.
          </p>
        ) : (
          <ul>
            {cards.map((user) => (
              <MatchCard key={user.id} user={user} friend={friendIds.includes(user.id)} tapsRemaining={tapsRemaining} />
            ))}
          </ul>
        )}
      </div>
      <footer className="shrink-0 border-t bg-background px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <p className="text-center text-sm">
          {tapsRemaining === 0 ? (
            <span className="text-muted-foreground">No taps left today. The count resets at midnight.</span>
          ) : (
            <>
              <span className="font-semibold tabular-nums text-primary">{tapsRemaining}</span>
              <span className="text-muted-foreground"> {tapsRemaining === 1 ? "tap" : "taps"} left today</span>
            </>
          )}
        </p>
        <Button
          type="button"
          variant="outline"
          className="mt-2 h-11 w-full"
          onClick={() => {
            const result = backend.refreshMatch();
            if (!result.ok) toast.error(result.error);
          }}
        >
          Another 10
        </Button>
      </footer>
    </div>
  );
}

function ProfileBlock({ user }: { user: PublicUser }) {
  return (
    <div>
      <h3 className="text-base font-semibold">{user.alias}</h3>
      <p className="mt-1 font-serif text-lg leading-snug">{user.bioQuote}</p>
      <Hashtags tags={user.hashtags} className="mt-2" />
    </div>
  );
}

function MatchCard({
  user,
  friend,
  tapsRemaining,
}: {
  user: PublicUser;
  friend: boolean;
  tapsRemaining: number;
}) {
  return (
    <li className="border-b border-border px-4 py-4">
      <ProfileBlock user={user} />
      <div className="mt-3 flex items-center justify-between gap-3">
        <button
          type="button"
          className="text-xs text-muted-foreground hover:text-foreground"
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
        </button>
        <Button
          type="button"
          disabled={tapsRemaining === 0}
          onClick={() => {
            const result = backend.tapUser(user.id);
            if (!result.ok) toast.error(result.error);
            else toast(`Tapped ${user.alias}`);
          }}
        >
          {tapsRemaining === 0 ? "No taps" : "Tap"}
        </Button>
      </div>
    </li>
  );
}
