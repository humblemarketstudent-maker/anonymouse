import { cn } from "@/lib/utils";

export function Hashtags({
  tags,
  className,
  onTag,
}: {
  tags: string[];
  className?: string;
  onTag?: (tag: string) => void;
}) {
  if (tags.length === 0) return null;
  return (
    <ul className={cn("flex flex-wrap gap-1.5", className)}>
      {tags.map((tag) => (
        <li key={tag}>
          {onTag ? (
            <button
              type="button"
              onClick={() => onTag(tag)}
              className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary hover:bg-primary/20"
            >
              #{tag}
            </button>
          ) : (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">#{tag}</span>
          )}
        </li>
      ))}
    </ul>
  );
}
