import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { backend } from "@/backend";
import { HashtagField } from "@/components/hashtag-field";
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
  const { users, topHashtags } = useFloor();
  const [alias, setAlias] = useState("");
  const [bio, setBio] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [attempted, setAttempted] = useState(false);

  const aliasIssue = alias.trim() ? aliasError(alias, users) : attempted ? "Pick an alias." : null;
  const bioIssue = bio.trim() ? bioError(bio) : attempted ? "Add a quote about yourself." : null;
  const ready = !aliasError(alias, users) && !bioError(bio);

  function submit(event: FormEvent) {
    event.preventDefault();
    setAttempted(true);
    if (!ready) return;
    const result = backend.completeProfile({ alias, bioQuote: bio, hashtags: tags });
    if (!result.ok) return;
    navigate("/", { replace: true });
  }

  return (
    <main className="relative min-h-dvh bg-background">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(ellipse_at_top,color-mix(in_oklch,var(--primary)_12%,transparent),transparent_70%)]" />
      <form onSubmit={submit} className="relative mx-auto flex w-full max-w-md flex-col px-5 py-6">
        <Mark className="size-10" />
        <h1 className="mt-4 text-3xl font-semibold tracking-tight">An alias and a quote.</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          That's the public profile. Hashtags are optional and freeform — interest, city, craft, whatever you'd answer to.
        </p>

        <div className="mt-8 space-y-2">
          <Label htmlFor="alias">Alias</Label>
          <Input
            id="alias"
            value={alias}
            onChange={(event) => setAlias(event.target.value)}
            placeholder="QuietMouse"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            maxLength={18}
            className="h-11"
            aria-invalid={aliasIssue ? true : undefined}
          />
          <p className={cn("text-xs", aliasIssue ? "text-destructive" : "text-muted-foreground")}>
            {aliasIssue ?? (alias.trim() ? "Available." : "Letters and numbers. 3–18 characters.")}
          </p>
        </div>

        <div className="mt-5 space-y-2">
          <Label htmlFor="bio">Quote</Label>
          <Textarea
            id="bio"
            value={bio}
            onChange={(event) => setBio(event.target.value)}
            placeholder="Here for the quieter version."
            maxLength={80}
            rows={2}
            className="min-h-16"
            aria-invalid={bioIssue ? true : undefined}
          />
          <div className="flex justify-between text-xs">
            <span className={bioIssue ? "text-destructive" : "text-muted-foreground"}>
              {bioIssue ?? "One line about you. Not a resume."}
            </span>
            <span className="tabular-nums text-muted-foreground">{bio.trim().length}/80</span>
          </div>
        </div>

        <div className="mt-5">
          <HashtagField
            label="Hashtags"
            hint="Pick from what's already in use, or add your own."
            suggestions={topHashtags.map((item) => item.tag)}
            value={tags}
            onChange={setTags}
            max={8}
          />
        </div>

        <Button type="submit" className="mt-8 h-11" disabled={!ready}>
          Enter
        </Button>
      </form>
    </main>
  );
}
