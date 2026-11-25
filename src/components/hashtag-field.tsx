import { useState } from "react";
import { Hashtags } from "@/components/hashtags";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { normalizeHashtag } from "@/lib/hashtags";
import { cn } from "@/lib/utils";

export function HashtagField({
  label,
  hint,
  suggestions,
  value,
  onChange,
  max,
}: {
  label: string;
  hint: string;
  suggestions: string[];
  value: string[];
  onChange: (next: string[]) => void;
  max: number;
}) {
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  function add(raw: string) {
    const tag = normalizeHashtag(raw);
    if (!tag) {
      setError("Use 2–24 letters, numbers, or hyphens.");
      return;
    }
    if (value.includes(tag)) {
      setDraft("");
      setError(null);
      return;
    }
    if (value.length >= max) {
      setError(`Keep it to ${max} hashtags.`);
      return;
    }
    onChange([...value, tag]);
    setDraft("");
    setError(null);
  }

  function toggle(tag: string) {
    if (value.includes(tag)) {
      onChange(value.filter((item) => item !== tag));
      setError(null);
      return;
    }
    if (value.length >= max) {
      setError(`Keep it to ${max} hashtags.`);
      return;
    }
    onChange([...value, tag]);
    setError(null);
  }

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-3">
        <Label>{label}</Label>
        <span className="text-[11px] tabular-nums text-muted-foreground">
          {value.length}/{max}
        </span>
      </div>
      <p className="text-xs leading-relaxed text-muted-foreground">{hint}</p>
      {value.length > 0 ? (
        <Hashtags tags={value} onTag={(tag) => onChange(value.filter((item) => item !== tag))} />
      ) : (
        <p className="text-xs text-muted-foreground">Nothing selected yet.</p>
      )}
      {suggestions.length > 0 ? (
        <div className="space-y-1.5">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Most used</p>
          <div className="flex flex-wrap gap-1.5">
            {suggestions.map((tag) => {
              const on = value.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggle(tag)}
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-xs",
                    on ? "border-primary bg-primary/15 text-primary" : "border-border text-foreground hover:bg-muted",
                  )}
                >
                  #{tag}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value);
            if (error) setError(null);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              add(draft);
            }
          }}
          placeholder="Add your own"
          aria-label="Add a hashtag"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          className="h-10"
        />
        <Button type="button" variant="outline" className="h-10" onClick={() => add(draft)}>
          Add
        </Button>
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
