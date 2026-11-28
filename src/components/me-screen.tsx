import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { backend } from "@/backend";
import { AvatarEditor } from "@/components/avatar-editor";
import { HashtagField } from "@/components/hashtag-field";
import { Persona } from "@/components/persona";
import { Hashtags } from "@/components/hashtags";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useFloor } from "@/hooks/use-floor";
import { profileDraftStatus } from "@/lib/profile";

export function MeScreen() {
  const { me, session, users, blockedUsers, topHashtags } = useFloor();
  const navigate = useNavigate();
  const [alias, setAlias] = useState(me?.alias ?? "");
  const [bio, setBio] = useState(me?.bioQuote ?? "");
  const [tags, setTags] = useState<string[]>(me?.hashtags ?? []);
  const [error, setError] = useState<string | null>(null);
  const [resetOpen, setResetOpen] = useState(false);

  if (!me || !session) return null;
  const profile = me;
  const draft = profileDraftStatus({
    alias,
    bio,
    tags,
    saved: profile,
    users,
    selfId: profile.id,
  });

  function save(event: FormEvent) {
    event.preventDefault();
    if (!draft.canSave) return;
    const result = backend.updateProfile({ alias, bioQuote: bio, hashtags: tags });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setAlias(alias.trim());
    setBio(bio.trim());
    setError(null);
    toast.success("Profile updated.");
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-lg px-4 py-5">
        <div className="flex items-center gap-3">
          <Persona label={profile.alias} avatar={profile.avatar} className="size-16 text-xl" />
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-primary">You</p>
            <h1 className="mt-1 truncate text-3xl font-semibold tracking-tight">{profile.alias}</h1>
          </div>
        </div>
        <p className="mt-2 font-serif text-xl leading-snug text-foreground/90">{profile.bioQuote}</p>
        <Hashtags tags={profile.hashtags} className="mt-3" />
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
          Signed in with an email on this device. The address stays here and is never placed on your profile, in a room, or in a message.
        </p>
        <AvatarEditor avatar={profile.avatar} alias={profile.alias} />

        <form onSubmit={save} className="mt-8 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-alias">Alias</Label>
            <Input
              id="edit-alias"
              value={alias}
              maxLength={18}
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              onChange={(event) => {
                setAlias(event.target.value);
                if (error) setError(null);
              }}
              className="h-10"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-bio">Quote</Label>
            <Textarea
              id="edit-bio"
              value={bio}
              maxLength={80}
              onChange={(event) => {
                setBio(event.target.value);
                if (error) setError(null);
              }}
              className="min-h-16"
            />
            <p className="text-right text-[11px] tabular-nums text-muted-foreground">{bio.trim().length}/80</p>
          </div>
          <HashtagField
            label="Hashtags"
            hint="Interest, country, background, role, area. Freeform."
            suggestions={topHashtags.map((item) => item.tag)}
            value={tags}
            onChange={(next) => {
              setTags(next);
              if (error) setError(null);
            }}
            max={8}
          />
          {draft.error ? (
            <p role="alert" className="text-sm text-destructive">
              {draft.error}
            </p>
          ) : null}
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit" disabled={!draft.canSave}>
            Save profile
          </Button>
        </form>

        <section className="mt-10">
          <h2 className="text-sm font-semibold">Blocked</h2>
          {blockedUsers.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">You haven't blocked anyone.</p>
          ) : (
            <ul className="mt-2 divide-y divide-border rounded-xl border">
              {blockedUsers.map((user) => (
                <li key={user.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{user.alias}</span>
                    <span className="block truncate text-xs text-muted-foreground">{user.bioQuote}</span>
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      backend.unblockUser(user.id);
                      toast(`${user.alias} is visible again.`);
                    }}
                  >
                    Unblock
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="mt-10 flex flex-col gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              backend.signOut();
              navigate("/enter");
            }}
          >
            Sign out
          </Button>
          <Button type="button" variant="ghost" onClick={() => setResetOpen(true)}>
            Reset this device
          </Button>
          <Button type="button" variant="ghost" asChild>
            <Link to="/admin">Moderation log</Link>
          </Button>
        </div>
      </div>
      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset this device?</DialogTitle>
            <DialogDescription>
              Clears the session, profile, rooms, friends, taps, and conversations stored on this device.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setResetOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                backend.resetFloor();
                navigate("/enter");
                toast("Reset.");
              }}
            >
              Reset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
