import { useEffect, useId, useMemo, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "cn";
import {
  flagEmoji,
  formatPhoneDisplay,
  searchCallingRegions,
  toE164,
  type CallingRegion,
} from "@/lib/calling-codes";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const PLACEHOLDER: Record<string, string> = {
  AU: "412 345 678",
  CA: "416 555 0148",
  CN: "138 0013 8000",
  DE: "1512 3456789",
  FR: "6 12 34 56 78",
  GB: "7911 123456",
  HK: "9123 4567",
  IN: "98765 43210",
  JP: "90 1234 5678",
  KR: "10 1234 5678",
  MO: "6612 3456",
  SG: "8123 4567",
  TW: "912 345 678",
  US: "212 555 0148",
};

export function PhoneNumberField({
  region,
  national,
  onRegion,
  onNational,
  disabled,
  invalid,
}: {
  region: CallingRegion;
  national: string;
  onRegion: (region: CallingRegion) => void;
  onNational: (national: string) => void;
  disabled?: boolean;
  invalid?: boolean;
}) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const nationalRef = useRef<HTMLInputElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const results = useMemo(() => searchCallingRegions(query), [query]);
  const parsed = national.trim() ? toE164(region, national) : null;

  useEffect(() => {
    if (!open) return;
    const frame = window.requestAnimationFrame(() => searchRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (panelRef.current?.contains(target) || buttonRef.current?.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const list = listRef.current;
    const option = optionRefs.current[active];
    if (!list || !option) return;
    const top = option.offsetTop;
    const bottom = top + option.offsetHeight;
    if (top < list.scrollTop) list.scrollTop = top;
    else if (bottom > list.scrollTop + list.clientHeight) list.scrollTop = bottom - list.clientHeight;
  }, [active, open, results]);

  function close(focus: "button" | "national" | "none") {
    setOpen(false);
    setQuery("");
    if (focus === "button") buttonRef.current?.focus();
    if (focus === "national") nationalRef.current?.focus();
  }

  function select(next: CallingRegion) {
    onRegion(next);
    close("national");
  }

  return (
    <div ref={rootRef} className="space-y-2">
      <Label htmlFor="national-number">Phone number</Label>
      <div className="flex gap-2">
        <button
          ref={buttonRef}
          type="button"
          className={cn(
            "flex h-11 shrink-0 items-center gap-1.5 rounded-lg border border-input bg-transparent px-2.5 text-sm tabular-nums outline-none transition-colors",
            "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
            "disabled:pointer-events-none disabled:opacity-50 dark:bg-input/30",
            "min-w-[7.25rem] justify-between",
          )}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={listId}
          aria-label={`Country calling code, ${region.name}, plus ${region.dial}`}
          disabled={disabled}
          onClick={() => {
            if (open) close("button");
            else {
              const selected = searchCallingRegions("").findIndex((item) => item.iso === region.iso);
              setQuery("");
              setActive(selected >= 0 ? selected : 0);
              setOpen(true);
            }
          }}
        >
          <span className="flex items-center gap-1.5">
            <span aria-hidden className="text-base leading-none">
              {flagEmoji(region.iso)}
            </span>
            <span>+{region.dial}</span>
          </span>
          <ChevronDown className={cn("size-3.5 text-muted-foreground transition-transform", open && "rotate-180")} />
        </button>
        <Input
          ref={nationalRef}
          id="national-number"
          value={national}
          onChange={(event) => onNational(event.target.value)}
          autoComplete="tel-national"
          inputMode="tel"
          placeholder={PLACEHOLDER[region.iso] ?? "National number"}
          className="h-11 min-w-0 flex-1"
          aria-invalid={invalid ? true : undefined}
          aria-describedby={invalid ? "phone-error" : undefined}
          disabled={disabled}
          required
        />
      </div>
      {open ? (
        <div ref={panelRef} className="rounded-xl border border-border bg-popover p-2 shadow-lg">
          <Input
            ref={searchRef}
            value={query}
            onChange={(event) => {
              const next = event.target.value;
              setQuery(next);
              if (next.trim()) {
                setActive(0);
                return;
              }
              const selected = searchCallingRegions("").findIndex((item) => item.iso === region.iso);
              setActive(selected >= 0 ? selected : 0);
            }}
            placeholder="Search country or code"
            aria-label="Search countries"
            aria-controls={listId}
            aria-activedescendant={results[active] ? `${listId}-${results[active].iso}` : undefined}
            autoComplete="off"
            className="h-9"
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.preventDefault();
                close("button");
                return;
              }
              if (event.key === "ArrowDown") {
                event.preventDefault();
                setActive((index) => Math.min(index + 1, Math.max(results.length - 1, 0)));
                return;
              }
              if (event.key === "ArrowUp") {
                event.preventDefault();
                setActive((index) => Math.max(index - 1, 0));
                return;
              }
              if (event.key === "Enter") {
                event.preventDefault();
                const next = results[active];
                if (next) select(next);
              }
            }}
          />
          <ul
            ref={listRef}
            id={listId}
            role="listbox"
            aria-label="Country calling codes"
            className="relative mt-2 max-h-60 overflow-y-auto overscroll-contain"
          >
            {results.length === 0 ? (
              <li className="px-2 py-3 text-sm text-muted-foreground">No matching country.</li>
            ) : (
              results.map((item, index) => {
                const selected = item.iso === region.iso;
                return (
                  <li key={item.iso}>
                    <button
                      ref={(node) => {
                        optionRefs.current[index] = node;
                      }}
                      type="button"
                      id={`${listId}-${item.iso}`}
                      role="option"
                      aria-selected={selected}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm",
                        selected ? "bg-primary/10 text-primary" : index === active && "bg-muted",
                      )}
                      onMouseEnter={() => setActive(index)}
                      onClick={() => select(item)}
                    >
                      <span aria-hidden className="w-6 text-center text-base leading-none">
                        {flagEmoji(item.iso)}
                      </span>
                      <span className="min-w-0 flex-1 truncate">{item.name}</span>
                      <span className={cn("tabular-nums", selected ? "text-primary" : "text-muted-foreground")}>
                        +{item.dial}
                      </span>
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      ) : null}
      <p className="text-xs leading-relaxed text-muted-foreground">
        {parsed?.ok ? (
          <>
            Signs in as{" "}
            <span className="font-medium text-foreground tabular-nums">{formatPhoneDisplay(region, parsed.national)}</span>
          </>
        ) : (
          <>
            <span className="text-foreground">{region.name}</span>
            <span className="tabular-nums"> +{region.dial}</span>
            <span> · number only, without the country code</span>
          </>
        )}
      </p>
    </div>
  );
}
