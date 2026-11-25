import { heatBars, HEAT_BAR_COUNT } from "@/lib/heat";
import { cn } from "@/lib/utils";

/** Five emerald bars on slate. Filled from the left by recent room activity. */
export function HeatRadar({ count }: { count: number }) {
  const filled = heatBars(count);
  const noun = count === 1 ? "message" : "messages";
  const label = `Activity ${filled} of ${HEAT_BAR_COUNT}. ${count} ${noun} in the last 24 hours.`;
  return (
    <span className="inline-flex items-center gap-1.5" title={label}>
      <span className="inline-flex items-center gap-[3px]" role="img" aria-label={label}>
        {Array.from({ length: HEAT_BAR_COUNT }, (_, index) => (
          <span
            key={index}
            className={cn("h-3 w-1.5 rounded-[2px]", index < filled ? "bg-primary" : "bg-slate-700")}
          />
        ))}
      </span>
      <span className="text-[10px] tracking-wide text-slate-400">24h</span>
    </span>
  );
}
