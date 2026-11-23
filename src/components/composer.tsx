import { useState } from "react";
import { Link2, Megaphone, Send } from "lucide-react";
import { toast } from "sonner";
import { backend } from "@/backend";
import type { NewsLink } from "@/backend/types";
import { NEWS_ITEMS } from "@/data/floor";
import { useFloor } from "@/hooks/use-floor";
import { previewFromUrl } from "@/lib/news";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { NewsCard } from "@/components/news-card";
import { cn } from "@/lib/utils";

export function Composer({ roomId, placeholder }: { roomId: string | null; placeholder: string }) {
  const { friendIds, usersById } = useFloor();
  const [mode, setMode] = useState<"take" | "link">("take");
  const [body, setBody] = useState("");
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [blastOpen, setBlastOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);

  const linkPreview = mode === "link" ? previewFromUrl(url, body) : null;

  function draft(): { body: string; news?: NewsLink } | { error: string } {
    if (mode === "link") {
      const news = previewFromUrl(url, body);
      if (!news) return { error: "Paste a full http(s) link." };
      if (body.trim().length > 280) return { error: "Keep the take to 280 characters." };
      return { body: body.trim(), news };
    }
    const text = body.trim();
    if (/^https?:\/\/\S+$/.test(text)) {
      const news = previewFromUrl(text);
      if (!news) return { error: "That link doesn't look usable." };
      return { body: "", news };
    }
    if (!text) return { error: "Write a take or attach a link." };
    if (text.length > 280) return { error: "Keep it to 280 characters. This floor is fast." };
    return { body: text };
  }

  function publish(blastFriendIds?: string[]) {
    const next = draft();
    if ("error" in next) {
      setError(next.error);
      return;
    }
    const result = backend.postChatter({
      body: next.body,
      news: next.news,
      roomId,
      blastFriendIds,
    });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setBody("");
    setUrl("");
    setError(null);
    setBlastOpen(false);
    if (blastFriendIds && blastFriendIds.length > 0) {
      toast.success(`Blasted to ${blastFriendIds.length}`);
    } else {
      toast.success(roomId ? "Posted in the room" : "On the floor");
    }
  }

  const allSelected = friendIds.length > 0 && friendIds.every((id) => selected.includes(id));

  return (
    <div className="shrink-0 border-t bg-background/95 px-3 py-2.5 backdrop-blur">
      <div className="mb-2 flex items-center gap-1">
        <button
          type="button"
          className={cn(
            "rounded-full px-2.5 py-1 text-xs font-medium",
            mode === "take" ? "bg-primary/15 text-primary" : "text-muted-foreground",
          )}
          onClick={() => setMode("take")}
        >
          Take
        </button>
        <button
          type="button"
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium",
            mode === "link" ? "bg-primary/15 text-primary" : "text-muted-foreground",
          )}
          onClick={() => setMode("link")}
        >
          <Link2 className="size-3" />
          News link
        </button>
        {body.trim().length > 200 ? (
          <span className="ml-auto text-[11px] tabular-nums text-muted-foreground">{body.trim().length}/280</span>
        ) : null}
      </div>
      {mode === "link" ? (
        <div className="mb-2 space-y-2">
          <Input
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://www.reuters.com/..."
            aria-label="News link"
            inputMode="url"
            className="h-10"
          />
          <div className="flex gap-1.5 overflow-x-auto">
            {NEWS_ITEMS.slice(0, 4).map((item) => (
              <button
                key={item.url}
                type="button"
                onClick={() => setUrl(item.url)}
                className="shrink-0 rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground hover:text-foreground"
              >
                {item.source}
              </button>
            ))}
          </div>
          {linkPreview ? <NewsCard news={linkPreview} /> : null}
        </div>
      ) : null}
      <div className="flex items-end gap-2">
        <Textarea
          value={body}
          onChange={(event) => {
            setBody(event.target.value);
            if (error) setError(null);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
              event.preventDefault();
              publish();
            }
          }}
          placeholder={placeholder}
          aria-label={placeholder}
          rows={1}
          maxLength={280}
          className="max-h-28 min-h-10 flex-1 resize-none py-2.5"
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Blast to friends"
          onClick={() => {
            const next = draft();
            if ("error" in next) {
              setError(next.error);
              return;
            }
            setError(null);
            setSelected([]);
            setBlastOpen(true);
          }}
        >
          <Megaphone />
        </Button>
        <Button type="button" size="icon" aria-label="Post" onClick={() => publish()}>
          <Send />
        </Button>
      </div>
      <div className="mt-1.5 flex items-center justify-between gap-3">
        {error ? <p className="text-xs text-destructive">{error}</p> : <p className="text-[11px] text-muted-foreground">Enter posts · Shift+Enter for a new line</p>}
      </div>
      <Dialog open={blastOpen} onOpenChange={setBlastOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Blast this</DialogTitle>
            <DialogDescription>
              It still posts here, and lands as a message on the lines you check.
            </DialogDescription>
          </DialogHeader>
          {friendIds.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nobody is on your list yet. Add aliases from Friends, then blast them a take.
            </p>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{selected.length} selected</span>
                <Button type="button" variant="ghost" size="sm" onClick={() => setSelected(allSelected ? [] : [...friendIds])}>
                  {allSelected ? "Clear" : "Select all"}
                </Button>
              </div>
              <div className="max-h-64 space-y-1 overflow-y-auto pr-1">
                {friendIds.map((id) => {
                  const user = usersById.get(id);
                  if (!user) return null;
                  const on = selected.includes(id);
                  return (
                    <div key={id} className="flex w-full items-center gap-3 rounded-lg px-2 py-2 hover:bg-muted">
                      <Checkbox
                        id={`blast-${id}`}
                        checked={on}
                        onCheckedChange={(checked) => {
                          setSelected((current) =>
                            checked === true
                              ? current.includes(id)
                                ? current
                                : [...current, id]
                              : current.filter((item) => item !== id),
                          );
                        }}
                        aria-label={user.alias}
                      />
                      <label htmlFor={`blast-${id}`} className="min-w-0 flex-1 cursor-pointer">
                        <span className="block truncate text-sm font-medium">{user.alias}</span>
                        <span className="block truncate text-xs text-muted-foreground">{user.bioQuote}</span>
                      </label>
                    </div>
                  );
                })}
              </div>
            </>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setBlastOpen(false)}>
              Cancel
            </Button>
            <Button type="button" disabled={selected.length === 0} onClick={() => publish(selected)}>
              Blast{selected.length ? ` to ${selected.length}` : ""}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
