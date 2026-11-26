import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { backend } from "@/backend";
import { emailSignInError, normalizeEmail } from "@/backend/email";
import { Mark } from "@/components/mark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AuthScreen() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [emailLabel, setEmailLabel] = useState("");
  const [step, setStep] = useState<"contact" | "code">("contact");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const verifying = useRef(false);

  async function requestCode(event?: FormEvent) {
    event?.preventDefault();
    setError(null);
    const parsed = normalizeEmail(email);
    if (!parsed) {
      setError(emailSignInError(email));
      return;
    }
    setBusy(true);
    const result = await backend.requestOtp({ contact: parsed });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setEmailLabel(parsed);
    setCode("");
    setStep("code");
  }

  const verify = useCallback(
    async (nextCode: string) => {
      if (verifying.current) return;
      verifying.current = true;
      setBusy(true);
      setError(null);
      const result = await backend.verifyOtp(nextCode);
      verifying.current = false;
      setBusy(false);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      navigate(result.needsProfile ? "/setup" : "/", { replace: true });
    },
    [navigate],
  );

  useEffect(() => {
    if (step !== "code" || code.length !== 6) return;
    const timer = window.setTimeout(() => {
      void verify(code);
    }, 280);
    return () => window.clearTimeout(timer);
  }, [code, step, verify]);

  return (
    <main className="relative min-h-dvh overflow-x-hidden bg-background">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[460px] bg-[radial-gradient(ellipse_at_top,color-mix(in_oklch,var(--primary)_16%,transparent),transparent_62%)]" />
      <div className="relative mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 py-12">
        <div className="my-auto">
          <Mark className="size-16" />
          <h1 className="mt-5 text-4xl font-semibold tracking-tight">Anonymouse</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Anonymous rooms and private lines. No names, no faces, no resumes.
          </p>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            We'll send a one-time code to this email.
          </p>

          {step === "contact" ? (
            <form className="mt-8 space-y-4" onSubmit={(event) => void requestCode(event)}>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  value={email}
                  placeholder="you@example.com"
                  className="h-11"
                  aria-invalid={error ? true : undefined}
                  aria-describedby={error ? "email-error" : undefined}
                  disabled={busy}
                  required
                  onChange={(event) => {
                    setEmail(event.target.value);
                    setError(null);
                  }}
                />
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Used only to sign you back in on this device. It never appears on a profile, in a room, or in a message.
                </p>
              </div>
              {error ? (
                <p id="email-error" className="text-sm text-destructive">
                  {error}
                </p>
              ) : null}
              <Button type="submit" className="h-11 w-full" disabled={busy}>
                {busy ? "Sending…" : "Send code"}
              </Button>
            </form>
          ) : (
            <form
              className="mt-8 space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                if (code.length === 6 && !busy) void verify(code);
              }}
            >
              <div className="space-y-2">
                <Label>Verification code</Label>
                <OtpBoxes
                  value={code}
                  onChange={(next) => {
                    setCode(next);
                    setError(null);
                  }}
                  disabled={busy}
                />
                <p className="text-xs text-muted-foreground">
                  Signing in as <span className="font-medium text-foreground">{emailLabel}</span>. Enter the one-time code
                  sent to that email.
                </p>
              </div>
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
              <Button type="submit" className="h-11 w-full" disabled={busy || code.length !== 6}>
                {busy ? "Checking…" : "Continue"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => {
                  setStep("contact");
                  setCode("");
                  setError(null);
                }}
              >
                Use a different email
              </Button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}

function OtpBoxes({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
}) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const chars = Array.from({ length: 6 }, (_, index) => value[index] ?? "");

  function apply(next: string, focusIndex: number) {
    const clean = next.replace(/\D/g, "").slice(0, 6);
    onChange(clean);
    refs.current[Math.min(focusIndex, 5)]?.focus();
  }

  return (
    <div
      className="flex gap-2"
      onPaste={(event) => {
        const text = event.clipboardData.getData("text");
        if (!/\d/.test(text)) return;
        event.preventDefault();
        apply(text, Math.min(text.replace(/\D/g, "").length, 5));
      }}
    >
      {chars.map((char, index) => (
        <Input
          key={index}
          ref={(node) => {
            refs.current[index] = node;
          }}
          value={char}
          disabled={disabled}
          inputMode="numeric"
          autoComplete={index === 0 ? "one-time-code" : "off"}
          aria-label={`Digit ${index + 1}`}
          className="h-12 w-full px-0 text-center text-lg tabular-nums"
          onChange={(event) => {
            const raw = event.target.value.replace(/\D/g, "");
            if (!raw) {
              apply(value.slice(0, index) + value.slice(index + 1), index);
              return;
            }
            const next = (value.slice(0, index) + raw + value.slice(index + raw.length)).replace(/\D/g, "").slice(0, 6);
            apply(next, index + raw.length);
          }}
          onKeyDown={(event) => {
            if (event.key === "Backspace" && !chars[index] && index > 0) {
              event.preventDefault();
              apply(value.slice(0, index - 1) + value.slice(index), index - 1);
            }
            if (event.key === "ArrowLeft" && index > 0) refs.current[index - 1]?.focus();
            if (event.key === "ArrowRight" && index < 5) refs.current[index + 1]?.focus();
          }}
        />
      ))}
    </div>
  );
}
