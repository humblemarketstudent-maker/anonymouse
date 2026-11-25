import type { MouseAvatar } from "@/lib/avatar";
import { Monogram } from "@/components/monogram";
import { MouseAvatar as MouseAvatarArt } from "@/components/mouse-avatar";
import { cn } from "@/lib/utils";

/** Letter mark, or the profile's layered mouse when one is set. */
export function Persona({
  label,
  avatar,
  className,
}: {
  label: string;
  avatar?: MouseAvatar | null;
  className?: string;
}) {
  if (!avatar) return <Monogram label={label} className={className} />;
  return (
    <span
      className={cn(
        "inline-flex size-9 shrink-0 overflow-hidden rounded-full bg-secondary ring-1 ring-primary/30 ring-inset",
        className,
      )}
    >
      <MouseAvatarArt avatar={avatar} className="size-full" />
    </span>
  );
}
