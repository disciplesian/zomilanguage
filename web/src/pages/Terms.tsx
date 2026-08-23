import { SiteLayout, PageHeader, GlassCard } from '@/components/SiteLayout';
import { SUPPORT_EMAIL } from '@/lib/config';

const LAST_UPDATED = 'August 23, 2026';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-lg font-bold text-white">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-white/65">{children}</div>
    </section>
  );
}

const Terms = () => (
  <SiteLayout>
    <PageHeader eyebrow="Legal" title="Terms of Use" subtitle={`Last updated ${LAST_UPDATED}`} />

    <div className="mx-auto w-full max-w-3xl px-5 pb-20">
      <GlassCard>
        <p className="text-sm leading-relaxed text-white/70">
          These Terms govern your use of the Zomi Language Portal iPhone app, Android app and
          website (together, the "Service"). By creating an account or using the Service you agree
          to these Terms.
        </p>

        <Section title="1. Membership accounts">
          <p>
            Translation and community features are members-only. You must sign in with a Google or
            Apple account to use them. You are responsible for activity under your account and must
            keep your sign-in credentials secure. You must be at least 13 years old to register.
          </p>
        </Section>

        <Section title="2. Licence">
          <p>
            We grant you a personal, non-exclusive, non-transferable, revocable licence to use the
            Service for your own language, study, ministry, family and community purposes. You may
            not resell, sublicense, or commercially redistribute the Service or bulk translation
            output without our written permission.
          </p>
        </Section>

        <Section title="3. Acceptable use">
          <p>You agree not to:</p>
          <ul className="list-disc space-y-1.5 pl-5">
            <li>Submit unlawful, hateful, harassing, obscene or deliberately deceptive content.</li>
            <li>Upload another person's private or confidential information without their consent.</li>
            <li>
              Attempt to reverse-engineer, scrape, overload, or automate abusive access to the
              Service.
            </li>
            <li>Impersonate another person or misrepresent your affiliation to obtain verification.</li>
            <li>Use the Service to build a competing translation dataset or product.</li>
          </ul>
        </Section>

        <Section title="4. Your content">
          <p>
            You keep ownership of the text you submit and the glossary entries you create. You grant
            us a limited licence to process, store and transmit that content to operate the Service
            — including sending it to our AI processors to produce a translation, and retaining a
            record of service activity for moderation and support.
          </p>
        </Section>

        <Section title="5. Verification badges">
          <p>
            Verification recognises trusted community contributors. Badges are granted at the sole
            discretion of portal administrators, are not transferable, and may be revoked at any
            time if a member misrepresents themselves or breaches these Terms.
          </p>
        </Section>

        <Section title="6. Roles and moderation">
          <p>
            Administrators and moderators may review service activity, adjust member roles, decide
            verification requests, remove content and suspend accounts that breach these Terms.
          </p>
        </Section>

        <Section title="7. AI translation disclaimer">
          <p>
            Translations are produced by artificial intelligence and may contain errors, omissions
            or contextually inappropriate wording. The Service is a language aid, not a certified
            translation service. Do not rely on it alone for legal, medical, financial, safety-
            critical or official religious publication purposes. Always have important material
            reviewed by a qualified human translator or fluent speaker.
          </p>
        </Section>

        <Section title="8. Availability and changes">
          <p>
            We may modify, suspend or discontinue any part of the Service at any time. Features
            depend on third-party AI providers whose availability we do not control. The Service is
            currently provided free of charge; if we introduce paid plans in future, pricing and
            terms will be disclosed before you are charged.
          </p>
        </Section>

        <Section title="9. Termination">
          <p>
            You may stop using the Service and request account deletion at any time by emailing{' '}
            <a href={`mailto:${SUPPORT_EMAIL}`} className="text-[#00f0ff] underline">
              {SUPPORT_EMAIL}
            </a>
            . We may suspend or terminate accounts that breach these Terms or place the Service at
            legal or operational risk.
          </p>
        </Section>

        <Section title="10. Disclaimers and liability">
          <p>
            The Service is provided "as is" and "as available" without warranties of any kind,
            express or implied, including fitness for a particular purpose and accuracy of
            translation. To the maximum extent permitted by law, we are not liable for indirect,
            incidental, special or consequential damages, or for any loss arising from reliance on a
            translation produced by the Service.
          </p>
        </Section>

        <Section title="11. Changes to these Terms">
          <p>
            We may update these Terms. Continued use of the Service after an update means you accept
            the revised Terms. The "last updated" date above will always reflect the current
            version.
          </p>
        </Section>

        <Section title="12. Contact">
          <p>
            Questions about these Terms? Email{' '}
            <a href={`mailto:${SUPPORT_EMAIL}`} className="text-[#00f0ff] underline">
              {SUPPORT_EMAIL}
            </a>
            .
          </p>
        </Section>
      </GlassCard>
    </div>
  </SiteLayout>
);

export default Terms;
