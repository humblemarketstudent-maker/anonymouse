import { useState } from "react";
import { Link } from "react-router-dom";
import { Mark } from "@/components/mark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AdminAlert, AuditEntry, QuarantineItem } from "@/moderation/journal";

const TOKEN_KEY = "anonymouse.adminToken";

async function loadAdmin(token: string, path: string): Promise<Response> {
  return fetch(path, { headers: { authorization: `Bearer ${token}` } });
}

export function AdminScreen() {
  const [token, setToken] = useState(() => sessionStorage.getItem(TOKEN_KEY) ?? "");
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [alerts, setAlerts] = useState<AdminAlert[]>([]);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [held, setHeld] = useState<QuarantineItem[]>([]);
  const [busy, setBusy] = useState(false);

  async function refresh(next = token) {
    if (!next) return;
    setBusy(true);
    setError(null);
    try {
      const [alertRes, auditRes, holdRes] = await Promise.all([
        loadAdmin(next, "/api/moderation/admin/alerts"),
        loadAdmin(next, "/api/moderation/admin/audit"),
        loadAdmin(next, "/api/moderation/admin/quarantine"),
      ]);
      if (alertRes.status === 401 || auditRes.status === 401) {
        setError("That token was refused.");
        setAlerts([]);
        setAudit([]);
        setHeld([]);
        return;
      }
      if (!alertRes.ok || !auditRes.ok || !holdRes.ok) {
        setError("The moderation agent is not reachable on this origin.");
        return;
      }
      const alertBody = (await alertRes.json()) as { alerts: AdminAlert[] };
      const auditBody = (await auditRes.json()) as { audit: AuditEntry[] };
      const holdBody = (await holdRes.json()) as { quarantine: QuarantineItem[] };
      setAlerts(alertBody.alerts ?? []);
      setAudit(auditBody.audit ?? []);
      setHeld(holdBody.quarantine ?? []);
    } catch {
      setError("The moderation agent is not reachable on this origin.");
    } finally {
      setBusy(false);
    }
  }

  async function resolve(id: string, action: "allow" | "remove") {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/moderation/admin/quarantine/${encodeURIComponent(id)}/${action}`, {
        method: "POST",
        headers: { authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        setError("That hold could not be updated.");
        return;
      }
      await refresh(token);
    } catch {
      setError("The moderation agent is not reachable on this origin.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="flex items-center justify-between gap-3 border-b px-4 py-3">
        <div className="flex items-center gap-2.5">
          <Mark className="size-8" />
          <div>
            <h1 className="text-base font-semibold tracking-tight">Moderation</h1>
            <p className="text-[11px] text-muted-foreground">Session hashes only. Previews are masked.</p>
          </div>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link to="/">Back</Link>
        </Button>
      </header>
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-5">
        <form
          className="flex flex-col gap-2 sm:flex-row"
          onSubmit={(event) => {
            event.preventDefault();
            const next = draft.trim();
            sessionStorage.setItem(TOKEN_KEY, next);
            setToken(next);
            void refresh(next);
          }}
        >
          <Input
            type="password"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Admin token"
            aria-label="Admin token"
            autoComplete="off"
            className="sm:max-w-sm"
          />
          <Button type="submit" disabled={busy}>
            Unlock
          </Button>
          <Button type="button" variant="outline" disabled={busy || !token} onClick={() => void refresh()}>
            Refresh
          </Button>
        </form>
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <section className="space-y-2">
          <h2 className="text-sm font-semibold tracking-tight">Alerts</h2>
          {alerts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No alerts yet.</p>
          ) : (
            <ul className="space-y-2">
              {alerts.map((alert) => (
                <li key={alert.id} className="rounded-lg border border-border bg-card px-3 py-2 text-sm">
                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                    <span className="font-semibold tracking-wide text-primary uppercase">{alert.severity}</span>
                    <time dateTime={new Date(alert.ts).toISOString()}>{new Date(alert.ts).toLocaleString()}</time>
                    <span>{alert.channelId}</span>
                    <span>{alert.actorHash}</span>
                  </div>
                  <p className="mt-1">{alert.reason}</p>
                  <p className="mt-1 text-muted-foreground">{alert.preview}</p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-semibold tracking-tight">Quarantine</h2>
          {held.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing is held.</p>
          ) : (
            <ul className="space-y-2">
              {held.map((item) => (
                <li key={item.id} className="rounded-lg border border-border bg-card px-3 py-2 text-sm">
                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                    <span className="font-semibold tracking-wide text-primary uppercase">{item.status}</span>
                    <span>{item.mime}</span>
                    <span>{item.name}</span>
                    <span>{item.actorHash}</span>
                  </div>
                  <p className="mt-1 text-muted-foreground">{item.preview}</p>
                  {item.status === "pending" ? (
                    <div className="mt-2 flex gap-2">
                      <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => void resolve(item.id, "allow")}>
                        Allow
                      </Button>
                      <Button type="button" size="sm" variant="destructive" disabled={busy} onClick={() => void resolve(item.id, "remove")}>
                        Remove
                      </Button>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-semibold tracking-tight">Audit log</h2>
          {audit.length === 0 ? (
            <p className="text-sm text-muted-foreground">No audit entries yet.</p>
          ) : (
            <ul className="space-y-2">
              {audit.map((entry) => (
                <li key={entry.id} className="rounded-lg border border-border px-3 py-2 text-sm">
                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                    <time dateTime={new Date(entry.ts).toISOString()}>{new Date(entry.ts).toLocaleString()}</time>
                    <span className="font-semibold text-foreground">{entry.action}</span>
                    <span>{entry.rule}</span>
                    <span>{entry.confidence.toFixed(2)}</span>
                    <span>{entry.actorHash}</span>
                    <span>{entry.channelId}</span>
                  </div>
                  <p className="mt-1 text-muted-foreground">{entry.preview}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
