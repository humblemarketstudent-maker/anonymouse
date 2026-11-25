import { toast } from "sonner";
import { backend } from "@/backend";
import { MouseAvatar as MouseAvatarArt } from "@/components/mouse-avatar";
import { Persona } from "@/components/persona";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  BACKGROUNDS,
  BUILDS,
  COUNTRIES,
  EAR_ACCESSORIES,
  EARS,
  EYES,
  EYEWEAR,
  FLAGS,
  FURS,
  HATS,
  MARKINGS,
  NECKWEAR,
  OUTFITS,
  PROPS,
  SKINS,
  SNOUTS,
  TAILS,
  TAIL_ACCESSORIES,
  WHISKERS,
  cleanGuildLabel,
  defaultAvatar,
  randomAvatar,
  type MouseAvatar,
} from "@/lib/avatar";

export function AvatarEditor({ avatar, alias }: { avatar?: MouseAvatar | null; alias: string }) {
  const saved = avatar ?? null;
  const draft = saved ?? defaultAvatar();

  function commit(next: MouseAvatar) {
    const result = backend.setAvatar(next);
    if (!result.ok) toast.error(result.error);
  }

  function patch(partial: Partial<MouseAvatar>) {
    commit({ ...draft, ...partial });
  }

  return (
    <section className="mt-8">
      <h2 className="text-sm font-semibold">Mouse</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Optional. Skip it and the letter mark stays. Tail, ears, and snout follow the skin tone.
      </p>
      <div className="mt-4 flex items-end gap-4">
        <div className="size-40 overflow-hidden rounded-3xl ring-1 ring-border sm:size-48">
          {saved ? (
            <MouseAvatarArt avatar={saved} className="size-full" label="Layered mouse preview" />
          ) : (
            <div className="flex size-full items-center justify-center bg-secondary">
              <Persona label={alias} className="size-16 text-xl" />
            </div>
          )}
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-medium tracking-[0.14em] text-muted-foreground uppercase">In chats</p>
          <Persona label={alias} avatar={saved} className="mt-2 size-14 text-lg" />
          <p className="mt-2 text-xs text-muted-foreground">{saved ? "Shown on your profile." : "No custom mouse yet."}</p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button type="button" variant="secondary" onClick={() => commit(randomAvatar())}>
          Randomize
        </Button>
        <Button type="button" variant="outline" onClick={() => commit(defaultAvatar())}>
          Defaults
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            const result = backend.setAvatar(null);
            if (!result.ok) toast.error(result.error);
          }}
        >
          Clear
        </Button>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Layer label="Background" value={draft.background} options={BACKGROUNDS} onChange={(background) => patch({ background })} />
        <Layer label="Tail" value={draft.tail} options={TAILS} onChange={(tail) => patch({ tail })} />
        <Layer
          label="Tail Accessory"
          value={draft.tailAccessory}
          options={TAIL_ACCESSORIES}
          onChange={(tailAccessory) => patch({ tailAccessory })}
        />
        <Layer label="Build" value={draft.build} options={BUILDS} onChange={(build) => patch({ build })} />
        <Layer label="Fur Color" value={draft.fur} options={FURS} onChange={(fur) => patch({ fur })} />
        <Layer label="Skin Tone" value={draft.skin} options={SKINS} onChange={(skin) => patch({ skin })} />
        <Layer label="Fur Markings" value={draft.markings} options={MARKINGS} onChange={(markings) => patch({ markings })} />
        <Layer label="Outfit / Torso" value={draft.outfit} options={OUTFITS} onChange={(outfit) => patch({ outfit })} />
        <Layer label="Neckwear" value={draft.neckwear} options={NECKWEAR} onChange={(neckwear) => patch({ neckwear })} />
        <Layer label="Ears" value={draft.ears} options={EARS} onChange={(ears) => patch({ ears })} />
        <Layer
          label="Ear Accessory"
          value={draft.earAccessory}
          options={EAR_ACCESSORIES}
          onChange={(earAccessory) => patch({ earAccessory })}
        />
        <Layer label="Eyes" value={draft.eyes} options={EYES} onChange={(eyes) => patch({ eyes })} />
        <Layer label="Eyewear" value={draft.eyewear} options={EYEWEAR} onChange={(eyewear) => patch({ eyewear })} />
        <Layer label="Snout and Mouth" value={draft.snout} options={SNOUTS} onChange={(snout) => patch({ snout })} />
        <Layer label="Whiskers" value={draft.whiskers} options={WHISKERS} onChange={(whiskers) => patch({ whiskers })} />
        <Layer label="Headwear / Hat" value={draft.headwear} options={HATS} onChange={(headwear) => patch({ headwear })} />
        <Layer label="Handheld Prop" value={draft.prop} options={PROPS} onChange={(prop) => patch({ prop })} />
        <Layer label="Flag" value={draft.flag} options={FLAGS} onChange={(flag) => patch({ flag })} />
      </div>
      {draft.flag === "Custom Guild Banner" ? (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="guild-color">Banner color</Label>
            <input
              id="guild-color"
              type="color"
              value={draft.guildColor}
              aria-label="Guild banner color"
              className="h-10 w-full rounded-lg border border-input bg-background px-1"
              onChange={(event) => patch({ guildColor: event.target.value })}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="guild-label">Banner label</Label>
            <Input
              id="guild-label"
              value={draft.guildLabel}
              maxLength={8}
              aria-label="Guild banner label"
              className="h-10"
              onChange={(event) => patch({ guildLabel: cleanGuildLabel(event.target.value).slice(0, 8) || draft.guildLabel })}
            />
          </div>
        </div>
      ) : null}
      {draft.flag === "Country Flag Selector" ? (
        <div className="mt-3 space-y-1">
          <Label htmlFor="country-flag">Country</Label>
          <select
            id="country-flag"
            aria-label="Country flag"
            value={draft.countryCode}
            className="h-10 w-full rounded-lg border border-input bg-background px-2 text-sm"
            onChange={(event) => patch({ countryCode: event.target.value as MouseAvatar["countryCode"] })}
          >
            {COUNTRIES.map((country) => (
              <option key={country.code} value={country.code}>
                {country.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}
      <p className="mt-3 text-[11px] text-muted-foreground">
        Build, fur, and skin are the body layer. Optional layers can stay on None.
      </p>
    </section>
  );
}

function Layer<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly T[];
  onChange: (value: T) => void;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <select
        aria-label={label}
        value={value}
        className="h-10 w-full rounded-lg border border-input bg-background px-2 text-sm"
        onChange={(event) => onChange(event.target.value as T)}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}
