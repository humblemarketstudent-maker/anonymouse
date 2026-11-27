import { Link } from "react-router-dom";
import type { LegalDocument } from "@/lib/legal";

export function LegalDocumentView({
  document,
  titleAs = "h1",
}: {
  document: LegalDocument;
  titleAs?: "h1" | "h2";
}) {
  const Title = titleAs;
  const SectionHeading = titleAs === "h1" ? "h2" : "h3";
  const reading = titleAs === "h1";
  const body = reading ? "text-sm leading-relaxed text-muted-foreground" : "text-xs leading-relaxed text-muted-foreground";
  return (
    <article className={reading ? "space-y-6" : "space-y-5"}>
      <header className="space-y-1">
        <p className="text-xs font-medium tracking-wide text-primary uppercase">{document.kicker}</p>
        <Title className={reading ? "text-3xl font-semibold tracking-tight text-foreground" : "text-xl font-semibold tracking-tight text-foreground"}>
          {document.title}
        </Title>
        <p className="text-xs text-muted-foreground">Last updated: {document.updated}</p>
      </header>
      {document.sections.map((section) => (
        <section key={section.heading} className="space-y-2">
          <SectionHeading className={reading ? "text-base font-medium text-foreground" : "text-sm font-medium text-foreground"}>
            {section.heading}
          </SectionHeading>
          {section.blocks.map((block, index) =>
            block.kind === "list" ? (
              <ul key={index} className={`list-disc space-y-1.5 pl-4 ${body}`}>
                {block.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : (
              <p key={index} className={body}>
                {block.text}
              </p>
            ),
          )}
        </section>
      ))}
    </article>
  );
}

export function LegalPage({ document }: { document: LegalDocument }) {
  const other = document.path === "/terms" ? { to: "/privacy", label: "Privacy Policy" } : { to: "/terms", label: "Terms of Service" };
  return (
    <main className="relative min-h-dvh bg-background">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(ellipse_at_top,color-mix(in_oklch,var(--primary)_14%,transparent),transparent_70%)]" />
      <div className="relative mx-auto w-full max-w-2xl px-5 py-8">
        <Link to="/enter" className="text-sm text-primary underline-offset-4 hover:underline">
          Back to sign in
        </Link>
        <div className="mt-6">
          <LegalDocumentView document={document} />
        </div>
        <p className="mt-8 text-sm text-muted-foreground">
          <Link to={other.to} className="text-primary underline-offset-4 hover:underline">
            {other.label}
          </Link>
        </p>
      </div>
    </main>
  );
}
