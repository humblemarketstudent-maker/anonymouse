import { toast } from "sonner";
import type { NewsLink } from "@/backend/types";
import { hostnameOf } from "@/lib/news";
import { cn } from "@/lib/utils";

export function NewsCard({ news, className }: { news: NewsLink; className?: string }) {
  return (
    <a
      href={news.url}
      className={cn(
        "block rounded-xl border border-border bg-card/80 p-3 text-left transition-colors hover:border-primary/40",
        className,
      )}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        toast("Preview only", {
          description: `${news.source} stays on the floor in this prototype.`,
        });
      }}
    >
      <div className="text-[10px] font-medium uppercase tracking-[0.16em] text-primary">{news.source}</div>
      <div className="mt-1 text-[15px] font-medium leading-snug">{news.title}</div>
      <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{news.summary}</p>
      <div className="mt-2 truncate text-[11px] text-muted-foreground/80">{hostnameOf(news.url)}</div>
    </a>
  );
}
