import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import type { MouseAvatar } from "@/lib/avatar";
import { Persona } from "@/components/persona";
import { Button } from "@/components/ui/button";

export function ChatHeader({
  backTo,
  backLabel,
  title,
  subtitle,
  onTitle,
  titleLabel,
  aside,
  avatar,
}: {
  backTo: string;
  backLabel: string;
  title: string;
  subtitle?: string;
  onTitle?: () => void;
  titleLabel?: string;
  aside?: ReactNode;
  avatar?: MouseAvatar | null;
}) {
  const identity = (
    <>
      <Persona label={title} avatar={avatar} />
      <span className="min-w-0">
        <span className="block truncate text-[15px] leading-tight font-semibold">{title}</span>
        {subtitle ? (
          <span className="mt-0.5 block truncate text-xs leading-none text-muted-foreground">{subtitle}</span>
        ) : null}
      </span>
    </>
  );

  return (
    <header className="sticky top-0 z-20 flex h-12 shrink-0 items-center gap-0.5 border-b bg-background px-1">
      <Button variant="ghost" className="size-9 shrink-0" asChild>
        <Link to={backTo} aria-label={backLabel}>
          <ArrowLeft />
        </Link>
      </Button>
      {onTitle ? (
        <button
          type="button"
          onClick={onTitle}
          aria-label={titleLabel ?? title}
          className="flex min-w-0 flex-1 items-center gap-2.5 rounded-xl px-1 py-1 text-left hover:bg-muted/70"
        >
          {identity}
        </button>
      ) : (
        <div className="flex min-w-0 flex-1 items-center gap-2.5 px-1 py-1">{identity}</div>
      )}
      {aside}
    </header>
  );
}
