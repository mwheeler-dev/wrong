import type { Metadata } from "next";
import { LegalLayout } from "@/components/LegalLayout";
import {
  LegalSection,
  LegalList,
} from "@/components/LegalSection";
import { CONTACT_EMAIL } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Privacy Policy — Wrong.",
  description: "What we collect, why, and what you can do about it.",
};

export default function PrivacyPage() {
  return (
    <LegalLayout
      title="Privacy Policy"
      description="We try to collect as little as possible. Here's what we actually keep, and why."
    >
      <LegalSection title="What we collect" id="collected">
        <p>
          We collect the information you provide directly and a small amount of
          technical information needed to operate the Service. We do not buy or
          sell personal data.
        </p>
      </LegalSection>

      <LegalSection title="Account data" id="account-data">
        <p>
          When you sign up, we store your <strong>name</strong>, your{" "}
          <strong>email address</strong>, and a{" "}
          <strong>one-way hashed password</strong>. Your password is never
          stored in plain text and cannot be recovered from the hash. We also
          store the date your account was created.
        </p>
      </LegalSection>

      <LegalSection title="Predictions and reflections" id="predictions">
        <p>
          We store the predictions you submit (your YES/NO answer and
          confidence) and any reflection text you optionally write at the end
          of a daily round. These are tied to your account so we can show you
          your history, compute your stats, and aggregate crowd statistics on
          each question.
        </p>
      </LegalSection>

      <LegalSection title="Analytics and cookies" id="analytics">
        <p>
          We use a single <strong>httpOnly cookie</strong> to keep you signed
          in. We do not use third-party advertising trackers. We may use basic,
          privacy-respecting analytics (such as aggregated page-view counts) to
          understand how the Service is used. Those analytics do not identify
          individual users.
        </p>
      </LegalSection>

      <LegalSection title="How we use your data" id="use">
        <p>We use your data to:</p>
        <LegalList
          items={[
            "operate your account and keep you signed in",
            "show you your predictions, history, and stats",
            "show crowd statistics after you've answered a question",
            "send transactional emails (e.g., account-related notices)",
            "investigate abuse and enforce our Terms and Community Guidelines",
          ]}
        />
        <p>
          <strong>We do not sell your data.</strong>
        </p>
      </LegalSection>

      <LegalSection title="Third-party services" id="third-parties">
        <p>
          We rely on a small number of infrastructure providers to operate the
          Service — primarily a hosting provider and a managed database. These
          providers process data on our behalf under their own privacy and
          security terms. We pick providers that meet reasonable industry
          standards.
        </p>
      </LegalSection>

      <LegalSection title="Data retention" id="retention">
        <p>
          We retain your account data and predictions for as long as your
          account is active. If you delete your account, we delete your
          personal data and predictions within <strong>30 days</strong>, except
          where we&apos;re required to retain limited information for legal,
          security, or fraud-prevention reasons.
        </p>
      </LegalSection>

      <LegalSection title="Deletion and access requests" id="deletion">
        <p>
          You can request deletion of your account or a copy of your data at
          any time by emailing us at{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className="underline">
            {CONTACT_EMAIL}
          </a>
          . We respond within a reasonable timeframe.
        </p>
      </LegalSection>

      <LegalSection title="Changes to this policy" id="changes">
        <p>
          We may update this Privacy Policy from time to time. If we make
          material changes, we&apos;ll update the &ldquo;last updated&rdquo;
          date at the top of this page and, where reasonable, notify you in the
          app.
        </p>
      </LegalSection>

      <LegalSection title="Contact" id="contact">
        <p>
          Privacy questions, deletion requests, or data access requests? Reach
          us at{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className="underline">
            {CONTACT_EMAIL}
          </a>
          .
        </p>
      </LegalSection>
    </LegalLayout>
  );
}
