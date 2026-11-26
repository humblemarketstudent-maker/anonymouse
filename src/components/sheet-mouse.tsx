import { useId } from "react";
import type { MouseAvatar as MouseAvatarConfig } from "@/lib/avatar";
import { FUR_PAINT, SKIN_PAINT, linkedPaint } from "@/lib/avatar";
import { cn } from "@/lib/utils";

const INK = "#2a221c";

/** Flat, heavy-outline mouse in the same cartoon language as the mouse sheet. */
export function SheetMouse({
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
  const belly = avatar.markings === "Berkshire Belly" ? "#fff7ee" : fur.lite;
  const spot = avatar.fur === "Charcoal Black" || avatar.fur === "Slate Gray" ? fur.lite : fur.deep;
  const whisker = luminance(fur.main) < 0.34 ? "#f6f1ea" : INK;
  const points = avatar.markings === "Siamese Points";
  const earFur = points ? fur.deep : fur.main;
  const earInner = points ? skin.deep : skin.main;
  const pose =
    avatar.build === "Chonky"
      ? "translate(80 90) scale(1.12 1.06) translate(-80 -90)"
      : avatar.build === "Sleek"
        ? "translate(80 90) scale(0.86 1.04) translate(-80 -90)"
        : undefined;

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
          <stop offset="0.5" stopColor="#ff7a9c" />
          <stop offset="1" stopColor="#6d5cff" />
        </linearGradient>
        <pattern id={`${rawId}-cheese`} width="28" height="28" patternUnits="userSpaceOnUse">
          <rect width="28" height="28" fill="#f6d35b" />
          <circle cx="8" cy="9" r="4" fill="#e2b63a" />
          <circle cx="20" cy="18" r="5" fill="#e8be45" />
        </pattern>
        <clipPath id={`${rawId}-badge`}>
          <circle cx="80" cy="80" r="73" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${rawId}-badge)`}>
        <SheetBackground avatar={avatar} id={rawId} />
        <g transform={pose}>
          <SheetTail avatar={avatar} color={points ? skin.deep : linked.tail} />
          <SheetTailCharm avatar={avatar} />
          {avatar.build === "Scruffy" ? <Scruff color={fur.deep} /> : null}
          <ellipse cx="80" cy="112" rx="36" ry="30" fill={fur.main} stroke={INK} strokeWidth="2.6" />
          <ellipse cx="80" cy="120" rx="22" ry="16" fill={belly} stroke={INK} strokeWidth="1.8" />
          {avatar.markings === "Dalmatian Spots" ? (
            <g fill={spot}>
              <circle cx="62" cy="108" r="3.2" />
              <circle cx="96" cy="114" r="2.4" />
              <circle cx="74" cy="126" r="2" />
            </g>
          ) : null}
          <SheetOutfit avatar={avatar} />
          <SheetNeck avatar={avatar} />
          <circle cx="80" cy="74" r="30" fill={fur.main} stroke={INK} strokeWidth="2.6" />
          {avatar.markings === "Hooded Stripe" ? (
            <path d="M80 48 C76 64 84 82 80 100" fill="none" stroke={spot} strokeWidth="8" strokeLinecap="round" />
          ) : null}
          {avatar.markings === "Forehead Blaze" ? (
            <path d="M80 50 C86 60 74 70 82 82" fill="none" stroke={fur.lite} strokeWidth="6" strokeLinecap="round" />
          ) : null}
          {avatar.markings === "Dalmatian Spots" ? (
            <g fill={spot}>
              <circle cx="64" cy="66" r="2.6" />
              <circle cx="98" cy="70" r="2" />
              <circle cx="84" cy="56" r="1.8" />
            </g>
          ) : null}
          <SheetEars avatar={avatar} fur={earFur} inner={earInner} />
          <SheetHat avatar={avatar} />
          <SheetEyes avatar={avatar} />
          <SheetSnout avatar={avatar} nose={points ? skin.deep : linked.nose} fill={linked.snout} />
          <SheetWhiskers avatar={avatar} color={whisker} />
          <SheetGlasses avatar={avatar} />
          <SheetEarCharm avatar={avatar} />
          {avatar.prop === "None" ? <WavePaw fur={fur.main} pad={earInner} /> : <SheetProp avatar={avatar} />}
        </g>
      </g>
      <circle cx="80" cy="80" r="73" fill="none" stroke={INK} strokeWidth="5" />
    </svg>
  );
}

function luminance(hex: string): number {
  const value = hex.replace("#", "");
  const num = Number.parseInt(value, 16);
  const r = ((num >> 16) & 255) / 255;
  const g = ((num >> 8) & 255) / 255;
  const b = (num & 255) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function SheetBackground({ avatar, id }: { avatar: MouseAvatarConfig; id: string }) {
  const kind = avatar.background;
  if (kind === "Sunset Gradient") return <rect width="160" height="160" fill={`url(#${id}-sunset)`} />;
  if (kind === "Swiss Cheese Pattern") return <rect width="160" height="160" fill={`url(#${id}-cheese)`} />;
  if (kind === "Parisian Kitchen") {
    return (
      <g>
        <rect width="160" height="160" fill="#f4d7a8" />
        <rect x="18" y="18" width="36" height="28" rx="2" fill="#d7eef8" stroke={INK} strokeWidth="1.4" />
        <path d="M36 18 V46 M18 32 H54" stroke={INK} strokeWidth="1.2" />
      </g>
    );
  }
  if (kind === "Cozy Library") {
    const spines = ["#8c3d32", "#d4a017", "#2f5d50", "#314e7a", "#eadfce", "#7a3e62"];
    return (
      <g>
        <rect width="160" height="160" fill="#6b4a32" />
        {spines.map((color, index) => (
          <rect key={color} x={18 + index * 14} y="108" width="12" height="40" fill={color} stroke={INK} strokeWidth="1" />
        ))}
      </g>
    );
  }
  if (kind === "Cyberpunk Alley") {
    return (
      <g>
        <rect width="160" height="160" fill="#14182a" />
        <rect y="36" width="160" height="4" fill="#34d399" />
        <rect y="78" width="160" height="3" fill="#e879f9" />
        <rect y="118" width="160" height="4" fill="#22d3ee" />
        <rect x="18" y="48" width="18" height="64" fill="#1c2438" />
        <rect x="118" y="28" width="22" height="84" fill="#1c2438" />
      </g>
    );
  }
  const fill = kind === "Pastel Mint" ? "#b7e4c7" : kind === "Pastel Lavender" ? "#d5c4f0" : "#f6d7b0";
  return <rect width="160" height="160" fill={fill} />;
}

function SheetTail({ avatar, color }: { avatar: MouseAvatarConfig; color: string }) {
  const kind = avatar.tail;
  if (kind === "Fluffy Bushy") {
    return <path d="M58 116 C40 108 28 124 36 142 C44 154 62 146 58 132 C64 122 66 118 58 116 Z" fill={color} stroke={INK} strokeWidth="2.2" />;
  }
  if (kind === "Braided") {
    return (
      <g fill="none" strokeLinecap="round">
        <path d="M56 114 C40 112 30 126 34 142" stroke={color} strokeWidth="6" />
        <path d="M60 118 C44 122 34 132 38 146" stroke={INK} strokeWidth="3" />
      </g>
    );
  }
  if (kind === "Curled Heart") {
    return (
      <path
        d="M34 128 C34 118 46 118 46 128 C46 118 58 118 58 128 C58 140 46 148 46 148 C46 148 34 140 34 128 Z"
        fill={color}
        stroke={INK}
        strokeWidth="2"
      />
    );
  }
  if (kind === "Lightning Bolt") {
    return <polyline points="58,114 44,112 50,124 34,122 42,140 28,136 36,150" fill="none" stroke={color} strokeWidth="7" strokeLinejoin="round" strokeLinecap="round" />;
  }
  if (kind === "Cybernetic Metal") {
    return (
      <g stroke={INK} strokeWidth="1.4">
        <rect x="46" y="112" width="16" height="8" rx="2" fill="#d5dbe3" transform="rotate(-20 54 116)" />
        <rect x="34" y="122" width="16" height="8" rx="2" fill="#c5ced6" transform="rotate(-8 42 126)" />
        <rect x="28" y="134" width="14" height="8" rx="2" fill="#b7c0ca" />
      </g>
    );
  }
  return <path d="M62 114 C40 110 24 124 32 142 C38 150 50 144 48 132 C52 122 64 120 62 114 Z" fill={color} stroke={INK} strokeWidth="2.2" />;
}

function SheetTailCharm({ avatar }: { avatar: MouseAvatarConfig }) {
  const kind = avatar.tailAccessory;
  if (kind === "None") return null;
  const x = avatar.tail === "Curled Heart" ? 46 : 34;
  const y = avatar.tail === "Curled Heart" ? 146 : 144;
  if (kind === "Silk Ribbon Bow") {
    return (
      <g>
        <path d={`M${x} ${y} l-8 -6 l3 7 z`} fill="#e11d48" stroke={INK} strokeWidth="1" />
        <path d={`M${x} ${y} l8 -5 l-3 7 z`} fill="#be123c" stroke={INK} strokeWidth="1" />
      </g>
    );
  }
  if (kind === "Tiny Brass Bell") {
    return <path d={`M${x - 5} ${y - 2} h10 l-1.5 7 h-7 z`} fill="#e0b44a" stroke={INK} strokeWidth="1.2" />;
  }
  if (kind === "Bandage Wrap") {
    return (
      <g stroke="#f7f4ee" strokeWidth="3" strokeLinecap="round">
        <path d={`M${x - 7} ${y - 3} L${x + 7} ${y + 2}`} />
        <path d={`M${x - 7} ${y + 3} L${x + 7} ${y - 2}`} />
      </g>
    );
  }
  if (kind === "Spiked Cuff") {
    return (
      <g>
        <rect x={x - 7} y={y - 3} width="14" height="7" rx="2" fill={INK} />
        <polygon points={`${x - 4},${y - 3} ${x - 1},${y - 9} ${x + 2},${y - 3}`} fill="#e7e5e4" stroke={INK} strokeWidth="1" />
      </g>
    );
  }
  return null;
}

function Scruff({ color }: { color: string }) {
  return (
    <g fill={color}>
      <circle cx="48" cy="100" r="6" />
      <circle cx="112" cy="102" r="6" />
      <circle cx="58" cy="132" r="5" />
      <circle cx="104" cy="134" r="5" />
      <circle cx="80" cy="46" r="5" />
    </g>
  );
}

function SheetOutfit({ avatar }: { avatar: MouseAvatarConfig }) {
  const kind = avatar.outfit;
  if (kind === "None") return null;
  if (kind === "Knitted Sweater") {
    return (
      <g>
        <ellipse cx="80" cy="116" rx="34" ry="26" fill="#1f6b5a" stroke={INK} strokeWidth="2.2" />
        <path d="M52 108 H108 M54 116 H106 M56 124 H104" stroke="#7dcebb" strokeWidth="1.6" />
      </g>
    );
  }
  if (kind === "Oversized Hoodie") {
    return (
      <g>
        <path d="M48 70 C46 40 114 38 116 72" fill="none" stroke="#243044" strokeWidth="16" strokeLinecap="round" />
        <ellipse cx="80" cy="118" rx="36" ry="26" fill="#243044" stroke={INK} strokeWidth="2.2" />
        <circle cx="96" cy="114" r="2" fill="#34d399" />
      </g>
    );
  }
  if (kind === "Detective Trench Coat") {
    return (
      <g>
        <ellipse cx="80" cy="118" rx="36" ry="26" fill="#6d543c" stroke={INK} strokeWidth="2.2" />
        <path d="M80 96 L64 112 L80 108 Z" fill="#8a6b4d" stroke={INK} strokeWidth="1.4" />
        <path d="M80 96 L96 112 L80 108 Z" fill="#5c4632" stroke={INK} strokeWidth="1.4" />
      </g>
    );
  }
  if (kind === "Chef Jacket") {
    return (
      <g>
        <ellipse cx="80" cy="118" rx="34" ry="26" fill="#f7f7f5" stroke={INK} strokeWidth="2.2" />
        <path d="M80 100 V132" stroke={INK} strokeWidth="1.6" />
        <circle cx="74" cy="110" r="1.6" fill={INK} />
        <circle cx="74" cy="120" r="1.6" fill={INK} />
      </g>
    );
  }
  if (kind === "Wizard Robe") {
    return (
      <g>
        <ellipse cx="80" cy="118" rx="36" ry="26" fill="#3a2a6a" stroke={INK} strokeWidth="2.2" />
        <polygon points="74,104 80,96 86,104 82,110 78,110" fill="#f2c14e" stroke={INK} strokeWidth="1" />
      </g>
    );
  }
  return (
    <g>
      <ellipse cx="80" cy="118" rx="36" ry="26" fill="#9aa3ad" stroke={INK} strokeWidth="2.2" />
      <rect x="70" y="102" width="20" height="22" rx="2" fill="#d5dde6" stroke={INK} strokeWidth="1.6" />
    </g>
  );
}

function SheetNeck({ avatar }: { avatar: MouseAvatarConfig }) {
  const kind = avatar.neckwear;
  if (kind === "None") return null;
  if (kind === "Red Bandana") return <path d="M62 96 Q80 108 98 96 L90 108 L80 100 L70 110 Z" fill="#e11d48" stroke={INK} strokeWidth="1.4" />;
  if (kind === "Bow Tie") {
    return (
      <g stroke={INK} strokeWidth="1.2">
        <polygon points="80,100 66,94 66,106" fill="#1f6b5a" />
        <polygon points="80,100 94,94 94,106" fill="#1f6b5a" />
        <circle cx="80" cy="100" r="3" fill="#f2c14e" />
      </g>
    );
  }
  if (kind === "Silk Scarf") return <path d="M60 98 Q80 108 100 96" fill="none" stroke="#7c6bb5" strokeWidth="6" strokeLinecap="round" />;
  if (kind === "Studded Collar") {
    return (
      <g>
        <path d="M62 100 Q80 110 98 100" fill="none" stroke={INK} strokeWidth="5" strokeLinecap="round" />
        <g fill="#f4f1ea">
          <circle cx="70" cy="103" r="1.4" />
          <circle cx="80" cy="106" r="1.4" />
          <circle cx="90" cy="103" r="1.4" />
        </g>
      </g>
    );
  }
  if (kind === "Pearl Necklace") {
    return (
      <g fill="#f7f4ee" stroke={INK} strokeWidth="0.6">
        {[-14, -7, 0, 7, 14].map((dx, index) => (
          <circle key={dx} cx={80 + dx} cy={100 + (index % 2 === 0 ? 2 : 5)} r="2.6" />
        ))}
      </g>
    );
  }
  return <path d="M64 100 L72 106 L80 100 L88 106 L96 100" fill="none" stroke="#e0b44a" strokeWidth="2.4" strokeLinecap="round" />;
}

function SheetEars({ avatar, fur, inner }: { avatar: MouseAvatarConfig; fur: string; inner: string }) {
  if (avatar.ears === "Round Dumbo") {
    return (
      <g stroke={INK} strokeWidth="2.4">
        <ellipse cx="40" cy="84" rx="20" ry="18" fill={fur} />
        <ellipse cx="40" cy="86" rx="10" ry="9" fill={inner} stroke="none" />
        <ellipse cx="120" cy="82" rx="20" ry="18" fill={fur} />
        <ellipse cx="120" cy="84" rx="10" ry="9" fill={inner} stroke="none" />
      </g>
    );
  }
  if (avatar.ears === "Folded Floppy") {
    return (
      <g stroke={INK} strokeWidth="2.2">
        <path d="M62 58 C48 66 46 92 64 104 C72 90 74 70 66 58 Z" fill={fur} />
        <path d="M66 66 C58 74 58 88 66 94 C70 84 70 72 66 66 Z" fill={inner} stroke="none" />
        <path d="M98 56 C114 64 116 92 98 106 C90 92 88 68 96 56 Z" fill={fur} />
        <path d="M96 66 C104 76 104 90 96 96 C92 84 92 72 96 66 Z" fill={inner} stroke="none" />
      </g>
    );
  }
  if (avatar.ears === "Notched Scarred") {
    return (
      <g stroke={INK} strokeWidth="2.4">
        <ellipse cx="58" cy="52" rx="15" ry="17" fill={fur} />
        <ellipse cx="58" cy="54" rx="7" ry="9" fill={inner} stroke="none" />
        <ellipse cx="104" cy="50" rx="15" ry="17" fill={fur} />
        <ellipse cx="104" cy="52" rx="7" ry="9" fill={inner} stroke="none" />
        <path d="M112 36 L120 46 L108 48 Z" fill={inner} />
      </g>
    );
  }
  return (
    <g stroke={INK} strokeWidth="2.4">
      <ellipse cx="56" cy="50" rx="16" ry="18" fill={fur} />
      <ellipse cx="56" cy="52" rx="8" ry="10" fill={inner} stroke="none" />
      <ellipse cx="104" cy="48" rx="16" ry="18" fill={fur} />
      <ellipse cx="104" cy="50" rx="8" ry="10" fill={inner} stroke="none" />
    </g>
  );
}

function SheetEyes({ avatar }: { avatar: MouseAvatarConfig }) {
  const kind = avatar.eyes;
  const left = { x: 68, y: 74 };
  const right = { x: 92, y: 74 };
  if (kind === "Sleepy Half-Lidded") {
    return (
      <g fill="none" stroke={INK} strokeWidth="2.4" strokeLinecap="round">
        <path d="M60 74 Q68 80 76 74" />
        <path d="M84 74 Q92 80 100 74" />
      </g>
    );
  }
  if (kind === "Ruby Red") return <Boba left={left} right={right} iris="#9b2335" />;
  if (kind === "Anime Sparkle") return <Boba left={left} right={right} iris="#3a6ea5" sparkle />;
  if (kind === "Spiral Dizzy") {
    return (
      <g>
        {[left, right].map((eye) => (
          <g key={eye.x}>
            <circle cx={eye.x} cy={eye.y} r="6" fill="#fff" stroke={INK} strokeWidth="1.6" />
            <path d={`M${eye.x} ${eye.y} m-3 0 a3 3 0 1 1 5 -1`} fill="none" stroke={INK} strokeWidth="1.4" />
          </g>
        ))}
      </g>
    );
  }
  if (kind === "Heterochromia") {
    return (
      <g>
        <Boba left={left} right={left} iris="#e0a23a" />
        <Boba left={right} right={right} iris="#3a7bd5" />
      </g>
    );
  }
  if (kind === "Glowing Neon") {
    return (
      <g>
        {[left, right].map((eye) => (
          <g key={eye.x}>
            <circle cx={eye.x} cy={eye.y} r="8" fill="#34d399" opacity="0.35" />
            <circle cx={eye.x} cy={eye.y} r="5" fill="#5dffc2" stroke={INK} strokeWidth="1.4" />
            <circle cx={eye.x - 1.4} cy={eye.y - 1.4} r="1.4" fill="#fff" />
          </g>
        ))}
      </g>
    );
  }
  return (
    <g>
      {[left, right].map((eye) => (
        <g key={eye.x}>
          <ellipse cx={eye.x} cy={eye.y} rx="5.4" ry="6.4" fill={INK} />
          <circle cx={eye.x - 1.6} cy={eye.y - 2} r="1.6" fill="#fff" />
        </g>
      ))}
    </g>
  );
}

function Boba({
  left,
  right,
  iris,
  sparkle,
}: {
  left: { x: number; y: number };
  right: { x: number; y: number };
  iris: string;
  sparkle?: boolean;
}) {
  return (
    <g>
      {[left, right].map((eye) => (
        <g key={`${eye.x}-${iris}`}>
          <circle cx={eye.x} cy={eye.y} r="6.2" fill="#fff" stroke={INK} strokeWidth="1.6" />
          <circle cx={eye.x} cy={eye.y} r="3.4" fill={iris} />
          <circle cx={eye.x} cy={eye.y} r="1.6" fill={INK} />
          <circle cx={eye.x - 1.4} cy={eye.y - 1.6} r="1.1" fill="#fff" />
          {sparkle ? <circle cx={eye.x + 1.6} cy={eye.y + 1.2} r="0.7" fill="#fff" /> : null}
        </g>
      ))}
    </g>
  );
}

function SheetSnout({ avatar, nose, fill }: { avatar: MouseAvatarConfig; nose: string; fill: string }) {
  const kind = avatar.snout;
  return (
    <g>
      <ellipse cx="80" cy="88" rx="5.2" ry="3.6" fill={kind === "Nose Bandage" ? "#f4efe6" : nose} stroke={INK} strokeWidth="1.4" />
      {kind === "Twitchy Pink Nose" ? (
        <g>
          <path d="M72 96 Q80 102 88 96" fill="none" stroke={INK} strokeWidth="1.8" strokeLinecap="round" />
          <rect x="76" y="96" width="3.2" height="4.2" rx="0.6" fill={fill} stroke={INK} strokeWidth="0.8" />
          <rect x="80.2" y="96" width="3.2" height="4.2" rx="0.6" fill={fill} stroke={INK} strokeWidth="0.8" />
        </g>
      ) : null}
      {kind === "Buck Teeth" ? (
        <g>
          <rect x="74" y="94" width="5" height="8" rx="1" fill="#fff" stroke={INK} strokeWidth="1.2" />
          <rect x="81" y="94" width="5" height="8" rx="1" fill="#fff" stroke={INK} strokeWidth="1.2" />
        </g>
      ) : null}
      {kind === "Cheeky Smirk" ? (
        <path d="M74 96 Q84 104 94 92" fill="none" stroke={INK} strokeWidth="1.8" strokeLinecap="round" />
      ) : null}
      {kind === "Tiny Fangs" ? (
        <g fill="#fff" stroke={INK} strokeWidth="1">
          <polygon points="74,94 78,94 76,102" />
          <polygon points="82,94 86,94 84,102" />
        </g>
      ) : null}
      {kind === "Nose Bandage" ? (
        <g>
          <rect x="70" y="84" width="20" height="8" rx="2" fill="#f7f4ee" stroke={INK} strokeWidth="1.3" />
          <path d="M76 84 V92 M84 84 V92" stroke={INK} strokeWidth="1" />
        </g>
      ) : null}
    </g>
  );
}

function SheetWhiskers({ avatar, color }: { avatar: MouseAvatarConfig; color: string }) {
  const kind = avatar.whiskers;
  const y = 90;
  if (kind === "Long Droopy") {
    return (
      <g fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round">
        <path d={`M64 ${y} Q48 ${y + 8} 42 ${y + 16}`} />
        <path d={`M64 ${y + 4} Q50 ${y + 14} 44 ${y + 22}`} />
        <path d={`M96 ${y} Q112 ${y + 8} 118 ${y + 16}`} />
        <path d={`M96 ${y + 4} Q110 ${y + 14} 116 ${y + 22}`} />
      </g>
    );
  }
  if (kind === "Curly Rex") {
    return (
      <g fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round">
        <path d={`M64 ${y} q-6 -4 -8 2 t-8 -2`} />
        <path d={`M64 ${y + 5} q-6 4 -10 0`} />
        <path d={`M96 ${y} q6 -4 8 2 t8 -2`} />
        <path d={`M96 ${y + 5} q6 4 10 0`} />
      </g>
    );
  }
  if (kind === "Scruffy Jagged") {
    return (
      <g fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <polyline points={`64,${y} 54,${y - 4} 46,${y + 2} 38,${y - 2}`} />
        <polyline points={`96,${y} 106,${y - 5} 114,${y + 1} 122,${y - 3}`} />
      </g>
    );
  }
  if (kind === "Handlebar") {
    return (
      <g fill="none" stroke={color} strokeWidth="1.7" strokeLinecap="round">
        <path d={`M64 ${y} Q48 ${y + 2} 44 ${y - 8}`} />
        <path d={`M96 ${y} Q112 ${y + 2} 116 ${y - 8}`} />
      </g>
    );
  }
  if (kind === "Cheese Crumb Stuck") {
    return (
      <g>
        <g fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round">
          <path d={`M64 ${y - 2} H46`} />
          <path d={`M64 ${y + 4} H48`} />
          <path d={`M96 ${y - 2} H116`} />
          <path d={`M96 ${y + 4} H112`} />
        </g>
        <polygon points="112,86 120,90 114,96 108,92" fill="#f6d35b" stroke={INK} strokeWidth="1" />
      </g>
    );
  }
  return (
    <g fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round">
      <path d={`M62 ${y - 4} H44`} />
      <path d={`M62 ${y + 1} H42`} />
      <path d={`M62 ${y + 6} H48`} />
      <path d={`M98 ${y - 4} H116`} />
      <path d={`M98 ${y + 1} H118`} />
      <path d={`M98 ${y + 6} H112`} />
    </g>
  );
}

function SheetGlasses({ avatar }: { avatar: MouseAvatarConfig }) {
  const kind = avatar.eyewear;
  if (kind === "None") return null;
  if (kind === "Wire-Rim Glasses") {
    return (
      <g fill="none" stroke={INK} strokeWidth="2">
        <rect x="58" y="68" width="16" height="12" rx="3" />
        <rect x="86" y="68" width="16" height="12" rx="3" />
        <path d="M74 74 H86" />
      </g>
    );
  }
  if (kind === "Pixel Sunglasses") {
    return (
      <g>
        <rect x="56" y="68" width="20" height="12" fill={INK} />
        <rect x="84" y="68" width="20" height="12" fill={INK} />
        <rect x="76" y="72" width="8" height="4" fill={INK} />
        <rect x="58" y="70" width="5" height="3" fill="#7dd3fc" />
      </g>
    );
  }
  if (kind === "Gold Monocle") {
    return (
      <g fill="none" stroke="#e0b44a" strokeWidth="2">
        <circle cx="94" cy="74" r="8" />
        <path d="M102 78 C108 88 106 98 100 104" />
      </g>
    );
  }
  if (kind === "Steampunk Goggles") {
    return (
      <g>
        <circle cx="68" cy="74" r="9" fill="#c5ced6" stroke="#6d5a3a" strokeWidth="2.4" />
        <circle cx="94" cy="74" r="9" fill="#c5ced6" stroke="#6d5a3a" strokeWidth="2.4" />
        <circle cx="68" cy="74" r="4" fill="#8fd0c4" />
        <circle cx="94" cy="74" r="4" fill="#8fd0c4" />
      </g>
    );
  }
  return <path d="M58 66 H88 L82 82 H64 Z" fill={INK} />;
}

function SheetHat({ avatar }: { avatar: MouseAvatarConfig }) {
  const kind = avatar.headwear;
  if (kind === "None") return null;
  if (kind === "Beanie") {
    return (
      <g stroke={INK} strokeWidth="1.8">
        <path d="M58 58 C58 34 104 32 106 56" fill="#2f6f8f" />
        <rect x="56" y="52" width="52" height="8" rx="2" fill="#245872" />
        <circle cx="82" cy="32" r="5" fill="#2f6f8f" />
      </g>
    );
  }
  if (kind === "Chef's Toque") {
    return (
      <g fill="#f7f7f5" stroke={INK} strokeWidth="1.8">
        <rect x="66" y="40" width="28" height="16" />
        <ellipse cx="80" cy="36" rx="20" ry="12" />
        <ellipse cx="68" cy="40" rx="8" ry="7" />
        <ellipse cx="92" cy="38" rx="8" ry="7" />
      </g>
    );
  }
  if (kind === "Wizard Hat") {
    return (
      <g>
        <ellipse cx="80" cy="52" rx="28" ry="7" fill="#3a2a6a" stroke={INK} strokeWidth="1.6" />
        <polygon points="80,12 104,52 56,52" fill="#3a2a6a" stroke={INK} strokeWidth="1.6" />
        <circle cx="74" cy="34" r="1.4" fill="#f2c14e" />
        <circle cx="86" cy="28" r="1.2" fill="#f2c14e" />
        <circle cx="80" cy="42" r="1" fill="#fff" />
      </g>
    );
  }
  if (kind === "Royal Crown") {
    return <polygon points="56,56 64,34 74,50 80,28 86,50 96,34 104,56" fill="#e0b44a" stroke={INK} strokeWidth="1.6" />;
  }
  if (kind === "Pirate Tricorn") {
    return (
      <g fill={INK}>
        <ellipse cx="80" cy="52" rx="32" ry="8" />
        <path d="M52 50 L66 38 L80 48 L98 36 L112 52 L96 56 L80 48 L66 56 Z" />
      </g>
    );
  }
  if (kind === "Propeller Cap") {
    return (
      <g stroke={INK} strokeWidth="1.4">
        <path d="M60 56 C60 40 100 38 104 56" fill="#e11d48" />
        <path d="M100 56 H122 L114 62 H100 Z" fill="#be123c" />
        <line x1="70" y1="40" x2="94" y2="40" stroke="#d7dde6" strokeWidth="3" strokeLinecap="round" />
        <circle cx="82" cy="40" r="2" fill="#e0b44a" />
      </g>
    );
  }
  return (
    <g>
      <polygon points="62,56 100,56 86,24" fill="#f6d35b" stroke={INK} strokeWidth="1.6" />
      <circle cx="78" cy="46" r="3.2" fill="#e2b63a" stroke={INK} strokeWidth="1" />
    </g>
  );
}

function SheetEarCharm({ avatar }: { avatar: MouseAvatarConfig }) {
  const kind = avatar.earAccessory;
  if (kind === "None") return null;
  if (kind === "Gold Hoop") return <ellipse cx="118" cy="64" rx="6" ry="8" fill="none" stroke="#e0b44a" strokeWidth="2.2" />;
  if (kind === "Safety Pin") {
    return (
      <g stroke="#d7dde6" strokeWidth="1.6" fill="none">
        <path d="M46 52 l8 14" />
        <circle cx="46" cy="52" r="2" fill="#d7dde6" />
      </g>
    );
  }
  if (kind === "Daisy Flower") {
    return (
      <g>
        {[0, 60, 120, 180, 240, 300].map((deg) => {
          const rad = (deg * Math.PI) / 180;
          return <circle key={deg} cx={48 + Math.cos(rad) * 5} cy={46 + Math.sin(rad) * 5} r="2.2" fill="#fff" stroke={INK} strokeWidth="0.6" />;
        })}
        <circle cx="48" cy="46" r="2.2" fill="#f2c14e" stroke={INK} strokeWidth="0.6" />
      </g>
    );
  }
  return (
    <g>
      <path d="M48 46 Q80 30 112 44" fill="none" stroke={INK} strokeWidth="3" />
      <rect x="40" y="42" width="14" height="16" rx="4" fill="#2c3138" stroke={INK} strokeWidth="1" />
      <rect x="106" y="40" width="14" height="16" rx="4" fill="#2c3138" stroke={INK} strokeWidth="1" />
    </g>
  );
}

function WavePaw({ fur, pad }: { fur: string; pad: string }) {
  return (
    <g stroke={INK} strokeWidth="2.2">
      <ellipse cx="116" cy="96" rx="9" ry="10" fill={fur} />
      <ellipse cx="114" cy="94" rx="3.4" ry="4" fill={pad} stroke="none" />
      <path d="M108 90 C104 84 108 78 112 80" fill="none" strokeLinecap="round" />
    </g>
  );
}

function SheetProp({ avatar }: { avatar: MouseAvatarConfig }) {
  const kind = avatar.prop;
  if (kind === "Swiss Cheese Wedge") {
    return (
      <g>
        <polygon points="96,108 124,116 104,136" fill="#f6d35b" stroke={INK} strokeWidth="1.8" />
        <circle cx="108" cy="118" r="2.4" fill="#e2b63a" />
        <circle cx="114" cy="126" r="1.8" fill="#e8be45" />
      </g>
    );
  }
  if (kind === "Mini Baguette") {
    return <rect x="92" y="112" width="36" height="10" rx="5" fill="#e0b07a" stroke={INK} strokeWidth="1.6" transform="rotate(-18 110 117)" />;
  }
  if (kind === "Rolled Newspaper") {
    return (
      <g transform="rotate(-16 110 118)">
        <rect x="92" y="110" width="34" height="14" rx="2" fill="#f4f1ea" stroke={INK} strokeWidth="1.4" />
        <path d="M98 115 H118 M98 119 H112" stroke="#b7b1a6" strokeWidth="1" />
      </g>
    );
  }
  if (kind === "Wrench") {
    return (
      <g fill="#c5ced6" stroke={INK} strokeWidth="1.4" transform="rotate(28 112 116)">
        <rect x="108" y="102" width="6" height="24" />
        <path d="M102 100 h16 v7 h-4 v-3 h-8 v3 h-4 z" />
      </g>
    );
  }
  if (kind === "Magic Wand") {
    return (
      <g>
        <line x1="96" y1="132" x2="122" y2="104" stroke="#6d543c" strokeWidth="3" strokeLinecap="round" />
        <polygon points="122,100 126,108 134,110 126,114 122,122 118,114 110,110 118,106" fill="#f2c14e" stroke={INK} strokeWidth="1" />
      </g>
    );
  }
  if (kind === "Teacup") {
    return (
      <g stroke={INK} strokeWidth="1.5">
        <path d="M96 112 h22 v8 a10 10 0 0 1 -22 0 z" fill="#f7f4ee" />
        <path d="M118 116 h5 a5 5 0 0 1 0 8 h-5" fill="none" />
        <ellipse cx="107" cy="132" rx="12" ry="2.4" fill="#e7e1d6" />
      </g>
    );
  }
  return (
    <g stroke={INK} strokeWidth="1.5">
      <rect x="96" y="108" width="26" height="18" rx="2" fill="#6d543c" />
      <path d="M104 108 v-5 h12 v5" fill="none" />
      <rect x="106" y="114" width="6" height="4" fill="#e0b44a" />
    </g>
  );
}

