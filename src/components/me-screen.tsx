import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { backend } from "@/backend";
import { SECTORS, type Sector } from "@/backend/types";
import { SectorBadge } from "@/components/sector-badge";
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
import { aliasError, bioError } from "@/lib/profile";
import { cn } from "@/lib/utils";

export function MeScreen() {
  const { me, session, users, blockedUsers } = useFloor();
  const navigate = useNavigate();
  const [alias, setAlias] = useState(me?.alias ?? "");
  const [bio, setBio] = useState(me?.bioQuote ?? "");
  const [sector, setSector] = useState<Sector | null>(me?.sector ?? null);
  const [error, setError] = useState<string | null>(null);
  const [resetOpen, setResetOpen] = useState(false);

  if (!me || !session) return null;
  const profile = me;

  const dirty = alias.trim() !== profile.alias || bio.trim() !== profile.bioQuote || sector !== profile.sector;

  function save(event: FormEvent) {
    event.preventDefault();
    if (!sector) {
      setError("Pick a desk.");
      return;
    }
    const issue = aliasError(alias, users, profile.id) ?? bioError(bio);
    if (issue) {
      setError(issue);
      return;
    }
    const result = backend.updateProfile({ alias, bioQuote: bio, sector });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setError(null);
    toast.success("Desk updated.");
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-lg px-4 py-5">
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-primary">Your desk</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">{profile.alias}</h1>
        <p className="mt-2 font-serif text-xl leading-snug text-foreground/90">{profile.bioQuote}</p>
        <div className="mt-3">
          <SectorBadge sector={profile.sector} />
        </div>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
          Signed in with a verified {session.method}. The address stays on this device and is never placed on a chatter,
          in a room, or in a DM.
        </p>

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
              onChange={(event) => setAlias(event.target.value)}
              className="h-10"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-bio">Bio quote</Label>
            <Textarea id="edit-bio" value={bio} maxLength={80} onChange={(event) => setBio(event.target.value)} className="min-h-16" />
            <p className="text-right text-[11px] tabular-nums text-muted-foreground">{bio.trim().length}/80</p>
          </div>
          <div className="space-y-2">
            <Label>Financial sector</Label>
            <div className="grid grid-cols-2 gap-2">
              {SECTORS.map((item) => (
                <button
                  key={item}
                  type="button"
                  aria-pressed={sector === item}
                  onClick={() => setSector(item)}
                  className={cn(
                    "rounded-xl border px-3 py-2 text-left text-sm",
                    sector === item ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-muted",
                  )}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit" disabled={!dirty}>
            Save desk
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
                  <span>
                    <span className="block text-sm font-medium">{user.alias}</span>
                    <span className="block text-xs text-muted-foreground">{user.sector}</span>
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      backend.unblockUser(user.id);
                      toast(`${user.alias} is back on your floor.`);
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
            Reset demo floor
          </Button>
        </div>
      </div>
      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset the floor?</DialogTitle>
            <DialogDescription>
              Clears this device's session, chatters you posted, friends, and DMs, then restores the seeded floor.
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
                toast("The floor was reset.");
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
