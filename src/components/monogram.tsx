import { cn } from "@/lib/utils";

/** Letter mark used in place of a profile photo. */
export function Monogram({ label, className }: { label: string; className?: string }) {
  const letter = [...label].find((char) => /[A-Za-z0-9]/.test(char))?.toUpperCase() ?? "•";
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-semibold text-primary ring-1 ring-primary/30 ring-inset",
        className,
      )}
    >
      {letter}
    </span>
  );
}
