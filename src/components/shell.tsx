import { Bell, Bookmark, CircleUserRound, Hash, Inbox, Sparkles, Users } from "lucide-react";
import { NavLink, Outlet, useLocation, useNavigate, useSearchParams } from "react-router-dom";
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
import { threadPath } from "@/lib/open-line";
import { cn } from "@/lib/utils";

const LINKS = [
  { to: "/", label: "Chats", icon: Hash, end: true },
  { to: "/match", label: "Match", icon: Sparkles, end: true },
  { to: "/mine", label: "My Rooms", icon: Bookmark, end: true },
  { to: "/msg", label: "MSG", icon: Inbox, end: false },
  { to: "/friends", label: "Friends", icon: Users, end: true },
  { to: "/you", label: "You", icon: CircleUserRound, end: true },
] as const;

export function Shell() {
  const chat = useChatFocus();
  return (
    <ModerationProvider>
      <div className="flex h-dvh overflow-hidden bg-background text-foreground">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          {chat ? null : <TopBar />}
          <div className="flex min-h-0 flex-1 flex-col">
            <Outlet />
            {chat ? null : <MobileNav />}
          </div>
        </div>
      </div>
    </ModerationProvider>
  );
}

function useChatFocus() {
  const { pathname } = useLocation();
  const [params] = useSearchParams();
  const onDesk = pathname === "/" || pathname === "/mine" || pathname === "/msg";
  return onDesk && Boolean(params.get("room") || params.get("thread"));
}

function Sidebar() {
  return (
    <aside className="hidden w-[220px] shrink-0 flex-col border-r md:flex">
      <NavLink to="/" className="flex items-center gap-2.5 px-4 py-4">
        <Mark className="size-9" />
        <span>
          <span className="block text-base font-semibold tracking-tight">Anonymouse</span>
          <span className="block text-[11px] text-muted-foreground">No names. No faces.</span>
        </span>
      </NavLink>
      <nav className="flex flex-1 flex-col gap-1 px-2">
        {LINKS.map((link) => (
          <NavItem key={link.to} {...link} />
        ))}
      </nav>
      <p className="px-4 py-4 text-[11px] leading-relaxed text-muted-foreground">
        Demo. Country code, then 000000.
      </p>
    </aside>
  );
}

function NavItem({ to, label, icon: Icon, end }: (typeof LINKS)[number]) {
  const active = useTabActive(to);
  const badge = useBadge(label);
  return (
    <NavLink
      to={to}
      end={end}
      className={cn(
        "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground",
        active && "bg-primary/10 text-primary",
      )}
    >
      <Icon className="size-4" />
      <span>{label}</span>
      {badge > 0 ? (
        <span className="ml-auto rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">
          {badge}
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
      <p className="hidden text-sm text-muted-foreground md:block">Anonymous. No names, no faces.</p>
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
    <DropdownMenu
      onOpenChange={(open) => {
        if (open) backend.markNotificationsRead();
      }}
    >
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={unread ? `${unread} notifications` : "Notifications"}
          className="relative"
        >
          <Bell />
          {unread > 0 ? <span className="absolute top-1 right-1 size-2 rounded-full bg-primary" /> : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        {notifications.length === 0 ? (
          <p className="px-3 py-6 text-center text-sm text-muted-foreground">Nothing new.</p>
        ) : (
          notifications.slice(0, 8).map((note) => (
            <DropdownMenuItem
              key={note.id}
              className="items-start"
              onSelect={() => {
                if (note.threadId) navigate(threadPath(note.threadId));
                else if (note.peerId) navigate("/match");
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
  return (
    <nav className="grid h-[4.25rem] shrink-0 grid-cols-6 border-t bg-background pb-[env(safe-area-inset-bottom)] md:hidden">
      {LINKS.map((link) => (
        <MobileItem key={link.to} {...link} />
      ))}
    </nav>
  );
}

function MobileItem({ to, label, icon: Icon, end }: (typeof LINKS)[number]) {
  const active = useTabActive(to);
  const badge = useBadge(label);
  return (
    <NavLink
      to={to}
      end={end}
      className={cn(
        "relative flex flex-col items-center justify-center gap-0.5 px-0.5 text-[10px] leading-tight text-muted-foreground",
        active && "text-primary",
      )}
    >
      <Icon className="size-4" />
      <span className="max-w-full truncate">{label}</span>
      {badge > 0 ? <span className="absolute top-1.5 right-[calc(50%-16px)] size-1.5 rounded-full bg-primary" /> : null}
    </NavLink>
  );
}

function useBadge(label: string) {
  const { threads, incomingTaps } = useFloor();
  if (label === "MSG") return threads.reduce((sum, thread) => sum + thread.unread, 0);
  if (label === "Match") return incomingTaps.length;
  return 0;
}

function useTabActive(to: string) {
  const { pathname } = useLocation();
  if (to === "/") return pathname === "/" || pathname === "/chats/new";
  if (to === "/mine") return pathname === "/mine";
  if (to === "/msg") return pathname === "/msg" || pathname.startsWith("/msg/");
  return pathname === to;
}
