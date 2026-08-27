import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/session";
import { DeleteAccountForm } from "@/components/DeleteAccountForm";

export const metadata: Metadata = {
  title: "Account — Wrong.",
  description: "Manage your Wrong. account.",
};

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="wrap-wide pt-4 pb-16">
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 text-sm font-semibold text-muted hover:text-ink"
        >
          ← Back to You
        </Link>
      </div>

      <h1 className="display mt-3 text-[36px] leading-[0.95] sm:text-5xl">
        Account
      </h1>
      <p className="mt-1 text-sm text-muted">
        Signed in as{" "}
        <span className="font-semibold text-ink">{user.email}</span>.
      </p>

      <section className="mt-8">
        <p className="label">Profile</p>
        <div className="card mt-2">
          <dl className="grid grid-cols-1 gap-x-4 gap-y-2 text-sm sm:grid-cols-[auto_1fr]">
            <dt className="text-muted">Name</dt>
            <dd className="text-ink">{user.name}</dd>
            <dt className="text-muted">Email</dt>
            <dd className="text-ink">{user.email}</dd>
            <dt className="text-muted">Joined</dt>
            <dd className="text-ink">
              {new Date(user.createdAt).toLocaleDateString(undefined, {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </dd>
          </dl>
        </div>
      </section>

      {/* Destructive action zone — visually separated with a red rail so it
          can never be mistaken for a routine setting. */}
      <section className="mt-12">
        <p className="label text-bad">Danger zone</p>
        <div className="mt-2 rounded-3xl border-2 border-bad/40 bg-white p-4 shadow-[0_1px_0_rgba(0,0,0,0.04)] sm:p-5">
          <h2 className="display text-2xl">Delete account</h2>
          <p className="mt-2 text-sm text-ink/85">
            Permanently delete your Wrong. account and everything attached to
            it — predictions, reflections, reasoning tags, daily journal
            entries, streak history, and profile. This cannot be undone.
          </p>
          <p className="mt-2 text-xs text-muted">
            The public deletion page at{" "}
            <Link
              href="/delete-account"
              className="underline decoration-line underline-offset-4 hover:text-ink"
            >
              /delete-account
            </Link>{" "}
            explains this in more detail, including how to request deletion
            by email if you can&rsquo;t sign in.
          </p>
          <div className="mt-4">
            <DeleteAccountForm />
          </div>
        </div>
      </section>
    </div>
  );
}
