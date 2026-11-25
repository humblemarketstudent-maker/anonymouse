import type { ReactNode } from "react";
import { EmptyState } from "@/components/empty-state";
import { cn } from "@/lib/utils";

/**
 * List on the left, conversation on the right. On a phone the open conversation fills the screen.
 * `expandUntilOpen` keeps the list full width until a conversation is selected.
 */
export function SplitView({
  open,
  list,
  panel,
  expandUntilOpen = false,
}: {
  open: boolean;
  list: ReactNode;
  panel: ReactNode;
  expandUntilOpen?: boolean;
}) {
  const docked = open || !expandUntilOpen;
  return (
    <div className="flex min-h-0 flex-1">
      <section
        className={cn(
          "flex min-h-0 w-full flex-col",
          docked && "md:w-[24rem] md:max-w-[46%] md:shrink-0 md:border-r",
          open ? "hidden md:flex" : "flex",
        )}
      >
        {list}
      </section>
      <section className={cn("min-h-0 min-w-0 flex-1 flex-col", open ? "flex" : expandUntilOpen ? "hidden" : "hidden md:flex")}>
        {panel}
      </section>
    </div>
  );
}

export function PickPane({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex min-h-0 flex-1 items-center justify-center">
      <EmptyState title={title} body={body} />
    </div>
  );
}
