import type { Metadata } from "next";
import Link from "next/link";
import { LegalLayout } from "@/components/LegalLayout";
import { LegalSection, LegalList } from "@/components/LegalSection";
import { CONTACT_EMAIL, APP_NAME } from "@/lib/legal";

export const metadata: Metadata = {
  title: `Delete your ${APP_NAME} account`,
  description:
    "Request deletion of your Wrong. account and all associated data.",
};

// Publicly accessible — no auth required. This is the URL submitted to
// Google Play under "Delete account URL" so anyone (including someone who
// can no longer sign in) can start deletion. It reuses the LegalLayout so
// it matches /privacy, /terms, /guidelines.
export default function DeleteAccountPage() {
  return (
    <LegalLayout
      title={`Delete your ${APP_NAME} account`}
      description="Two ways to remove your Wrong. account and all associated data."
      eyebrow="Account"
    >
      <LegalSection title="Option 1 — Delete in the app" id="in-app">
        <p>
          If you can still sign in, this is the fastest way — deletion is
          immediate.
        </p>
        <LegalList
          items={[
            <>
              Open <strong>Wrong.</strong> on your phone or at{" "}
              <a href="/" className="underline">
                wrong-app.com
              </a>{" "}
              and sign in.
            </>,
            <>
              Go to{" "}
              <Link href="/dashboard/account" className="underline">
                <strong>You → Account</strong>
              </Link>
              .
            </>,
            <>
              Under <strong>Danger zone</strong>, tap{" "}
              <strong>Delete account</strong>.
            </>,
            <>
              Type <code className="rounded bg-ink/10 px-1.5 py-0.5">DELETE</code>{" "}
              in the confirmation field and tap{" "}
              <strong>Permanently delete my account</strong>.
            </>,
            "Your account and every associated record are removed immediately, and you are signed out.",
          ]}
        />
      </LegalSection>

      <LegalSection title="Option 2 — Request deletion by email" id="by-email">
        <p>
          If you can&rsquo;t sign in, or would rather have us do it, email{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className="underline">
            {CONTACT_EMAIL}
          </a>{" "}
          with the subject <strong>Delete my account</strong>.
        </p>
        <p>
          <strong>Send the request from the email address associated with
          your Wrong. account</strong> so we can verify ownership. We do not
          delete accounts based on requests from unrelated addresses.
        </p>
        <p>
          We respond and complete deletion within a reasonable timeframe —
          typically a few business days.
        </p>
      </LegalSection>

      <LegalSection title="What gets deleted" id="deleted">
        <p>
          When your account is deleted (either path above), we permanently
          remove:
        </p>
        <LegalList
          items={[
            "Your account record — name, email, hashed password, timezone, join date.",
            "Every prediction you have made (YES/NO answer, confidence level, score).",
            "The reasoning tags attached to each prediction (Research / Experience / Intuition).",
            "Every written reflection or journal entry you have saved.",
            "Your streak history, calibration data, and Thinking Profile — these are computed from records that are deleted, so they disappear with your account.",
            "Your signed-in session, immediately.",
          ]}
        />
      </LegalSection>

      <LegalSection title="What is retained" id="retained">
        <p>
          <strong>
            Nothing personally attributable to you is retained after deletion.
          </strong>{" "}
          Your predictions are erased from the database — we do not keep a
          shadow copy under &ldquo;analytics&rdquo; or any other guise.
        </p>
        <p>
          The <strong>questions</strong> you predicted on remain in the
          system (they are shared content, not tied to a single account),
          but no record of your specific answer, confidence, reasoning, or
          reflection stays behind.
        </p>
        <p>
          We may retain server logs for a short period for security and
          abuse-prevention purposes as required by our infrastructure
          providers. These logs are not organized around user identity and
          are rotated out under those providers&rsquo; retention policies.
        </p>
      </LegalSection>

      <LegalSection title="How soon" id="timing">
        <p>
          <strong>In-app deletion is immediate.</strong> The account row and
          every cascading record — predictions, reasoning tags, reflections
          — are deleted in a single database transaction and gone the
          moment the confirmation returns.
        </p>
        <p>
          <strong>Email requests</strong> are typically completed within a
          few business days of ownership verification.
        </p>
      </LegalSection>

      <LegalSection title="After deletion" id="after">
        <p>
          You are free to create a new Wrong. account any time using the
          same email address. A new account starts fresh — no prior
          predictions, streak, or history is restored.
        </p>
        <p>
          If you have questions about deletion or believe your data was
          not fully removed, contact us at{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className="underline">
            {CONTACT_EMAIL}
          </a>
          .
        </p>
      </LegalSection>
    </LegalLayout>
  );
}
