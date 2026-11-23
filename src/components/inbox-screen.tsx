import { NavLink, Outlet, useMatch } from "react-router-dom";
import { EmptyState } from "@/components/empty-state";
import { SectorBadge } from "@/components/sector-badge";
import { useFloor } from "@/hooks/use-floor";
import { useNow } from "@/hooks/use-now";
import { formatAge } from "@/lib/time";
import { cn } from "@/lib/utils";

export function InboxLayout() {
  const match = useMatch("/inbox/:threadId");
  const open = Boolean(match);
  return (
    <div className="flex min-h-0 flex-1">
      <section className={cn("min-h-0 w-full flex-col md:flex md:w-[340px] md:border-r", open ? "hidden" : "flex")}>
        <header className="px-4 pt-4 pb-2">
          <h1 className="text-lg font-semibold tracking-tight">Inbox</h1>
          <p className="text-xs text-muted-foreground">Alias to alias. Nothing else travels with the message.</p>
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
  return <EmptyState title="Pick a line" body="Open a thread, or tap an alias on the floor to start one." />;
}

function ThreadList() {
  const { threads, usersById } = useFloor();
  const now = useNow();
  if (threads.length === 0) {
    return <EmptyState title="No open lines" body="Tap a chatter to start an anonymous DM. Burn it whenever you want it gone." />;
  }
  return (
    <ul className="min-h-0 flex-1 overflow-y-auto">
      {threads.map((thread) => {
        const peer = usersById.get(thread.peerId);
        if (!peer) return null;
        return (
          <li key={thread.id} className="border-b border-border">
            <NavLink
              to={`/inbox/${thread.id}`}
              className={({ isActive }) => cn("block px-4 py-3 hover:bg-muted/60", isActive && "bg-muted")}
            >
              <div className="flex items-baseline gap-2">
                <span className="truncate font-semibold">{peer.alias}</span>
                {thread.unread > 0 ? <span className="size-1.5 shrink-0 rounded-full bg-primary" /> : null}
                <time className="ml-auto shrink-0 text-[11px] tabular-nums text-muted-foreground">
                  {formatAge(thread.updatedAt, now)}
                </time>
              </div>
              <div className="mt-1">
                <SectorBadge sector={peer.sector} />
              </div>
              <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">{thread.preview}</p>
            </NavLink>
          </li>
        );
      })}
    </ul>
  );
}
