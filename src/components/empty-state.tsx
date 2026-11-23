import { Mark } from "@/components/mark";

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex flex-col items-center px-6 py-16 text-center">
      <Mark className="size-12 text-muted-foreground" />
      <h2 className="mt-4 text-base font-medium">{title}</h2>
      <p className="mt-1 max-w-xs text-sm leading-relaxed text-muted-foreground">{body}</p>
    </div>
  );
}
