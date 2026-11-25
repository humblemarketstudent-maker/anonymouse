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

export function Composer({
  roomId,
  placeholder,
  onSent,
}: {
  roomId: string;
  placeholder: string;
  onSent?: () => void;
}) {
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
    setMode("take");
    setBlastOpen(false);
    onSent?.();
    if (blastFriendIds && blastFriendIds.length > 0) toast.success(`Blasted to ${blastFriendIds.length}`);
  }

  const allSelected = friendIds.length > 0 && friendIds.every((id) => selected.includes(id));

  return (
    <div className="sticky bottom-0 z-20 shrink-0 border-t bg-background/95 px-2 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur">
      {mode === "link" ? (
        <div className="mb-2 space-y-2 px-1">
          <Input
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://www.reuters.com/..."
            aria-label="News link"
            inputMode="url"
            className="h-11"
          />
          <div className="flex gap-1.5 overflow-x-auto">
            {NEWS_ITEMS.slice(0, 4).map((item) => (
              <button
                key={item.url}
                type="button"
                onClick={() => setUrl(item.url)}
                className="shrink-0 rounded-full border border-border px-2.5 py-1 text-[11px] text-muted-foreground hover:text-foreground"
              >
                {item.source}
              </button>
            ))}
          </div>
          {linkPreview ? <NewsCard news={linkPreview} /> : null}
        </div>
      ) : null}
      <div className="flex items-end gap-1.5">
        <Button
          type="button"
          variant={mode === "link" ? "secondary" : "ghost"}
          className="size-11 shrink-0 rounded-full"
          aria-label={mode === "link" ? "Close news link" : "News link"}
          aria-pressed={mode === "link"}
          onClick={() => setMode((current) => (current === "link" ? "take" : "link"))}
        >
          <Link2 />
        </Button>
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
          className="max-h-28 min-h-11 flex-1 resize-none overflow-y-auto rounded-2xl border-transparent bg-secondary px-3 py-2.5 text-base leading-5"
        />
        <Button
          type="button"
          variant="ghost"
          className="size-11 shrink-0 rounded-full"
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
        <Button type="button" className="size-11 shrink-0 rounded-full" aria-label="Send" onClick={() => publish()}>
          <Send />
        </Button>
      </div>
      {error || body.trim().length > 200 ? (
        <div className="mt-1 flex items-center justify-between gap-3 px-1">
          {error ? <p className="text-xs text-destructive">{error}</p> : <span />}
          {body.trim().length > 200 ? (
            <span className="ml-auto text-[11px] text-muted-foreground tabular-nums">{body.trim().length}/280</span>
          ) : null}
        </div>
      ) : null}
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
