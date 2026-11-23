import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { backend } from "@/backend";
import { SECTORS, type Sector } from "@/backend/types";
import { Mark } from "@/components/mark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useFloor } from "@/hooks/use-floor";
import { aliasError, bioError } from "@/lib/profile";
import { cn } from "@/lib/utils";

export function SetupScreen() {
  const navigate = useNavigate();
  const { users } = useFloor();
  const [alias, setAlias] = useState("");
  const [bio, setBio] = useState("");
  const [sector, setSector] = useState<Sector | null>(null);
  const [attempted, setAttempted] = useState(false);

  const aliasIssue = alias.trim() ? aliasError(alias, users) : attempted ? "Pick an alias." : null;
  const bioIssue = bio.trim() ? bioError(bio) : attempted ? "Add a one-line quote." : null;
  const sectorIssue = sector || !attempted ? null : "Pick a desk.";
  const ready = !aliasError(alias, users) && !bioError(bio) && sector;

  function submit(event: FormEvent) {
    event.preventDefault();
    setAttempted(true);
    if (!ready || !sector) return;
    const result = backend.completeProfile({ alias, bioQuote: bio, sector });
    if (!result.ok) return;
    navigate("/", { replace: true });
  }

  return (
    <main className="relative min-h-dvh bg-background">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(ellipse_at_top,color-mix(in_oklch,var(--primary)_12%,transparent),transparent_70%)]" />
      <form onSubmit={submit} className="relative mx-auto flex w-full max-w-md flex-col px-5 py-6">
        <Mark className="size-10" />
        <h1 className="mt-4 text-3xl font-semibold tracking-tight">Three fields. Then you're in.</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          The alias is the whole identity. No real name, no photo, no firm.
        </p>

        <div className="mt-8 space-y-2">
          <Label htmlFor="alias">Alias</Label>
          <Input
            id="alias"
            value={alias}
            onChange={(event) => setAlias(event.target.value)}
            placeholder="MacroMouse"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            maxLength={18}
            className="h-11"
            aria-invalid={aliasIssue ? true : undefined}
          />
          <p className={cn("text-xs", aliasIssue ? "text-destructive" : "text-muted-foreground")}>
            {aliasIssue ?? (alias.trim() ? "Available on the floor." : "Letters and numbers. MacroMouse, YieldHunter.")}
          </p>
        </div>

        <div className="mt-5 space-y-2">
          <Label htmlFor="bio">Bio quote</Label>
          <Textarea
            id="bio"
            value={bio}
            onChange={(event) => setBio(event.target.value)}
            placeholder="Long volatility, short sleep"
            maxLength={80}
            rows={2}
            className="min-h-16"
            aria-invalid={bioIssue ? true : undefined}
          />
          <div className="flex justify-between text-xs">
            <span className={bioIssue ? "text-destructive" : "text-muted-foreground"}>
              {bioIssue ?? "One line. A mood, not a resume."}
            </span>
            <span className="tabular-nums text-muted-foreground">{bio.trim().length}/80</span>
          </div>
        </div>

        <div className="mt-5 space-y-2">
          <Label>Financial sector</Label>
          <div className="grid grid-cols-2 gap-2" role="listbox" aria-label="Financial sector">
            {SECTORS.map((item) => (
              <button
                key={item}
                type="button"
                role="option"
                aria-selected={sector === item}
                onClick={() => setSector(item)}
                className={cn(
                  "rounded-xl border px-3 py-2.5 text-left text-sm",
                  sector === item ? "border-primary bg-primary/10 text-primary" : "border-border text-foreground hover:bg-muted",
                )}
              >
                {item}
              </button>
            ))}
          </div>
          {sectorIssue ? <p className="text-xs text-destructive">{sectorIssue}</p> : null}
        </div>

        <Button type="submit" className="mt-8 h-11" disabled={!ready}>
          Enter the floor
        </Button>
      </form>
    </main>
  );
}
