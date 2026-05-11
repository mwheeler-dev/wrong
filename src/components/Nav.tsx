"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

type Props = {
  user: { id: string; name: string; email: string } | null;
  isAdmin: boolean;
};

export function Nav({ user, isAdmin }: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Close drawer on route change
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Lock body scroll when drawer open
  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [open]);

  const signedIn = !!user;

  // Shared primary tabs (visible to everyone)
  const items: { href: string; label: string }[] = signedIn
    ? [
        { href: "/about", label: "About" },
        { href: "/play", label: "Play" },
        { href: "/dashboard", label: "You" },
        { href: "/leagues", label: "Leagues" },
        { href: "/leaderboards", label: "Boards" },
        ...(isAdmin ? [{ href: "/admin", label: "Admin" }] : []),
      ]
    : [
        { href: "/about", label: "About" },
        { href: "/play", label: "Play" },
        { href: "/leagues", label: "Leagues" },
        { href: "/leaderboards", label: "Boards" },
      ];

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-paper/90 backdrop-blur">
      <div className="wrap-wide flex h-14 items-center justify-between">
        <Link href="/" className="display flex items-baseline gap-0 text-2xl">
          Wrong<span className="text-accent">.</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 text-sm font-semibold sm:flex">
          {items.map((it) => (
            <NavLink key={it.href} href={it.href} active={pathname === it.href}>
              {it.label}
            </NavLink>
          ))}
          {signedIn ? (
            <form action="/api/auth/logout" method="post" className="ml-1">
              <button className="rounded-full px-3 py-2 text-muted hover:text-ink">
                Sign out
              </button>
            </form>
          ) : (
            <>
              <NavLink href="/login" active={pathname === "/login"}>
                Sign in
              </NavLink>
              <Link href="/signup" className="btn-primary ml-1 px-4 py-2 text-sm">
                Sign up
              </Link>
            </>
          )}
        </nav>

        {/* Mobile hamburger */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="-mr-2 inline-flex h-11 w-11 items-center justify-center rounded-full hover:bg-ink/5 sm:hidden"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
        >
          <span className="relative block h-3 w-5">
            <span
              className={`absolute left-0 top-0 h-[2px] w-full bg-ink transition ${open ? "translate-y-[6px] rotate-45" : ""}`}
            />
            <span
              className={`absolute bottom-0 left-0 h-[2px] w-full bg-ink transition ${open ? "-translate-y-[6px] -rotate-45" : ""}`}
            />
          </span>
        </button>
      </div>

      {/* Mobile drawer */}
      <div
        className={`fixed inset-x-0 top-14 z-40 origin-top transform border-b border-line bg-paper transition sm:hidden ${
          open ? "scale-y-100 opacity-100" : "pointer-events-none scale-y-95 opacity-0"
        }`}
      >
        <div className="wrap py-3">
          <ul className="flex flex-col">
            {items.map((it) => (
              <li key={it.href}>
                <Link
                  href={it.href}
                  className={`flex h-12 items-center rounded-2xl px-3 text-base font-semibold ${
                    pathname === it.href ? "bg-ink text-paper" : "text-ink hover:bg-ink/5"
                  }`}
                >
                  {it.label}
                </Link>
              </li>
            ))}
            {signedIn ? (
              <li>
                <form action="/api/auth/logout" method="post">
                  <button className="flex h-12 w-full items-center rounded-2xl px-3 text-base font-semibold text-muted hover:bg-ink/5">
                    Sign out
                  </button>
                </form>
              </li>
            ) : (
              <>
                <li>
                  <Link
                    href="/login"
                    className="flex h-12 items-center rounded-2xl px-3 text-base font-semibold text-ink hover:bg-ink/5"
                  >
                    Sign in
                  </Link>
                </li>
                <li className="pt-1">
                  <Link href="/signup" className="btn-primary w-full text-base">
                    Sign up
                  </Link>
                </li>
              </>
            )}
          </ul>
        </div>
      </div>
    </header>
  );
}

function NavLink({
  href,
  active,
  children,
}: {
  href: string;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`rounded-full px-3 py-2 transition ${
        active ? "text-ink" : "text-ink/70 hover:text-ink"
      }`}
    >
      {children}
    </Link>
  );
}
