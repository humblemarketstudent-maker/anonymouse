import { cn } from "@/lib/utils";

export function Mark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={cn("text-foreground", className)} aria-hidden="true">
      <circle cx="18" cy="16" r="8" fill="none" stroke="currentColor" strokeWidth="2.4" />
      <circle cx="46" cy="16" r="8" fill="none" stroke="currentColor" strokeWidth="2.4" />
      <ellipse cx="32" cy="36" rx="17" ry="15" fill="none" stroke="currentColor" strokeWidth="2.4" />
      <rect x="17.5" y="31" width="11" height="8" rx="2" fill="none" stroke="var(--primary)" strokeWidth="1.8" />
      <rect x="35.5" y="31" width="11" height="8" rx="2" fill="none" stroke="var(--primary)" strokeWidth="1.8" />
      <path d="M28.5 35h7" stroke="var(--primary)" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M32 41.5V45" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M29 48h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path
        d="M43 54.5 46.4 49.8 49 52.2 54 45.5"
        fill="none"
        stroke="var(--primary)"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
