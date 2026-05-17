import Link from "next/link";
import { CONTACT_EMAIL, COPYRIGHT_YEAR } from "@/lib/legal";

const items: { href: string; label: string; external?: boolean }[] = [
  { href: "/terms", label: "Terms" },
  { href: "/privacy", label: "Privacy" },
  { href: "/guidelines", label: "Guidelines" },
  { href: `mailto:${CONTACT_EMAIL}`, label: "Contact", external: true },
];

export function Footer() {
  return (
    <footer className="mt-auto border-t border-line bg-paper">
      <div className="wrap-wide flex flex-col items-center gap-3 py-6 sm:flex-row sm:justify-between">
        <p className="text-[11px] uppercase tracking-wider text-muted">
          © {COPYRIGHT_YEAR} Wrong. All rights reserved.
        </p>
        <nav
          aria-label="Footer"
          className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs"
        >
          {items.map((it) =>
            it.external ? (
              <a
                key={it.href}
                href={it.href}
                className="text-muted underline-offset-4 hover:text-ink hover:underline"
              >
                {it.label}
              </a>
            ) : (
              <Link
                key={it.href}
                href={it.href}
                className="text-muted underline-offset-4 hover:text-ink hover:underline"
              >
                {it.label}
              </Link>
            ),
          )}
        </nav>
      </div>
    </footer>
  );
}
