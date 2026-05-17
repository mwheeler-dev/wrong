import type { Metadata } from "next";
import Link from "next/link";
import { LegalLayout } from "@/components/LegalLayout";
import {
  LegalSection,
  LegalList,
  LegalCallout,
} from "@/components/LegalSection";
import {
  CONTACT_EMAIL,
  TOS_HIGHLIGHT_GAMBLING,
  TOS_HIGHLIGHT_PREDICTIONS,
} from "@/lib/legal";

export const metadata: Metadata = {
  title: "Terms of Service — Wrong.",
  description: "The rules of the road for using Wrong.",
};

export default function TermsPage() {
  return (
    <LegalLayout
      title="Terms of Service"
      description="The short version: be honest, be decent, and don't treat predictions as advice."
    >
      <LegalSection title="Acceptance of terms" id="acceptance">
        <p>
          By creating an account or using Wrong. (the &ldquo;Service&rdquo;), you
          agree to these Terms. If you don&apos;t agree, please don&apos;t use
          the Service.
        </p>
      </LegalSection>

      <LegalSection title="Eligibility" id="eligibility">
        <p>
          You must be at least <strong>13 years old</strong> to use Wrong. By
          using the Service, you confirm that you meet this age requirement. If
          you&apos;re under the age of majority where you live, you also confirm
          that a parent or guardian has reviewed these Terms with you.
        </p>
      </LegalSection>

      <LegalSection title="User accounts" id="accounts">
        <p>
          You&apos;re responsible for keeping your account credentials secure
          and for everything that happens through your account. You agree to
          provide accurate information when you sign up and to update it if it
          changes.
        </p>
      </LegalSection>

      <LegalSection title="User-generated content" id="content">
        <p>
          Wrong. lets you submit predictions and short reflections.{" "}
          <strong>You retain ownership of what you write.</strong> By submitting
          content, you grant Wrong. a non-exclusive, worldwide, royalty-free
          license to use, store, display, and process it for the purpose of
          operating the Service — including showing your predictions in
          aggregate or anonymous form (for example, crowd statistics on a
          question).
        </p>
      </LegalSection>

      <LegalSection title="Prohibited conduct" id="prohibited">
        <p>You agree not to:</p>
        <LegalList
          items={[
            "harass, threaten, or abuse other users",
            "post hate speech, slurs, or content that targets people based on identity",
            "impersonate any person or entity",
            "post spam, advertising, or off-topic content",
            "attempt to break, exploit, or abuse the Service",
            "use Wrong. for any illegal purpose",
          ]}
        />
        <p>
          See the{" "}
          <Link href="/guidelines" className="underline">
            Community Guidelines
          </Link>{" "}
          for the full list.
        </p>
      </LegalSection>

      <LegalSection title="Prediction disclaimer" id="prediction-disclaimer">
        <LegalCallout>{TOS_HIGHLIGHT_PREDICTIONS}</LegalCallout>
        <p>
          Don&apos;t make financial, legal, medical, or other consequential
          decisions based on what you see on Wrong. Predictions reflect what
          users think might happen — not what will happen, and not what you
          should do about it.
        </p>
      </LegalSection>

      <LegalSection title="No gambling" id="gambling">
        <LegalCallout>{TOS_HIGHLIGHT_GAMBLING}</LegalCallout>
        <p>
          The Service does not accept, hold, or disburse funds related to
          predictions. The point system on Wrong. has no monetary value and
          cannot be exchanged for cash or anything of value.
        </p>
      </LegalSection>

      <LegalSection title="Intellectual property" id="ip">
        <p>
          The Wrong. name, logo, design, code, and other materials are owned by
          us. You may not copy, reproduce, or use them outside the Service
          without permission.
        </p>
      </LegalSection>

      <LegalSection title="Termination" id="termination">
        <p>
          You may delete your account at any time. We may suspend or terminate
          your account if you violate these Terms or the Community Guidelines,
          with or without notice.
        </p>
      </LegalSection>

      <LegalSection title="Limitation of liability" id="liability">
        <p>
          Wrong. is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo;
          without warranties of any kind. To the maximum extent permitted by
          law, Wrong. and its operators are not liable for any indirect,
          incidental, special, consequential, or punitive damages arising from
          your use of the Service.
        </p>
      </LegalSection>

      <LegalSection title="Changes to these terms" id="changes">
        <p>
          We may update these Terms from time to time. If we make material
          changes, we&apos;ll update the &ldquo;last updated&rdquo; date at the
          top of this page and, where reasonable, notify you in the app or by
          email. Continued use of the Service after changes take effect
          constitutes acceptance.
        </p>
      </LegalSection>

      <LegalSection title="Contact" id="contact">
        <p>
          Questions about these Terms? Reach us at{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className="underline">
            {CONTACT_EMAIL}
          </a>
          .
        </p>
      </LegalSection>
    </LegalLayout>
  );
}
