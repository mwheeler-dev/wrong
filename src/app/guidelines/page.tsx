import type { Metadata } from "next";
import { LegalLayout } from "@/components/LegalLayout";
import { LegalSection } from "@/components/LegalSection";
import { CONTACT_EMAIL } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Community Guidelines — Wrong.",
  description: "What's not allowed on Wrong., and how we enforce it.",
};

export default function GuidelinesPage() {
  return (
    <LegalLayout
      title="Community Guidelines"
      description="Wrong. works because people are honest about what they think will happen. Here's what's not allowed."
    >
      <LegalSection title="Harassment" id="harassment">
        <p>
          No targeted harassment of other users. No pile-ons, no aggressive
          replies, no following someone around the Service.
        </p>
      </LegalSection>

      <LegalSection title="Hate speech" id="hate-speech">
        <p>
          No content that promotes hatred or violence against people based on
          race, ethnicity, national origin, religion, sexual orientation, gender
          identity, disability, or any similar characteristic.
        </p>
      </LegalSection>

      <LegalSection title="Threats" id="threats">
        <p>
          No threats of violence or harm directed at any person or group. This
          includes implied threats and statements that a reasonable person would
          read as threatening.
        </p>
      </LegalSection>

      <LegalSection title="Spam" id="spam">
        <p>
          No off-topic posting, no repetitive content, no promotional content,
          no link manipulation. Wrong. is not a billboard.
        </p>
      </LegalSection>

      <LegalSection title="Impersonation" id="impersonation">
        <p>
          Don&apos;t pretend to be someone you&apos;re not — another user, a
          public figure, or a Wrong. team member. Parody is fine when it&apos;s
          clearly labelled and not deceptive.
        </p>
      </LegalSection>

      <LegalSection title="Illegal content" id="illegal">
        <p>
          No content that is illegal where you live or where we operate. This
          includes content that exploits minors, infringes intellectual
          property, or violates applicable laws.
        </p>
      </LegalSection>

      <LegalSection title="Doxxing" id="doxxing">
        <p>
          Do not post anyone&apos;s private personal information — addresses,
          phone numbers, financial details, or anything not publicly shared —
          without their explicit consent.
        </p>
      </LegalSection>

      <LegalSection title="Manipulation and abuse" id="manipulation">
        <p>
          Do not exploit bugs, run bots, create multiple accounts to game
          leaderboards or streaks, or otherwise abuse the Service in ways that
          hurt other users or distort the crowd signal.
        </p>
      </LegalSection>

      <LegalSection title="Enforcement" id="enforcement">
        <p>
          Violating these Guidelines can result in content removal, account
          suspension, or account termination. We use judgment. If you&apos;re
          not sure whether something is okay, it probably isn&apos;t.
        </p>
        <p>
          Need to report something? Email{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className="underline">
            {CONTACT_EMAIL}
          </a>
          .
        </p>
      </LegalSection>
    </LegalLayout>
  );
}
