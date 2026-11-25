import { useEffect, useId, useMemo, useState } from "react";
import cutoutUrl from "@/assets/mouse-cutout.png";
import type { Build, CountryCode, MouseAvatar as MouseAvatarConfig } from "@/lib/avatar";
import { FUR_PAINT, SKIN_PAINT, linkedPaint } from "@/lib/avatar";
import { cutoutMatchesRegions, paintKey, paintPixels, type PaintSpec } from "@/lib/mouse-paint";
import { mouseRegions } from "@/lib/mouse-regions";
import { cn } from "@/lib/utils";

/** Cutout placed so the illustrated face lines up with the layer anchors. */
const CUTOUT = { x: 17, y: -1, width: 133, height: 145 };
const HEAD = { x: 88, y: 72, r: 30 };

function torso() {
  return { cx: 88, cy: 116, rx: 32, ry: 22 };
}

function poseTransform(build: Build) {
  if (build === "Chonky") return "translate(88 104) scale(1.12 1.06) translate(-88 -104)";
  if (build === "Sleek") return "translate(88 104) scale(0.88 1.05) translate(-88 -104)";
  return undefined;
}

function tailTip(kind: MouseAvatarConfig["tail"]) {
  if (kind === "Fluffy Bushy") return { x: 50, y: 148 };
  if (kind === "Braided") return { x: 38, y: 146 };
  if (kind === "Curled Heart") return { x: 48, y: 140 };
  if (kind === "Lightning Bolt") return { x: 48, y: 150 };
  if (kind === "Cybernetic Metal") return { x: 40, y: 138 };
  return { x: 34, y: 140 };
}

const paintCache = new Map<string, string>();
const paintPending = new Map<string, Promise<string>>();
let cutoutPromise: Promise<HTMLImageElement> | null = null;

function loadCutout() {
  if (!cutoutPromise) {
    cutoutPromise = new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("Could not load the mouse artwork."));
      image.src = cutoutUrl;
    });
  }
  return cutoutPromise;
}

function renderIllustrated(spec: PaintSpec) {
  const key = paintKey(spec);
  const cached = paintCache.get(key);
  if (cached) return Promise.resolve(cached);
  const pending = paintPending.get(key);
  if (pending) return pending;
  const job = loadCutout().then((image) => {
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) return "";
    context.drawImage(image, 0, 0);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
    const regions = mouseRegions();
    if (cutoutMatchesRegions(canvas.width, canvas.height, regions)) {
      paintPixels(pixels.data, regions, canvas.width, canvas.height, spec);
      context.putImageData(pixels, 0, 0);
    }
    const url = canvas.toDataURL("image/png");
    paintCache.set(key, url);
    paintPending.delete(key);
    return url;
  });
  paintPending.set(key, job);
  return job;
}

function illustratedSpec(
  avatar: Pick<MouseAvatarConfig, "fur" | "skin" | "eyes" | "whiskers" | "ears" | "snout" | "markings">,
): PaintSpec {
  return {
    fur: avatar.fur,
    skin: avatar.skin,
    hideEyes: avatar.eyes !== "Sleepy Half-Lidded",
    hideWhiskers: avatar.whiskers !== "Neat Straight",
    hideEars: avatar.ears !== "Standard Top",
    hideMouth: avatar.snout !== "Twitchy Pink Nose",
    siamese: avatar.markings === "Siamese Points",
  };
}

function useIllustratedMouse(avatar: MouseAvatarConfig) {
  const { fur, skin, eyes, whiskers, ears, snout, markings } = avatar;
  const spec = useMemo(
    () => illustratedSpec({ fur, skin, eyes, whiskers, ears, snout, markings }),
    [fur, skin, eyes, whiskers, ears, snout, markings],
  );
  const key = paintKey(spec);
  const [url, setUrl] = useState<string | null>(() => paintCache.get(key) ?? null);
  useEffect(() => {
    let cancel = false;
    void renderIllustrated(spec).then((next) => {
      if (!cancel && next) setUrl(next);
    });
    return () => {
      cancel = true;
    };
  }, [spec]);
  return url;
}

