type Props = {
  /** Section heading */
  title: string;
  /** Anchor id for deep-linking (e.g. /terms#gambling) */
  id?: string;
  children: React.ReactNode;
};

export function LegalSection({ title, id, children }: Props) {
  return (
    <section id={id} className="scroll-mt-24">
      <h2 className="display text-2xl sm:text-3xl">{title}</h2>
      <div className="mt-3 space-y-3 text-base leading-relaxed text-ink/85">
        {children}
      </div>
    </section>
  );
}

/** Bulleted list inside a LegalSection. */
export function LegalList({
  items,
}: {
  items: React.ReactNode[];
}) {
  return (
    <ul className="ml-5 list-disc space-y-2 marker:text-muted">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}

/** Highlighted callout for the legally-load-bearing sentences. */
export function LegalCallout({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-2xl border border-line bg-ink/[0.03] px-4 py-3 text-base leading-relaxed text-ink">
      {children}
    </p>
  );
}
