import { Link } from "react-router-dom";
import { LegalDocumentView } from "@/components/legal-document";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { LEGAL_DOCUMENTS } from "@/lib/legal";

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
      <legend className="text-sm font-medium">Terms and privacy</legend>
      <p className="text-xs leading-relaxed text-muted-foreground">
        The full Terms of Service and the Privacy Policy and Personal Information Collection Statement are in the panel.
        The same text is also on the{" "}
        <Link to="/terms" target="_blank" rel="noopener noreferrer" className="text-primary underline-offset-4 hover:underline">
          Terms of Service page
        </Link>{" "}
        and the{" "}
        <Link to="/privacy" target="_blank" rel="noopener noreferrer" className="text-primary underline-offset-4 hover:underline">
          Privacy Policy page
        </Link>
        .
      </p>
      <div
        tabIndex={0}
        role="region"
        aria-label="Terms of Service and Privacy Policy"
        className="max-h-80 space-y-6 overflow-y-auto overscroll-contain rounded-xl border border-border bg-card/80 px-3 py-3"
      >
        {LEGAL_DOCUMENTS.map((document) => (
          <LegalDocumentView key={document.path} document={document} titleAs="h2" />
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
            I have read and agree to the Terms of Service and the Privacy Policy and Personal Information Collection
            Statement.
          </Label>
          <p className="text-xs leading-relaxed text-muted-foreground">
            This device remembers your agreement until these documents change. That choice stays on the device and is
            separate from your email.
          </p>
        </div>
      </div>
    </fieldset>
  );
}