function luminance(hex: string): number {
  const value = hex.replace("#", "");
  const num = Number.parseInt(value, 16);
  const r = ((num >> 16) & 255) / 255;
  const g = ((num >> 8) & 255) / 255;
  const b = (num & 255) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function MouseAvatar({
  avatar,
  className,
  label,
}: {
  avatar: MouseAvatarConfig;
  className?: string;
  label?: string;
}) {
  const rawId = useId().replace(/:/g, "");
  const fur = FUR_PAINT[avatar.fur];
  const skin = SKIN_PAINT[avatar.skin];
  const linked = linkedPaint(avatar);
  const body = torso();
  const spot = avatar.fur === "Charcoal Black" ? fur.lite : fur.deep;
  const whisker = luminance(fur.main) < 0.35 ? "#e6ebf2" : "#2c3138";
  const illustrated = useIllustratedMouse(avatar);
  const pose = poseTransform(avatar.build);

  return (
    <svg
      viewBox="0 0 160 160"
      className={cn("shrink-0", className)}
      role={label ? "img" : "presentation"}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <defs>
        <linearGradient id={`${rawId}-sunset`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffb07c" />
          <stop offset="0.48" stopColor="#ff7a9c" />
          <stop offset="1" stopColor="#6d5cff" />
        </linearGradient>
        <pattern id={`${rawId}-cheese`} width="28" height="28" patternUnits="userSpaceOnUse">
          <rect width="28" height="28" fill="#f6d35b" />
          <circle cx="8" cy="8" r="4" fill="#e2b63a" />
          <circle cx="20" cy="18" r="5" fill="#e8be45" />
          <circle cx="12" cy="22" r="2.2" fill="#efc85a" />
        </pattern>
        <clipPath id={`${rawId}-flag`}>
          <rect width="32" height="20" rx="1.5" />
        </clipPath>
        <mask id={`${rawId}-notch`}>
          <rect width="160" height="160" fill="white" />
          <polygon points="118,38 128,48 112,52" fill="black" />
        </mask>
      </defs>
      <Background avatar={avatar} id={rawId} />
      <g transform={pose}>
        <Tail avatar={avatar} color={linked.tail} deep={skin.deep} />
        <TailCharm avatar={avatar} />
        {avatar.outfit === "Oversized Hoodie" ? (
          <path d="M52 84 C50 36 126 30 128 82" fill="none" stroke="#243044" strokeWidth="18" strokeLinecap="round" />
        ) : null}
        {avatar.build === "Scruffy" ? <Scruff body={body} color={fur.deep} /> : null}
        <Ears
          avatar={avatar}
          fur={avatar.markings === "Siamese Points" ? spot : fur.main}
          inner={linked.ears}
          deep={avatar.markings === "Siamese Points" ? spot : fur.deep}
          maskId={`${rawId}-notch`}
        />
        {illustrated ? <image href={illustrated} x={CUTOUT.x} y={CUTOUT.y} width={CUTOUT.width} height={CUTOUT.height} /> : null}
        {avatar.markings === "Hooded Stripe" ? (
          <path d={`M${HEAD.x - 6} 46 C${HEAD.x - 2} 68 ${HEAD.x + 2} 92 ${HEAD.x} 112`} fill="none" stroke={spot} strokeWidth="9" strokeLinecap="round" opacity="0.9" />
        ) : null}
        {avatar.markings === "Forehead Blaze" ? (
          <path d={`M${HEAD.x - 2} 46 C${HEAD.x + 6} 58 ${HEAD.x - 4} 70 ${HEAD.x + 1} 80`} fill="none" stroke={fur.lite} strokeWidth="6" strokeLinecap="round" />
        ) : null}
        {avatar.markings === "Dalmatian Spots" ? (
          <g fill={spot}>
            <circle cx={HEAD.x - 16} cy={HEAD.y - 6} r="3.2" />
            <circle cx={HEAD.x + 14} cy={HEAD.y + 2} r="2.4" />
            <circle cx={HEAD.x + 2} cy={HEAD.y - 16} r="2" />
          </g>
        ) : null}
        {avatar.markings === "Berkshire Belly" ? (
          <ellipse cx={body.cx} cy={body.cy + 4} rx={body.rx * 0.72} ry={body.ry * 0.62} fill={fur.lite} />
        ) : null}
        {avatar.markings === "Dalmatian Spots" ? <Spots body={body} color={spot} /> : null}
        <Outfit avatar={avatar} body={body} />
        <Neck avatar={avatar} />
        <Eyes avatar={avatar} />
        <Snout avatar={avatar} nose={linked.nose} />
        <Whiskers avatar={avatar} color={whisker} />
        <Glasses avatar={avatar} />
        <Hat avatar={avatar} />
        <EarCharm avatar={avatar} />
        <Prop avatar={avatar} />
      </g>
      <Flag avatar={avatar} clipId={`${rawId}-flag`} />
    </svg>
  );
}

function Background({ avatar, id }: { avatar: MouseAvatarConfig; id: string }) {
  const kind = avatar.background;
  if (kind === "Sunset Gradient") return <rect width="160" height="160" fill={`url(#${id}-sunset)`} />;
  if (kind === "Swiss Cheese Pattern") return <rect width="160" height="160" fill={`url(#${id}-cheese)`} />;
  if (kind === "Parisian Kitchen") {
    return (
      <g>
        <rect width="160" height="160" fill="#f6efe6" />
        <rect x="18" y="18" width="40" height="34" rx="2" fill="#d7eef8" stroke="#c4b8a8" strokeWidth="2" />
        <path d="M38 18 V52 M18 35 H58" stroke="#c4b8a8" strokeWidth="2" />
        <rect x="96" y="108" width="46" height="28" rx="3" fill="#e7d3c4" />
        <circle cx="112" cy="122" r="6" fill="#c47a5a" />
        <rect x="124" y="114" width="8" height="14" rx="2" fill="#6f8f71" />
      </g>
    );
  }
  if (kind === "Cozy Library") {
    const spines = ["#8c3d32", "#d4a017", "#2f5d50", "#314e7a", "#eadfce", "#7a3e62"];
    return (
      <g>
        <rect width="160" height="160" fill="#3a2a24" />
        {spines.map((color, index) => (
          <rect key={color} x={8 + index * 12} y="108" width="10" height="40" fill={color} />
        ))}
        <rect x="92" y="16" width="52" height="36" rx="2" fill="#5c4033" />
        <rect x="98" y="22" width="40" height="4" fill="#e6d3b0" />
        <rect x="98" y="30" width="28" height="3" fill="#c4b59a" />
      </g>
    );
  }
  if (kind === "Cyberpunk Alley") {
    return (
      <g>
        <rect width="160" height="160" fill="#10131c" />
        <rect x="0" y="28" width="160" height="3" fill="#34d399" opacity="0.85" />
        <rect x="0" y="78" width="160" height="2" fill="#e879f9" opacity="0.8" />
        <rect x="0" y="120" width="160" height="3" fill="#22d3ee" opacity="0.55" />
        <rect x="18" y="40" width="22" height="70" fill="#1c2433" />
        <rect x="112" y="24" width="28" height="86" fill="#1c2433" />
        <rect x="118" y="36" width="6" height="8" fill="#34d399" />
        <rect x="128" y="52" width="6" height="8" fill="#e879f9" />
      </g>
    );
  }
  const fill = kind === "Pastel Mint" ? "#d7f3e6" : kind === "Pastel Lavender" ? "#e6def8" : "#f4e7d4";
  return <rect width="160" height="160" fill={fill} />;
}

function Tail({ avatar, color, deep }: { avatar: MouseAvatarConfig; color: string; deep: string }) {
  const kind = avatar.tail;
  if (kind === "Fluffy Bushy") {
    return (
      <path
        d="M76 118 C56 110 38 122 34 138 C32 150 46 158 56 148 C52 136 64 128 74 132 C84 124 84 118 76 118 Z"
        fill={color}
        stroke={deep}
        strokeWidth="2"
        strokeLinejoin="round"
      />
    );
  }
  if (kind === "Braided") {
    return (
      <g fill="none" strokeLinecap="round">
        <path d="M70 116 C48 112 36 124 32 140" stroke={color} strokeWidth="5" />
        <path d="M74 122 C50 126 40 132 38 146" stroke={deep} strokeWidth="5" />
        <path d="M66 120 C46 118 34 128 36 136" stroke="#fff" strokeWidth="2.2" opacity="0.55" />
      </g>
    );
  }
  if (kind === "Curled Heart") {
    return (
      <g>
        <path d="M72 120 C52 116 44 128 48 136" fill="none" stroke={color} strokeWidth="8" strokeLinecap="round" />
        <path
          d="M40 128 C40 122 48 122 48 128 C48 122 56 122 56 128 C56 136 48 142 48 142 C48 142 40 136 40 128 Z"
          fill={color}
          stroke={deep}
          strokeWidth="1.5"
        />
      </g>
    );
  }
  if (kind === "Lightning Bolt") {
    return (
      <polyline
        points="74,116 58,112 64,124 46,122 54,138 38,134 48,150"
        fill="none"
        stroke={color}
        strokeWidth="8"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    );
  }
  if (kind === "Cybernetic Metal") {
    const segs = [
      [68, 116],
      [56, 118],
      [46, 126],
      [40, 136],
    ];
    return (
      <g>
        {segs.map(([x, y], index) => (
          <rect key={index} x={x - 8} y={y - 5} width="16" height="10" rx="3" fill="#d5dbe3" stroke={deep} strokeWidth="1.6" transform={`rotate(${index * 18 - 20} ${x} ${y})`} />
        ))}
        {segs.map(([x, y], index) => (
          <circle key={`j${index}`} cx={x} cy={y} r="2.3" fill={color} />
        ))}
      </g>
    );
  }
  return <path d="M74 118 C52 114 36 122 34 138" fill="none" stroke={color} strokeWidth="10" strokeLinecap="round" />;
}

function TailCharm({ avatar }: { avatar: MouseAvatarConfig }) {
  const kind = avatar.tailAccessory;
  const { x, y } = tailTip(avatar.tail);
  if (kind === "None") return null;
  if (kind === "Silk Ribbon Bow") {
    return (
      <g>
        <path d={`M${x} ${y} l-10 -7 l4 8 z`} fill="#d4567a" />
        <path d={`M${x} ${y} l10 -6 l-4 8 z`} fill="#b83b62" />
        <circle cx={x} cy={y} r="2.4" fill="#f2c14e" />
      </g>
    );
  }
  if (kind === "Tiny Brass Bell") {
    return (
      <g>
        <path d={`M${x - 6} ${y - 2} h12 l-2 8 h-8 z`} fill="#e0b44a" stroke="#a67c22" strokeWidth="1" />
        <circle cx={x} cy={y + 8} r="2" fill="#a67c22" />
      </g>
    );
  }
  if (kind === "Bandage Wrap") {
    return (
      <g stroke="#f7f4ee" strokeWidth="3.5" strokeLinecap="round">
        <path d={`M${x - 8} ${y - 4} L${x + 8} ${y + 2}`} />
        <path d={`M${x - 8} ${y + 4} L${x + 8} ${y - 2}`} />
      </g>
    );
  }
  if (kind === "Spiked Cuff") {
    return (
      <g>
        <rect x={x - 8} y={y - 4} width="16" height="8" rx="2" fill="#2c3138" />
        <polygon points={`${x - 5},${y - 4} ${x - 2},${y - 10} ${x + 1},${y - 4}`} fill="#d7dde6" />
        <polygon points={`${x + 2},${y - 4} ${x + 5},${y - 10} ${x + 8},${y - 4}`} fill="#d7dde6" />
      </g>
    );
  }
  return (
    <g>
      <line x1={x} y1={y} x2={x} y2={y - 14} stroke="#8d6b45" strokeWidth="1.6" />
      <polygon points={`${x},${y - 14} ${x + 10},${y - 10} ${x},${y - 6}`} fill="#34d399" />
    </g>
  );
}

function Scruff({ body, color }: { body: { cx: number; cy: number; rx: number; ry: number }; color: string }) {
  const bumps = [-50, -20, 10, 40, 70, 110, 150, 190];
  return (
    <g fill={color}>
      {bumps.map((deg) => {
        const rad = (deg * Math.PI) / 180;
        const x = body.cx + Math.cos(rad) * body.rx;
        const y = body.cy + Math.sin(rad) * body.ry;
        return <circle key={deg} cx={x} cy={y} r="5" />;
      })}
    </g>
  );
}

function Spots({ body, color }: { body: { cx: number; cy: number; rx: number; ry: number }; color: string }) {
  const dots = [
    [-0.4, -0.2, 3.4],
    [0.2, 0.1, 2.6],
    [-0.1, 0.35, 2.2],
    [0.45, -0.3, 2.4],
  ] as const;
  return (
    <g fill={color}>
      {dots.map(([px, py, r]) => (
        <circle key={`${px}-${py}`} cx={body.cx + px * body.rx} cy={body.cy + py * body.ry} r={r} />
      ))}
    </g>
  );
}

function Outfit({
  avatar,
  body,
}: {
  avatar: MouseAvatarConfig;
  body: { cx: number; cy: number; rx: number; ry: number };
}) {
  const kind = avatar.outfit;
  if (kind === "None" || kind === "Oversized Hoodie") {
    if (kind === "Oversized Hoodie") {
      return (
        <g>
          <ellipse cx={body.cx} cy={body.cy + 2} rx={body.rx + 2} ry={body.ry} fill="#243044" />
          <path d={`M${body.cx - 8} ${body.cy - 6} l6 16 h-4 l2 8`} stroke="#9aa8be" strokeWidth="2" fill="none" />
          <circle cx={body.cx + body.rx * 0.35} cy={body.cy + 4} r="2" fill="#34d399" />
        </g>
      );
    }
    return null;
  }
  if (kind === "Knitted Sweater") {
    return (
      <g>
        <ellipse cx={body.cx} cy={body.cy + 2} rx={body.rx} ry={body.ry * 0.92} fill="#1f6b5a" />
        {[0, 1, 2, 3].map((row) => (
          <path
            key={row}
            d={`M${body.cx - body.rx + 4} ${body.cy - 8 + row * 7} H${body.cx + body.rx - 4}`}
            stroke="#7dcebb"
            strokeWidth="1.6"
            opacity="0.7"
          />
        ))}
      </g>
    );
  }
  if (kind === "Detective Trench Coat") {
    return (
      <g>
        <ellipse cx={body.cx} cy={body.cy + 2} rx={body.rx} ry={body.ry} fill="#6d543c" />
        <path d={`M${body.cx} ${body.cy - body.ry} L${body.cx - 16} ${body.cy - 4} L${body.cx} ${body.cy + 4} Z`} fill="#8a6b4d" />
        <path d={`M${body.cx} ${body.cy - body.ry} L${body.cx + 16} ${body.cy - 4} L${body.cx} ${body.cy + 4} Z`} fill="#5c4632" />
        <circle cx={body.cx} cy={body.cy + 8} r="2" fill="#d6c4a8" />
      </g>
    );
  }
  if (kind === "Chef Jacket") {
    return (
      <g>
        <ellipse cx={body.cx} cy={body.cy + 2} rx={body.rx} ry={body.ry * 0.92} fill="#f7f5f2" />
        <path d={`M${body.cx} ${body.cy - 10} V${body.cy + 16}`} stroke="#d9d4cc" strokeWidth="2" />
        <circle cx={body.cx - 5} cy={body.cy - 2} r="1.6" fill="#c5bfb6" />
        <circle cx={body.cx - 5} cy={body.cy + 6} r="1.6" fill="#c5bfb6" />
      </g>
    );
  }
  if (kind === "Wizard Robe") {
    return (
      <g>
        <ellipse cx={body.cx} cy={body.cy + 2} rx={body.rx} ry={body.ry} fill="#3a2a6a" />
        <polygon points={`${body.cx - 6},${body.cy - 6} ${body.cx},${body.cy - 12} ${body.cx + 6},${body.cy - 6} ${body.cx + 2},${body.cy} ${body.cx - 2},${body.cy}`} fill="#f2c14e" />
        <circle cx={body.cx + 12} cy={body.cy + 8} r="1.5" fill="#f2c14e" />
        <circle cx={body.cx - 14} cy={body.cy + 4} r="1.3" fill="#d7c4ff" />
      </g>
    );
  }
  return (
    <g>
      <ellipse cx={body.cx} cy={body.cy + 2} rx={body.rx} ry={body.ry * 0.95} fill="#9aa3ad" />
      <rect x={body.cx - 8} y={body.cy - 12} width="16" height="22" rx="2" fill="#c5ced6" stroke="#6d7680" strokeWidth="1.4" />
      <circle cx={body.cx} cy={body.cy - 2} r="2" fill="#34d399" />
    </g>
  );
}

function Ears({
  avatar,
  fur,
  inner,
  deep,
  maskId,
}: {
  avatar: MouseAvatarConfig;
  fur: string;
  inner: string;
  deep: string;
  maskId: string;
}) {
  const kind = avatar.ears;
  if (kind === "Standard Top") return null;
  if (kind === "Round Dumbo") {
    return (
      <g>
        <EarBlob cx={40} cy={76} rx={22} ry={20} rot={-16} fur={fur} inner={inner} deep={deep} />
        <EarBlob cx={136} cy={74} rx={22} ry={20} rot={16} fur={fur} inner={inner} deep={deep} />
      </g>
    );
  }
  if (kind === "Folded Floppy") {
    return (
      <g>
        <path d="M72 52 C58 58 52 78 64 96 C74 84 78 66 74 54 Z" fill={fur} stroke={deep} strokeWidth="2.5" />
        <path d="M70 60 C62 68 60 80 66 88 C72 78 74 66 72 60 Z" fill={inner} />
        <path d="M106 50 C122 56 128 76 116 96 C106 84 102 64 108 52 Z" fill={fur} stroke={deep} strokeWidth="2.5" />
        <path d="M108 58 C116 68 116 80 110 88 C104 78 104 66 108 58 Z" fill={inner} />
      </g>
    );
  }
  if (kind === "Notched Scarred") {
    return (
      <g>
        <EarBlob cx={68} cy={50} rx={13} ry={18} rot={-18} fur={fur} inner={inner} deep={deep} />
        <g mask={`url(#${maskId})`}>
          <EarBlob cx={112} cy={48} rx={13} ry={18} rot={16} fur={fur} inner={inner} deep={deep} />
        </g>
      </g>
    );
  }
  return (
    <g>
      <EarBlob cx={68} cy={50} rx={13} ry={18} rot={-18} fur={fur} inner={inner} deep={deep} />
      <EarBlob cx={112} cy={48} rx={13} ry={18} rot={16} fur={fur} inner={inner} deep={deep} />
    </g>
  );
}

function EarBlob({
  cx,
  cy,
  rx,
  ry,
  rot,
  fur,
  inner,
  deep,
}: {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  rot: number;
  fur: string;
  inner: string;
  deep: string;
}) {
  return (
    <g transform={`rotate(${rot} ${cx} ${cy})`}>
      <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={fur} stroke={deep} strokeWidth="2.5" />
      <ellipse cx={cx} cy={cy + 1} rx={rx * 0.55} ry={ry * 0.55} fill={inner} />
    </g>
  );
}

function Neck({ avatar }: { avatar: MouseAvatarConfig }) {
  const kind = avatar.neckwear;
  const x = HEAD.x;
  const y = 102;
  if (kind === "None") return null;
  if (kind === "Red Bandana") {
    return (
      <g>
        <path d={`M${x - 16} ${y - 2} Q${x} ${y + 8} ${x + 16} ${y - 2} L${x + 8} ${y + 10} L${x} ${y + 4} L${x - 8} ${y + 12} Z`} fill="#c5363a" />
      </g>
    );
  }
  if (kind === "Bow Tie") {
    return (
      <g>
        <polygon points={`${x},${y} ${x - 14},${y - 6} ${x - 14},${y + 6}`} fill="#1f6b5a" />
        <polygon points={`${x},${y} ${x + 14},${y - 6} ${x + 14},${y + 6}`} fill="#1f6b5a" />
        <circle cx={x} cy={y} r="3" fill="#f2c14e" />
      </g>
    );
  }
  if (kind === "Silk Scarf") {
    return (
      <g>
        <path d={`M${x - 18} ${y - 4} Q${x} ${y + 6} ${x + 16} ${y - 6}`} fill="none" stroke="#7c6bb5" strokeWidth="6" strokeLinecap="round" />
        <path d={`M${x + 12} ${y - 4} L${x + 22} ${y + 14}`} stroke="#7c6bb5" strokeWidth="5" strokeLinecap="round" />
      </g>
    );
  }
  if (kind === "Studded Collar") {
    return (
      <g>
        <path d={`M${x - 16} ${y} Q${x} ${y + 10} ${x + 16} ${y}`} fill="none" stroke="#2c3138" strokeWidth="6" strokeLinecap="round" />
        {[-10, -3, 4, 11].map((dx) => (
          <circle key={dx} cx={x + dx} cy={y + 2} r="1.5" fill="#e6e8ee" />
        ))}
      </g>
    );
  }
  if (kind === "Pearl Necklace") {
    return (
      <g fill="#f4f1ea">
        {[-12, -6, 0, 6, 12].map((dx, index) => (
          <circle key={dx} cx={x + dx} cy={y + (index % 2 === 0 ? 2 : 5)} r="2.6" stroke="#ddd6c8" strokeWidth="0.6" />
        ))}
      </g>
    );
  }
  return (
    <g fill="none" stroke="#e0b44a" strokeWidth="2.4" strokeLinecap="round">
      <path d={`M${x - 14} ${y} L${x - 8} ${y + 5} L${x - 2} ${y} L${x + 4} ${y + 5} L${x + 10} ${y} L${x + 16} ${y + 4}`} />
    </g>
  );
}

function Eyes({ avatar }: { avatar: MouseAvatarConfig }) {
  const kind = avatar.eyes;
  const left = { x: 78, y: 68 };
  const right = { x: 100, y: 68 };
  if (kind === "Sleepy Half-Lidded") return null;
  if (kind === "Ruby Red") return <EyePair left={left} right={right} iris="#9b2335" pupil="#2a0a10" />;
  if (kind === "Anime Sparkle") {
    return (
      <g>
        <EyePair left={left} right={right} iris="#3a6ea5" pupil="#142033" r={8} />
        {[left, right].map((eye) => (
          <polygon
            key={eye.x}
            points={`${eye.x - 1},${eye.y - 3} ${eye.x + 0.4},${eye.y - 1} ${eye.x + 2},${eye.y - 1} ${eye.x + 0.6},${eye.y + 0.2} ${eye.x + 1.4},${eye.y + 2} ${eye.x - 0.6},${eye.y + 0.8} ${eye.x - 2},${eye.y + 2} ${eye.x - 1},${eye.y + 0.2} ${eye.x - 2.4},${eye.y - 1} ${eye.x - 0.8},${eye.y - 1}`}
            fill="#fff"
          />
        ))}
      </g>
    );
  }
  if (kind === "Spiral Dizzy") {
    return (
      <g>
        {[left, right].map((eye) => (
          <g key={eye.x}>
            <circle cx={eye.x} cy={eye.y} r="7" fill="#f7f4ee" stroke="#1c2128" strokeWidth="1.4" />
            <path
              d={`M${eye.x} ${eye.y} m-4 0 a4 4 0 1 1 6 -2`}
              fill="none"
              stroke="#1c2128"
              strokeWidth="1.5"
            />
          </g>
        ))}
      </g>
    );
  }
  if (kind === "Heterochromia") {
    return (
      <g>
        <Eye left={left} iris="#e0a23a" pupil="#2a2112" />
        <Eye left={right} iris="#3a7bd5" pupil="#102033" />
      </g>
    );
  }
  if (kind === "Glowing Neon") {
    return (
      <g>
        {[left, right].map((eye) => (
          <g key={eye.x}>
            <circle cx={eye.x} cy={eye.y} r="10" fill="#34d399" opacity="0.28" />
            <circle cx={eye.x} cy={eye.y} r="5.5" fill="#5dffc2" />
            <circle cx={eye.x - 1.4} cy={eye.y - 1.6} r="1.6" fill="#f7fffb" />
          </g>
        ))}
      </g>
    );
  }
  return (
    <g>
      {[left, right].map((eye) => (
        <g key={eye.x}>
          <circle cx={eye.x} cy={eye.y} r="6.5" fill="#16191e" />
          <circle cx={eye.x - 2} cy={eye.y - 2.2} r="2" fill="#fff" />
          <circle cx={eye.x + 1.6} cy={eye.y + 1.4} r="0.9" fill="#fff" opacity="0.8" />
        </g>
      ))}
    </g>
  );
}

function EyePair({
  left,
  right,
  iris,
  pupil,
  r = 6.5,
}: {
  left: { x: number; y: number };
  right: { x: number; y: number };
  iris: string;
  pupil: string;
  r?: number;
}) {
  return (
    <g>
      <Eye left={left} iris={iris} pupil={pupil} r={r} />
      <Eye left={right} iris={iris} pupil={pupil} r={r} />
    </g>
  );
}

function Eye({
  left,
  iris,
  pupil,
  r = 6.5,
}: {
  left: { x: number; y: number };
  iris: string;
  pupil: string;
  r?: number;
}) {
  return (
    <g>
      <circle cx={left.x} cy={left.y} r={r} fill="#f7f4ee" stroke="#1c2128" strokeWidth="1.2" />
      <circle cx={left.x} cy={left.y} r={r * 0.62} fill={iris} />
      <circle cx={left.x} cy={left.y} r={r * 0.32} fill={pupil} />
      <circle cx={left.x - r * 0.28} cy={left.y - r * 0.28} r={r * 0.16} fill="#fff" />
    </g>
  );
}

function Snout({ avatar, nose }: { avatar: MouseAvatarConfig; nose: string }) {
  const kind = avatar.snout;
  if (kind === "Twitchy Pink Nose") return null;
  const x = HEAD.x;
  const y = 84;
  return (
    <g>
      {kind === "Buck Teeth" ? (
        <g>
          <rect x={x - 5} y={y} width="4.5" height="8" rx="1" fill="#f7f4ee" stroke={nose} strokeWidth="0.8" />
          <rect x={x + 0.6} y={y} width="4.5" height="8" rx="1" fill="#f7f4ee" stroke={nose} strokeWidth="0.8" />
        </g>
      ) : null}
      {kind === "Cheeky Smirk" ? (
        <path d={`M${x - 6} ${y} Q${x + 4} ${y + 8} ${x + 10} ${y - 1}`} fill="none" stroke={nose} strokeWidth="1.8" strokeLinecap="round" />
      ) : null}
      {kind === "Tiny Fangs" ? (
        <g fill="#f7f4ee" stroke={nose} strokeWidth="0.6">
          <polygon points={`${x - 5},${y} ${x - 2},${y} ${x - 3.5},${y + 7}`} />
          <polygon points={`${x + 2},${y} ${x + 5},${y} ${x + 3.5},${y + 7}`} />
        </g>
      ) : null}
      {kind === "Nose Bandage" ? (
        <g>
          <rect x={x - 10} y={y - 12} width="20" height="8" rx="2" fill="#f4efe6" stroke="#e0d5c4" strokeWidth="0.8" />
          <path d={`M${x - 4} ${y - 12} v8 M${x + 4} ${y - 12} v8`} stroke="#e0d5c4" strokeWidth="0.8" />
        </g>
      ) : null}
    </g>
  );
}

function Whiskers({ avatar, color }: { avatar: MouseAvatarConfig; color: string }) {
  const kind = avatar.whiskers;
  const y = 78;
  const left = HEAD.x - 16;
  const right = HEAD.x + 16;
  if (kind === "Long Droopy") {
    return (
      <g fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round">
        <path d={`M${left} ${y - 2} Q${left - 16} ${y + 6} ${left - 22} ${y + 14}`} />
        <path d={`M${left} ${y + 2} Q${left - 18} ${y + 12} ${left - 20} ${y + 20}`} />
        <path d={`M${right} ${y - 2} Q${right + 16} ${y + 6} ${right + 22} ${y + 14}`} />
        <path d={`M${right} ${y + 2} Q${right + 18} ${y + 12} ${right + 20} ${y + 20}`} />
      </g>
    );
  }
  if (kind === "Curly Rex") {
    return (
      <g fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round">
        <path d={`M${left} ${y} q-6 -4 -8 2 t-8 -2`} />
        <path d={`M${left} ${y + 4} q-6 4 -10 0 t-8 4`} />
        <path d={`M${right} ${y} q6 -4 8 2 t8 -2`} />
        <path d={`M${right} ${y + 4} q6 4 10 0 t8 4`} />
      </g>
    );
  }
  if (kind === "Scruffy Jagged") {
    return (
      <g fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <polyline points={`${left},${y - 2} ${left - 8},${y - 6} ${left - 14},${y - 1} ${left - 22},${y - 5}`} />
        <polyline points={`${left},${y + 3} ${left - 10},${y + 8} ${left - 18},${y + 2}`} />
        <polyline points={`${right},${y - 1} ${right + 7},${y - 7} ${right + 15},${y} ${right + 22},${y - 4}`} />
        <polyline points={`${right},${y + 4} ${right + 9},${y + 9} ${right + 18},${y + 3}`} />
      </g>
    );
  }
  if (kind === "Handlebar") {
    return (
      <g fill="none" stroke={color} strokeWidth="1.7" strokeLinecap="round">
        <path d={`M${left} ${y} Q${left - 14} ${y + 2} ${left - 18} ${y - 8}`} />
        <path d={`M${right} ${y} Q${right + 14} ${y + 2} ${right + 18} ${y - 8}`} />
        <path d={`M${left + 2} ${y + 4} H${left - 12}`} />
        <path d={`M${right - 2} ${y + 4} H${right + 12}`} />
      </g>
    );
  }
  if (kind === "Cheese Crumb Stuck") {
    return (
      <g>
        <g fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round">
          <path d={`M${left} ${y - 2} H${left - 18}`} />
          <path d={`M${left} ${y + 3} H${left - 16}`} />
          <path d={`M${right} ${y - 2} H${right + 20}`} />
          <path d={`M${right} ${y + 3} H${right + 16}`} />
        </g>
        <polygon points={`${right + 16},${y - 5} ${right + 22},${y - 2} ${right + 18},${y + 3} ${right + 13},${y}`} fill="#f6d35b" stroke="#e2b63a" strokeWidth="0.6" />
      </g>
    );
  }
  return null;
}

function Glasses({ avatar }: { avatar: MouseAvatarConfig }) {
  const kind = avatar.eyewear;
  if (kind === "None") return null;
  if (kind === "Wire-Rim Glasses") {
    return (
      <g fill="none" stroke="#5c6570" strokeWidth="2">
        <circle cx="78" cy="68" r="8" />
        <circle cx="100" cy="68" r="8" />
        <path d="M86 68 H92" />
      </g>
    );
  }
  if (kind === "Pixel Sunglasses") {
    return (
      <g>
        <rect x="68" y="62" width="16" height="12" fill="#16191e" />
        <rect x="90" y="62" width="16" height="12" fill="#16191e" />
        <rect x="84" y="66" width="6" height="3" fill="#16191e" />
        <rect x="70" y="64" width="4" height="3" fill="#7dd3fc" opacity="0.7" />
      </g>
    );
  }
  if (kind === "Gold Monocle") {
    return (
      <g fill="none" stroke="#e0b44a" strokeWidth="1.8">
        <circle cx="100" cy="68" r="8" />
        <path d="M108 72 C114 80 112 90 106 96" />
      </g>
    );
  }
  if (kind === "Steampunk Goggles") {
    return (
      <g>
        <circle cx="78" cy="68" r="9" fill="#c5ced6" stroke="#6d5a3a" strokeWidth="2.4" />
        <circle cx="100" cy="68" r="9" fill="#c5ced6" stroke="#6d5a3a" strokeWidth="2.4" />
        <circle cx="78" cy="68" r="4" fill="#8fd0c4" />
        <circle cx="100" cy="68" r="4" fill="#8fd0c4" />
        <path d="M60 66 H69 M109 66 H118" stroke="#6d5a3a" strokeWidth="2" />
      </g>
    );
  }
  return (
    <g>
      <path d="M66 62 H90 L84 76 H70 Z" fill="#1c2128" />
      <path d="M90 66 H116" stroke="#1c2128" strokeWidth="2" />
    </g>
  );
}

function Hat({ avatar }: { avatar: MouseAvatarConfig }) {
  const kind = avatar.headwear;
  if (kind === "None") return null;
  if (kind === "Beanie") {
    return (
      <g>
        <path d="M62 58 C62 34 114 32 116 56" fill="#2f6f8f" />
        <rect x="60" y="52" width="58" height="8" rx="2" fill="#245872" />
        <circle cx="90" cy="32" r="5" fill="#2f6f8f" />
      </g>
    );
  }
  if (kind === "Chef's Toque") {
    return (
      <g fill="#f7f5f2" stroke="#e4e0da" strokeWidth="1">
        <rect x="74" y="46" width="30" height="14" />
        <circle cx="74" cy="40" r="8" />
        <circle cx="90" cy="32" r="10" />
        <circle cx="106" cy="40" r="8" />
      </g>
    );
  }
  if (kind === "Wizard Hat") {
    return (
      <g>
        <ellipse cx="90" cy="56" rx="24" ry="6" fill="#3a2a6a" />
        <polygon points="90,12 108,56 72,56" fill="#3a2a6a" />
        <polygon points="86,28 88,32 92,32 89,34.5 90,38 86,35.5 82,38 83,34.5 80,32 84,32" fill="#f2c14e" />
      </g>
    );
  }
  if (kind === "Royal Crown") {
    return (
      <g>
        <polygon points="64,56 70,36 80,50 90,30 100,50 110,36 116,56" fill="#e0b44a" stroke="#a67c22" strokeWidth="1.4" />
        <circle cx="70" cy="40" r="2" fill="#d4567a" />
        <circle cx="90" cy="34" r="2.2" fill="#34d399" />
        <circle cx="110" cy="40" r="2" fill="#7c6bb5" />
      </g>
    );
  }
  if (kind === "Pirate Tricorn") {
    return (
      <g fill="#1c2128">
        <ellipse cx="88" cy="54" rx="34" ry="8" />
        <path d="M58 52 L70 40 L88 50 L108 38 L122 54 L100 58 L88 50 L74 58 Z" />
      </g>
    );
  }
  if (kind === "Propeller Cap") {
    return (
      <g>
        <path d="M66 56 C66 40 112 38 114 56" fill="#c5363a" />
        <rect x="64" y="52" width="46" height="7" fill="#9b2330" />
        <path d="M108 56 H128 L120 62 H108 Z" fill="#9b2330" />
        <line x1="78" y1="40" x2="102" y2="40" stroke="#d7dde6" strokeWidth="3" strokeLinecap="round" />
        <circle cx="90" cy="40" r="2" fill="#e0b44a" />
      </g>
    );
  }
  return (
    <g>
      <polygon points="70,56 108,56 96,22" fill="#f6d35b" stroke="#e2b63a" strokeWidth="1.4" />
      <circle cx="90" cy="40" r="4" fill="#e2b63a" />
      <circle cx="84" cy="50" r="3" fill="#e8be45" />
    </g>
  );
}

function EarCharm({ avatar }: { avatar: MouseAvatarConfig }) {
  const kind = avatar.earAccessory;
  if (kind === "None") return null;
  if (kind === "Gold Hoop") {
    return <ellipse cx="122" cy="62" rx="6" ry="8" fill="none" stroke="#e0b44a" strokeWidth="2.2" />;
  }
  if (kind === "Safety Pin") {
    return (
      <g stroke="#d7dde6" strokeWidth="1.6" fill="none">
        <path d="M58 58 l10 16" />
        <circle cx="58" cy="58" r="2.2" fill="#d7dde6" />
        <circle cx="68" cy="74" r="2" />
      </g>
    );
  }
  if (kind === "Daisy Flower") {
    return (
      <g>
        {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => {
          const rad = (deg * Math.PI) / 180;
          return <circle key={deg} cx={60 + Math.cos(rad) * 5} cy={50 + Math.sin(rad) * 5} r="2.3" fill="#f7f4ee" />;
        })}
        <circle cx="60" cy="50" r="2.4" fill="#f2c14e" />
      </g>
    );
  }
  return (
    <g>
      <path d="M58 48 Q88 36 118 48" fill="none" stroke="#2c3138" strokeWidth="3" />
      <rect x="50" y="46" width="12" height="14" rx="3" fill="#2c3138" />
      <rect x="110" y="44" width="12" height="14" rx="3" fill="#2c3138" />
      <rect x="53" y="50" width="6" height="4" fill="#34d399" />
    </g>
  );
}

function Prop({ avatar }: { avatar: MouseAvatarConfig }) {
  const kind = avatar.prop;
  if (kind === "None") return null;
  const x = 112;
  const y = 90;
  if (kind === "Swiss Cheese Wedge") {
    return (
      <g>
        <polygon points={`${x},${y} ${x + 22},${y + 8} ${x + 6},${y + 22}`} fill="#f6d35b" stroke="#e2b63a" strokeWidth="1" />
        <circle cx={x + 10} cy={y + 10} r="2.2" fill="#e2b63a" />
        <circle cx={x + 14} cy={y + 15} r="1.6" fill="#e8be45" />
      </g>
    );
  }
  if (kind === "Mini Baguette") {
    return <rect x={x} y={y + 4} width="28" height="8" rx="4" fill="#e0b07a" stroke="#c48b4e" strokeWidth="1" transform={`rotate(-20 ${x} ${y})`} />;
  }
  if (kind === "Rolled Newspaper") {
    return (
      <g transform={`rotate(-16 ${x + 8} ${y + 8})`}>
        <rect x={x} y={y} width="26" height="12" rx="2" fill="#f4f1ea" stroke="#d9d3c7" strokeWidth="1" />
        <path d={`M${x + 4} ${y + 4} H${x + 20} M${x + 4} ${y + 7} H${x + 16}`} stroke="#b7b1a6" strokeWidth="0.8" />
      </g>
    );
  }
  if (kind === "Wrench") {
    return (
      <g fill="#c5ced6" stroke="#6d7680" strokeWidth="1" transform={`rotate(30 ${x + 8} ${y + 10})`}>
        <rect x={x + 6} y={y} width="4" height="20" />
        <path d={`M${x + 2} ${y} h12 v6 h-3 v-2 h-6 v2 h-3 z`} />
      </g>
    );
  }
  if (kind === "Magic Wand") {
    return (
      <g>
        <line x1={x} y1={y + 20} x2={x + 18} y2={y} stroke="#6d543c" strokeWidth="2.4" strokeLinecap="round" />
        <polygon points={`${x + 18},${y - 2} ${x + 20},${y + 4} ${x + 26},${y + 6} ${x + 20},${y + 8} ${x + 18},${y + 14} ${x + 16},${y + 8} ${x + 10},${y + 6} ${x + 16},${y + 4}`} fill="#f2c14e" />
      </g>
    );
  }
  if (kind === "Teacup") {
    return (
      <g>
        <path d={`M${x} ${y} h16 v8 a8 8 0 0 1 -16 0 z`} fill="#f7f4ee" stroke="#d9d3c7" strokeWidth="1" />
        <path d={`M${x + 16} ${y + 3} h4 a4 4 0 0 1 0 8 h-4`} fill="none" stroke="#d9d3c7" strokeWidth="1.4" />
        <ellipse cx={x + 8} cy={y + 18} rx="10" ry="2.4" fill="#e7e1d6" />
      </g>
    );
  }
  return (
    <g>
      <rect x={x} y={y} width="22" height="16" rx="2" fill="#6d543c" />
      <path d={`M${x + 6} ${y} v-4 h10 v4`} fill="none" stroke="#4e3b2a" strokeWidth="1.6" />
      <rect x={x + 9} y={y + 6} width="4" height="3" fill="#e0b44a" />
    </g>
  );
}

function Flag({ avatar, clipId }: { avatar: MouseAvatarConfig; clipId: string }) {
  if (avatar.flag === "None") return null;
  return (
    <g transform="translate(4 78)">
      <line x1="2" y1="0" x2="2" y2="56" stroke="#c4b59a" strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="2" cy="0" r="2.3" fill="#e0b44a" />
      <g transform="translate(4 2)" clipPath={`url(#${clipId})`}>
        <FlagCloth avatar={avatar} />
      </g>
    </g>
  );
}

function FlagCloth({ avatar }: { avatar: MouseAvatarConfig }) {
  const kind = avatar.flag;
  if (kind === "Jolly Roger") {
    return (
      <g>
        <rect width="32" height="20" fill="#16191e" />
        <circle cx="16" cy="8" r="4" fill="#f7f4ee" />
        <circle cx="14.4" cy="7.2" r="0.8" fill="#16191e" />
        <circle cx="17.6" cy="7.2" r="0.8" fill="#16191e" />
        <path d="M10 15 L16 12 L22 15 M13 14 L16 18 L19 14" stroke="#f7f4ee" strokeWidth="1.3" fill="none" />
      </g>
    );
  }
  if (kind === "Checkered Racing") {
    const cells = [];
    for (let row = 0; row < 4; row += 1) {
      for (let col = 0; col < 6; col += 1) {
        cells.push(<rect key={`${row}-${col}`} x={col * 5.4} y={row * 5} width="5.4" height="5" fill={(row + col) % 2 === 0 ? "#16191e" : "#f7f4ee"} />);
      }
    }
    return <g>{cells}</g>;
  }
  if (kind === "White Surrender") return <rect width="32" height="20" fill="#f7f4ee" stroke="#d9d3c7" strokeWidth="1" />;
  if (kind === "Rainbow Pride") {
    const colors = ["#e11d48", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#8b5cf6"];
    return (
      <g>
        {colors.map((color, index) => (
          <rect key={color} y={index * (20 / 6)} width="32" height={20 / 6 + 0.2} fill={color} />
        ))}
      </g>
    );
  }
  if (kind === "Custom Guild Banner") {
    const ink = luminance(avatar.guildColor) > 0.62 ? "#1c2430" : "#f8fafc";
    return (
      <g>
        <rect width="32" height="20" fill={avatar.guildColor} />
        <rect y="15" width="32" height="5" fill="#000" opacity="0.22" />
        <text x="16" y="12" textAnchor="middle" fontSize="7" fontWeight="700" fill={ink} fontFamily="ui-sans-serif, system-ui, sans-serif">
          {avatar.guildLabel.slice(0, 8)}
        </text>
      </g>
    );
  }
  if (kind === "Country Flag Selector") return <CountryFlag code={avatar.countryCode} />;
  return null;
}

function Stripes({ dir, colors }: { dir: "h" | "v"; colors: string[] }) {
  return (
    <g>
      {colors.map((color, index) =>
        dir === "h" ? (
          <rect key={color + index} y={(20 / colors.length) * index} width="32" height={20 / colors.length + 0.3} fill={color} />
        ) : (
          <rect key={color + index} x={(32 / colors.length) * index} width={32 / colors.length + 0.3} height="20" fill={color} />
        ),
      )}
    </g>
  );
}

function CrossFlag({ bg, cross, x = 11 }: { bg: string; cross: string; x?: number }) {
  return (
    <g>
      <rect width="32" height="20" fill={bg} />
      <rect x={x} width="4" height="20" fill={cross} />
      <rect y="8" width="32" height="4" fill={cross} />
    </g>
  );
}

function CountryFlag({ code }: { code: CountryCode }) {
  if (code === "US") {
    const stripes = ["#bf0a30", "#fff", "#bf0a30", "#fff", "#bf0a30", "#fff", "#bf0a30"];
    return (
      <g>
        {stripes.map((color, index) => (
          <rect key={index} y={(20 / 7) * index} width="32" height={20 / 7 + 0.2} fill={color} />
        ))}
        <rect width="14" height="10.5" fill="#002868" />
      </g>
    );
  }
  if (code === "GB" || code === "AU" || code === "NZ") {
    const jack = (
      <g>
        <rect width="32" height="20" fill="#012169" />
        <path d="M0 0 L32 20 M32 0 L0 20" stroke="#fff" strokeWidth="4" />
        <path d="M0 0 L32 20 M32 0 L0 20" stroke="#c8102e" strokeWidth="2" />
        <path d="M16 0 V20 M0 10 H32" stroke="#fff" strokeWidth="6" />
        <path d="M16 0 V20 M0 10 H32" stroke="#c8102e" strokeWidth="3" />
      </g>
    );
    if (code === "GB") return jack;
    return (
      <g>
        <rect width="32" height="20" fill="#012169" />
        <g transform="scale(0.45)">{jack}</g>
        <circle cx="24" cy="6" r="1.3" fill={code === "NZ" ? "#c8102e" : "#fff"} />
        <circle cx="26" cy="12" r="1.1" fill={code === "NZ" ? "#c8102e" : "#fff"} />
        <circle cx="20" cy="14" r="1.2" fill={code === "NZ" ? "#c8102e" : "#fff"} />
        <circle cx="23" cy="16" r="0.8" fill="#fff" />
      </g>
    );
  }
  if (code === "JP") {
    return (
      <g>
        <rect width="32" height="20" fill="#fff" />
        <circle cx="16" cy="10" r="5.5" fill="#bc002d" />
      </g>
    );
  }
  if (code === "CN") {
    return (
      <g>
        <rect width="32" height="20" fill="#de2910" />
        <polygon points="8,3 9,6 12,6 9.6,7.6 10.4,10.4 8,8.6 5.6,10.4 6.4,7.6 4,6 7,6" fill="#ffde00" />
      </g>
    );
  }
  if (code === "KR") {
    return (
      <g>
        <rect width="32" height="20" fill="#fff" />
        <path d="M16 4 a6 6 0 0 1 0 12 a3 3 0 0 1 0 -6 a3 3 0 0 0 0 -6" fill="#cd2e3a" />
        <path d="M16 4 a6 6 0 0 0 0 12 a3 3 0 0 0 0 -6 a3 3 0 0 1 0 -6" fill="#0047a0" />
      </g>
    );
  }
  if (code === "IN") {
    return (
      <g>
        <Stripes dir="h" colors={["#ff9933", "#fff", "#138808"]} />
        <circle cx="16" cy="10" r="2" fill="none" stroke="#000080" strokeWidth="0.8" />
      </g>
    );
  }
  if (code === "BR") {
    return (
      <g>
        <rect width="32" height="20" fill="#009c3b" />
        <polygon points="16,2 30,10 16,18 2,10" fill="#ffdf00" />
        <circle cx="16" cy="10" r="4" fill="#002776" />
      </g>
    );
  }
  if (code === "CH") {
    return (
      <g>
        <rect width="32" height="20" fill="#d52b1e" />
        <rect x="14" y="4" width="4" height="12" fill="#fff" />
        <rect x="10" y="8" width="12" height="4" fill="#fff" />
      </g>
    );
  }
  if (code === "SE") return <CrossFlag bg="#006aa7" cross="#fecc00" />;
  if (code === "FI") return <CrossFlag bg="#fff" cross="#003580" />;
  if (code === "DK") return <CrossFlag bg="#c60c30" cross="#fff" />;
  if (code === "NO") {
    return (
      <g>
        <rect width="32" height="20" fill="#ba0c2f" />
        <rect x="10" width="6" height="20" fill="#fff" />
        <rect y="7" width="32" height="6" fill="#fff" />
        <rect x="12" width="2.4" height="20" fill="#00205b" />
        <rect y="8.8" width="32" height="2.4" fill="#00205b" />
      </g>
    );
  }
  if (code === "CA") {
    return (
      <g>
        <Stripes dir="v" colors={["#d52b1e", "#fff", "#d52b1e"]} />
        <polygon points="16,5 17.2,8 20,8 17.8,9.6 18.6,12.4 16,10.6 13.4,12.4 14.2,9.6 12,8 14.8,8" fill="#d52b1e" />
      </g>
    );
  }
  if (code === "ZA") {
    return (
      <g>
        <rect width="32" height="20" fill="#007a4d" />
        <polygon points="0,0 14,10 0,20" fill="#000" />
        <polygon points="0,3 10,10 0,17" fill="#ffb612" />
        <rect y="0" x="8" width="24" height="10" fill="#de3831" />
        <rect y="10" x="8" width="24" height="10" fill="#002395" />
      </g>
    );
  }
  if (code === "TR") {
    return (
      <g>
        <rect width="32" height="20" fill="#e30a17" />
        <circle cx="13" cy="10" r="5" fill="#fff" />
        <circle cx="15" cy="10" r="4" fill="#e30a17" />
      </g>
    );
  }
  if (code === "GR") {
    const rows = ["#0d5eaf", "#fff", "#0d5eaf", "#fff", "#0d5eaf", "#fff", "#0d5eaf", "#fff", "#0d5eaf"];
    return (
      <g>
        {rows.map((color, index) => (
          <rect key={index} y={(20 / 9) * index} width="32" height={20 / 9 + 0.2} fill={color} />
        ))}
        <rect width="12" height="11" fill="#0d5eaf" />
        <rect x="5" width="2" height="11" fill="#fff" />
        <rect y="4.5" width="12" height="2" fill="#fff" />
      </g>
    );
  }
  if (code === "PT") {
    return (
      <g>
        <rect width="12" height="20" fill="#006600" />
        <rect x="12" width="20" height="20" fill="#ff0000" />
        <circle cx="12" cy="10" r="4" fill="#ffcc00" />
      </g>
    );
  }
  if (code === "SG") {
    return (
      <g>
        <rect width="32" height="10" fill="#ef3340" />
        <rect y="10" width="32" height="10" fill="#fff" />
        <circle cx="8" cy="8" r="3" fill="#fff" />
        <circle cx="9.2" cy="8" r="2.4" fill="#ef3340" />
      </g>
    );
  }
  if (code === "EG") return <Stripes dir="h" colors={["#ce1126", "#fff", "#000"]} />;
  if (code === "KE") {
    return (
      <g>
        <Stripes dir="h" colors={["#000", "#bb0000", "#006600"]} />
        <ellipse cx="16" cy="10" rx="4" ry="6" fill="#fff" />
        <ellipse cx="16" cy="10" rx="2.2" ry="4" fill="#000" />
      </g>
    );
  }
  if (code === "AE") {
    return (
      <g>
        <rect width="8" height="20" fill="#ff0000" />
        <rect x="8" width="24" height="6.7" fill="#00732f" />
        <rect x="8" y="6.7" width="24" height="6.6" fill="#fff" />
        <rect x="8" y="13.3" width="24" height="6.7" fill="#000" />
      </g>
    );
  }
  if (code === "AR") {
    return (
      <g>
        <Stripes dir="h" colors={["#74acdf", "#fff", "#74acdf"]} />
        <circle cx="16" cy="10" r="2" fill="#f6b40e" />
      </g>
    );
  }
  if (code === "ES") {
    return (
      <g>
        <rect width="32" height="20" fill="#c60b1e" />
        <rect y="5" width="32" height="10" fill="#ffc400" />
      </g>
    );
  }
  if (code === "FR") return <Stripes dir="v" colors={["#0055a4", "#fff", "#ef4135"]} />;
  if (code === "IT") return <Stripes dir="v" colors={["#009246", "#fff", "#ce2b37"]} />;
  if (code === "IE") return <Stripes dir="v" colors={["#169b62", "#fff", "#ff883e"]} />;
  if (code === "BE") return <Stripes dir="v" colors={["#000", "#fdda24", "#ef3340"]} />;
  if (code === "NG") return <Stripes dir="v" colors={["#008751", "#fff", "#008751"]} />;
  if (code === "MX") return <Stripes dir="v" colors={["#006847", "#fff", "#ce1126"]} />;
  if (code === "DE") return <Stripes dir="h" colors={["#000", "#dd0000", "#ffce00"]} />;
  if (code === "NL") return <Stripes dir="h" colors={["#ae1c28", "#fff", "#21468b"]} />;
  if (code === "PL") return <Stripes dir="h" colors={["#fff", "#dc143c"]} />;
  if (code === "UA") return <Stripes dir="h" colors={["#005bbb", "#ffd500"]} />;
  return <rect width="32" height="20" fill="#9aa3ad" />;
}
