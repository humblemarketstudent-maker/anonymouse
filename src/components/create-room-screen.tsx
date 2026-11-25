import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { backend } from "@/backend";
import { HashtagField } from "@/components/hashtag-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useFloor } from "@/hooks/use-floor";
import { normalizeHashtag } from "@/lib/hashtags";

export function CreateRoomScreen() {
  const navigate = useNavigate();
  const { topHashtags } = useFloor();
  const [params] = useSearchParams();
  const seeded = normalizeHashtag(params.get("tag") ?? "");
  const [name, setName] = useState("");
  const [blurb, setBlurb] = useState("");
  const [tags, setTags] = useState<string[]>(seeded ? [seeded] : []);
  const [error, setError] = useState<string | null>(null);

  function submit(event: FormEvent) {
    event.preventDefault();
    const result = backend.createRoom({ name, blurb, hashtags: tags });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    navigate(`/mine?room=${encodeURIComponent(result.roomId)}`, { replace: true });
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <header className="flex items-center gap-2 border-b px-2 py-2.5">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/" aria-label="Back to chats">
            <ArrowLeft />
          </Link>
        </Button>
        <h1 className="text-base font-semibold">New room</h1>
      </header>
      <form onSubmit={submit} className="mx-auto w-full max-w-lg space-y-5 px-4 py-5">
        <p className="text-sm leading-relaxed text-muted-foreground">
          Name it so people can search for it. Hashtags are how the room gets found. Pick from the most used, or add your own.
        </p>
        <div className="space-y-2">
          <Label htmlFor="room-name">Room name</Label>
          <Input
            id="room-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Night Desk"
            maxLength={32}
            className="h-11"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="room-blurb">Short description</Label>
          <Textarea
            id="room-blurb"
            value={blurb}
            onChange={(event) => setBlurb(event.target.value)}
            placeholder="What this room is actually for."
            maxLength={140}
            rows={2}
            className="min-h-16"
          />
          <p className="text-right text-[11px] tabular-nums text-muted-foreground">{blurb.trim().length}/140</p>
        </div>
        <HashtagField
          label="Hashtags"
          hint="Interest, city, craft, role. At least one."
          suggestions={topHashtags.map((item) => item.tag)}
          value={tags}
          onChange={setTags}
          max={5}
        />
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <Button type="submit" className="h-11 w-full">
          Create and join
        </Button>
      </form>
    </div>
  );
}
