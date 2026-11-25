import { NavLink, Outlet, useMatch } from "react-router-dom";
import { EmptyState } from "@/components/empty-state";
import { Hashtags } from "@/components/hashtags";
import { useFloor } from "@/hooks/use-floor";
import { useNow } from "@/hooks/use-now";
import { formatAge } from "@/lib/time";
import { cn } from "@/lib/utils";

export function InboxLayout() {
  const match = useMatch("/msg/:threadId");
  const open = Boolean(match);
  return (
    <div className="flex min-h-0 flex-1">
      <section className={cn("min-h-0 w-full flex-col md:flex md:w-[340px] md:border-r", open ? "hidden" : "flex")}>
        <header className="px-4 pt-4 pb-2">
          <h1 className="text-lg font-semibold tracking-tight">MSG</h1>
          <p className="text-xs text-muted-foreground">Private lines. From a room, from Friends, or from a Match that was accepted.</p>
        </header>
        <ThreadList />
      </section>
      <section className={cn("min-h-0 min-w-0 flex-1 flex-col", open ? "flex" : "hidden md:flex")}>
        <Outlet />
      </section>
    </div>
  );
}

export function InboxHome() {
  return <EmptyState title="Pick a line" body="Open a conversation, or start one from a room, a friend, or an accepted tap." />;
}

function ThreadList() {
  const { threads, usersById } = useFloor();
  const now = useNow();
  if (threads.length === 0) {
    return (
      <EmptyState
        title="No messages"
        body="Tap an alias in a room to start a private chat, or accept a Match tap. Nothing opens until a tap is accepted."
      />
    );
  }
  return (
    <ul className="min-h-0 flex-1 overflow-y-auto">
      {threads.map((thread) => {
        const peer = usersById.get(thread.peerId);
        if (!peer) return null;
        return (
          <li key={thread.id} className="border-b border-border">
            <NavLink
              to={`/msg/${thread.id}`}
              className={({ isActive }) => cn("block px-4 py-3 hover:bg-muted/60", isActive && "bg-muted")}
            >
              <div className="flex items-baseline gap-2">
                <span className="truncate font-semibold">{peer.alias}</span>
                <span className="shrink-0 text-[10px] font-medium uppercase tracking-[0.14em] text-primary">
                  {thread.origin === "match" ? "Match" : "Direct"}
                </span>
                {thread.unread > 0 ? <span className="size-1.5 shrink-0 rounded-full bg-primary" /> : null}
                <time className="ml-auto shrink-0 text-[11px] tabular-nums text-muted-foreground">
                  {formatAge(thread.updatedAt, now)}
                </time>
              </div>
              <Hashtags tags={peer.hashtags.slice(0, 3)} className="mt-1.5" />
              <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">{thread.preview}</p>
            </NavLink>
          </li>
        );
      })}
    </ul>
  );
}
