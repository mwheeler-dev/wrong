import { AuthForm } from "@/components/AuthForm";

// Intentionally does NOT auto-redirect logged-out users (or anyone) to /play.
// /play is the only place that gates on auth state. /login always renders the form.
export const dynamic = "force-dynamic";

type Props = {
  searchParams: { deleted?: string };
};

export default function LoginPage({ searchParams }: Props) {
  const justDeleted = searchParams?.deleted === "1";
  return (
    <>
      {justDeleted && (
        // Post-deletion confirmation banner. The API has already cleared
        // the session cookie by the time the user lands here, so any
        // subsequent authenticated request would 401. This is UI only.
        <div className="wrap pt-6" role="status" aria-live="polite">
          <div className="rounded-2xl border border-line bg-ink/[0.03] px-4 py-3 text-sm text-ink">
            Your account has been deleted. All predictions, reflections, and
            history tied to it are gone. You&rsquo;re free to make a new
            account any time.
          </div>
        </div>
      )}
      <AuthForm mode="login" />
    </>
  );
}
