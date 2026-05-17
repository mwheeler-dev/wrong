import { LEGAL_LAST_UPDATED } from "@/lib/legal";

type Props = {
  /** Page-level title, e.g. "Terms of Service" */
  title: string;
  /** One-line summary shown directly under the title */
  description?: string;
  /** Override the default "last updated" string */
  lastUpdated?: string;
  /** Small label above the title, defaults to "Wrong." */
  eyebrow?: string;
  children: React.ReactNode;
};

export function LegalLayout({
  title,
  description,
  lastUpdated = LEGAL_LAST_UPDATED,
  eyebrow = "Wrong.",
  children,
}: Props) {
  return (
    <article className="mx-auto w-full max-w-2xl px-5 pb-16 pt-10 sm:pt-14">
      <header>
        <p className="label">{eyebrow}</p>
        <h1 className="display mt-2 text-5xl sm:text-6xl">{title}</h1>
        {description && (
          <p className="mt-4 max-w-xl text-base text-muted sm:text-lg">
            {description}
          </p>
        )}
        <p className="mt-3 text-xs uppercase tracking-wider text-muted">
          Last updated {lastUpdated}
        </p>
      </header>

      <hr className="my-10 border-line" />

      <div className="space-y-12">{children}</div>
    </article>
  );
}
