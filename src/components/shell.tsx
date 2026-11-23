import { Bell, CircleUserRound, Hash, Inbox, Radio, Users } from "lucide-react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { backend } from "@/backend";
import { Mark } from "@/components/mark";
import { ModerationProvider } from "@/components/moderation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useFloor } from "@/hooks/use-floor";
import { cn } from "@/lib/utils";

const LINKS = [
  { to: "/", label: "Chatter", icon: Radio, end: true },
  { to: "/rooms", label: "Rooms", icon: Hash, end: false },
  { to: "/inbox", label: "Inbox", icon: Inbox, end: false },
  { to: "/friends", label: "Friends", icon: Users, end: true },
  { to: "/me", label: "You", icon: CircleUserRound, end: true },
] as const;

export function Shell() {
  return (
    <ModerationProvider>
      <div className="flex h-dvh overflow-hidden bg-background text-foreground">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar />
          <div className="flex min-h-0 flex-1 flex-col">
            <Outlet />
            <MobileNav />
          </div>
        </div>
      </div>
    </ModerationProvider>
  );
}

function Sidebar() {
  return (
    <aside className="hidden w-[220px] shrink-0 flex-col border-r md:flex">
      <NavLink to="/" className="flex items-center gap-2.5 px-4 py-4">
        <Mark className="size-9" />
        <span>
          <span className="block text-base font-semibold tracking-tight">Anonymouse</span>
          <span className="block text-[11px] text-muted-foreground">The floor</span>
        </span>
      </NavLink>
      <nav className="flex flex-1 flex-col gap-1 px-2">
        {LINKS.map((link) => (
          <NavItem key={link.to} {...link} />
        ))}
      </nav>
      <p className="px-4 py-4 text-[11px] leading-relaxed text-muted-foreground">
        Demo floor. Code 000000. Nothing here is advice.
      </p>
    </aside>
  );
}

function NavItem({ to, label, icon: Icon, end }: (typeof LINKS)[number]) {
  const { threads } = useFloor();
  const unread = threads.reduce((sum, thread) => sum + thread.unread, 0);
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground",
          isActive && "bg-primary/10 text-primary",
        )
      }
    >
      <Icon className="size-4" />
      <span>{label}</span>
      {label === "Inbox" && unread > 0 ? (
        <span className="ml-auto rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">
          {unread}
        </span>
      ) : null}
    </NavLink>
  );
}

function TopBar() {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b px-4">
      <NavLink to="/" className="flex items-center gap-2 md:hidden">
        <Mark className="size-7" />
        <span className="font-semibold tracking-tight">Anonymouse</span>
      </NavLink>
      <p className="hidden text-sm text-muted-foreground md:block">Anonymous floor. No names, no faces.</p>
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="relative flex size-1.5">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-60 motion-reduce:animate-none" />
            <span className="relative size-1.5 rounded-full bg-primary" />
          </span>
          Live
        </span>
        <BellMenu />
      </div>
    </header>
  );
}

function BellMenu() {
  const { notifications } = useFloor();
  const navigate = useNavigate();
  const unread = notifications.filter((note) => !note.read).length;
  return (
    <DropdownMenu onOpenChange={(open) => { if (open) backend.markNotificationsRead(); }}>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="ghost" size="icon" aria-label={unread ? `${unread} notifications` : "Notifications"} className="relative">
          <Bell />
          {unread > 0 ? (
            <span className="absolute top-1 right-1 size-2 rounded-full bg-primary" />
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        {notifications.length === 0 ? (
          <p className="px-3 py-6 text-center text-sm text-muted-foreground">Nothing new on your lines.</p>
        ) : (
          notifications.slice(0, 8).map((note) => (
            <DropdownMenuItem
              key={note.id}
              className="items-start"
              onSelect={() => {
                if (note.threadId) navigate(`/inbox/${note.threadId}`);
              }}
            >
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">{note.title}</span>
                <span className="line-clamp-2 text-xs text-muted-foreground">{note.body}</span>
              </span>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function MobileNav() {
  const { threads } = useFloor();
  const unread = threads.reduce((sum, thread) => sum + thread.unread, 0);
  return (
    <nav className="grid h-16 shrink-0 grid-cols-5 border-t bg-background pb-[env(safe-area-inset-bottom)] md:hidden">
      {LINKS.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          end={link.end}
          className={({ isActive }) =>
            cn(
              "relative flex flex-col items-center justify-center gap-0.5 text-[10px] text-muted-foreground",
              isActive && "text-primary",
            )
          }
        >
          <link.icon className="size-4" />
          {link.label}
          {link.label === "Inbox" && unread > 0 ? (
            <span className="absolute top-2 right-[calc(50%-18px)] size-1.5 rounded-full bg-primary" />
          ) : null}
        </NavLink>
      ))}
    </nav>
  );
}
