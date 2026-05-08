import Link from "next/link";

type Props = {
  user: { id: string; name: string; email: string } | null;
  isAdmin: boolean;
};

export function Nav({ user, isAdmin }: Props) {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-paper/85 backdrop-blur">
      <div className="wrap-wide flex h-14 items-center justify-between">
        <Link href="/" className="display text-2xl">
          Wrong<span className="text-accent">.</span>
        </Link>
        <nav className="flex items-center gap-1 text-sm font-semibold">
          {user ? (
            <>
              <NavLink href="/play">Play</NavLink>
              <NavLink href="/dashboard">You</NavLink>
              <NavLink href="/leagues">Leagues</NavLink>
              <NavLink href="/leaderboards">Boards</NavLink>
              {isAdmin && <NavLink href="/admin">Admin</NavLink>}
              <form action="/api/auth/logout" method="post">
                <button className="rounded-full px-3 py-2 text-muted hover:text-ink">
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <>
              <NavLink href="/login">Sign in</NavLink>
              <Link href="/signup" className="btn-primary ml-1 px-4 py-2 text-sm">
                Sign up
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="rounded-full px-3 py-2 text-ink/80 hover:text-ink">
      {children}
    </Link>
  );
}
