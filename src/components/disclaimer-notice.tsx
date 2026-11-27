import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { DISCLAIMER_SECTIONS } from "@/lib/disclaimer";

export function DisclaimerNotice({
  accepted,
  onAcceptedChange,
  disabled,
  invalid,
}: {
  accepted: boolean;
  onAcceptedChange: (accepted: boolean) => void;
  disabled?: boolean;
  invalid?: boolean;
}) {
  return (
    <fieldset disabled={disabled} className="min-w-0 space-y-3 border-0 p-0">
      <legend className="text-sm font-medium">Before a code is sent</legend>
      <div
        tabIndex={0}
        role="region"
        aria-label="Service notice"
        className="max-h-40 space-y-3 overflow-y-auto overscroll-contain rounded-xl border border-border bg-card/80 px-3 py-3"
      >
        {DISCLAIMER_SECTIONS.map((section) => (
          <section key={section.heading} className="space-y-1">
            <h2 className="text-xs font-medium text-foreground">{section.heading}</h2>
            <p className="text-xs leading-relaxed text-muted-foreground">{section.body}</p>
          </section>
        ))}
      </div>
      <div className="flex items-start gap-3">
        <Checkbox
          id="disclaimer"
          checked={accepted}
          disabled={disabled}
          aria-required="true"
          aria-invalid={invalid ? true : undefined}
          aria-describedby={invalid ? "email-error" : undefined}
          className="mt-0.5"
          onCheckedChange={(value) => onAcceptedChange(value === true)}
        />
        <div className="space-y-1">
          <Label htmlFor="disclaimer" id="disclaimer-required" className="text-sm leading-snug font-normal">
            I have read this notice and I agree.
          </Label>
          <p className="text-xs leading-relaxed text-muted-foreground">
            This device remembers your agreement until the notice changes. That choice stays on the device and is
            separate from your email.
          </p>
        </div>
      </div>
    </fieldset>
  );
}
