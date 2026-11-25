import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { backend } from "@/backend";
import type { OutgoingTap, PublicUser } from "@/backend/types";
import { Hashtags } from "@/components/hashtags";
import { Persona } from "@/components/persona";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useFloor } from "@/hooks/use-floor";
import { hashtagHits, hashtagTerm } from "@/lib/hashtags";

export function MatchScreen() {
  const { matchPeerIds, matchEligibleIds, usersById, incomingTaps, outgoingTaps, tapsRemaining, tapLimit, friendIds } =
    useFloor();
  const [query, setQuery] = useState("");
  const [spin, setSpin] = useState(1);
  const [now, setNow] = useState(() => Date.now());
  const term = hashtagTerm(query);

  useEffect(() => {
    backend.ensureMatch();
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (outgoingTaps.some((tap) => tap.expiresAt <= Date.now())) backend.sweepTaps();
  }, [now, outgoingTaps]);

  const waiting = outgoingTaps
    .map((tap) => ({ tap, user: usersById.get(tap.toId) }))
    .filter((item): item is { tap: OutgoingTap; user: PublicUser } => !!item.user);
  const incoming = incomingTaps
    .map((tap) => ({ tap, user: usersById.get(tap.fromId) }))
    .filter((item): item is { tap: (typeof incomingTaps)[number]; user: PublicUser } => !!item.user)
    .filter(({ user }) => !term || hashtagHits(user.hashtags, term));

  const cards = useMemo(() => {
    const ids = term
      ? shuffled(
          matchEligibleIds.filter((id) => {
            const user = usersById.get(id);
            return !!user && hashtagHits(user.hashtags, term);
          }),
          spin,
        ).slice(0, 20)
      : matchPeerIds;
    return ids.map((id) => usersById.get(id)).filter((user): user is PublicUser => !!user);
  }, [term, matchEligibleIds, matchPeerIds, usersById, spin]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="shrink-0 px-4 pt-4 pb-3">
        <h1 className="text-lg font-semibold tracking-tight">Match</h1>
        <p className="text-sm text-muted-foreground">
          20 aliases at a time. A tap asks for a private chat. Nothing starts until they accept.
        </p>
        <p className="mt-2 text-sm">
          <span className="font-semibold tabular-nums text-primary">{tapsRemaining}</span>
          <span className="text-muted-foreground"> of {tapLimit} taps left today</span>
        </p>
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Filter with #hashtag"
          aria-label="Filter by hashtag"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          className="mt-3 h-10"
        />
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
              Pending
            </h2>
            <ul>
              {waiting.map(({ tap, user }) => (
                <li key={tap.id} className="border-b border-border px-4 py-3">
                  <p className="text-sm font-semibold">{user.alias}</p>
                  <PendingBar createdAt={tap.createdAt} expiresAt={tap.expiresAt} now={now} />
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {cards.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground">
            {term
              ? `No one with #${term} is available right now.`
              : "Nobody new in this pass. Refresh pulls another set. Unanswered taps stay out."}
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
            setSpin((value) => value + 1);
          }}
        >
          REFRESH
        </Button>
      </footer>
    </div>
  );
}

function PendingBar({ createdAt, expiresAt, now }: { createdAt: number; expiresAt: number; now: number }) {
  const total = Math.max(1, expiresAt - createdAt);
  const left = Math.max(0, expiresAt - now);
  const pct = Math.min(100, (left / total) * 100);
  const minutes = Math.ceil(left / 60_000);
  return (
    <div className="mt-2">
      <div className="mb-1 flex items-center justify-between text-[10px] font-medium uppercase tracking-[0.14em] text-primary">
        <span>Pending</span>
        <span className="tabular-nums">{minutes <= 1 ? "<1m" : `${minutes}m`}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted" role="meter" aria-label="Time left on this tap" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-full rounded-full bg-primary transition-[width] duration-1000 ease-linear" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function ProfileBlock({ user }: { user: PublicUser }) {
  return (
    <div className="flex items-start gap-3">
      {user.avatar ? <Persona label={user.alias} avatar={user.avatar} className="size-11" /> : null}
      <div className="min-w-0">
      <h3 className="text-base font-semibold">{user.alias}</h3>
      <p className="mt-1 font-serif text-lg leading-snug">{user.bioQuote}</p>
      <Hashtags tags={user.hashtags} className="mt-2" />
      </div>
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

function shuffled<T>(list: T[], seed: number): T[] {
  const next = [...list];
  let state = (seed >>> 0) || 1;
  const rand = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(rand() * (index + 1));
    const current = next[index]!;
    next[index] = next[swap]!;
    next[swap] = current;
  }
  return next;
}
