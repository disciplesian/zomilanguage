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

const Privacy = () => (
  <SiteLayout>
    <PageHeader
      eyebrow="Legal"
      title="Privacy Policy"
      subtitle={`Last updated ${LAST_UPDATED}`}
    />

    <div className="mx-auto w-full max-w-3xl px-5 pb-20">
      <GlassCard>
        <p className="text-sm leading-relaxed text-white/70">
          Zomi Language Portal ("we", "us") provides a members-only Zomi translation service and
          community portal across our iPhone app, Android app and website. This policy explains
          what we collect, why, and the choices you have.
        </p>

        <Section title="1. Information we collect">
          <p>
            <strong className="text-white/85">Account information.</strong> When you sign in with
            Google or Apple we receive your user identifier, email address and, where you allow it,
            your display name and profile picture. We never receive your Google or Apple password.
          </p>
          <p>
            <strong className="text-white/85">Translation content.</strong> The text you submit for
            translation and the translation returned to you are processed to deliver the service and
            recorded against your account as service activity.
          </p>
          <p>
            <strong className="text-white/85">Usage and profile data.</strong> Your translation
            count, membership date, role (member, moderator or administrator), verification status
            and any reason you submit with a verification request.
          </p>
          <p>
            <strong className="text-white/85">Content you create.</strong> Personal glossary entries
            and saved translation history stored to your account so they sync between your devices.
          </p>
          <p>
            <strong className="text-white/85">Device permissions (mobile apps).</strong> With your
            permission, the microphone is used for voice input and the camera and photo library are
            used to capture or import documents for translation. This media is processed for the
            translation you requested and is not used for advertising.
          </p>
        </Section>

        <Section title="2. How we use your information">
          <ul className="list-disc space-y-1.5 pl-5">
            <li>To provide translations and read them aloud when you ask.</li>
            <li>To authenticate you and keep your account secure.</li>
            <li>To sync your history and glossary across your devices.</li>
            <li>To operate membership roles and the verification badge programme.</li>
            <li>
              To monitor service activity for abuse, spam and quality, and to improve translation
              accuracy.
            </li>
            <li>To respond to your support requests.</li>
          </ul>
          <p>We do not sell your personal information and we do not use it for advertising.</p>
        </Section>

        <Section title="3. AI processing and third-party processors">
          <p>
            Translation and speech features are powered by third-party AI providers. The text you
            submit — and, for voice features, your recorded audio — is transmitted to these
            providers to generate a result. Please do not submit sensitive personal information,
            confidential material or another person's private data for translation.
          </p>
          <p>The processors we rely on are:</p>
          <ul className="list-disc space-y-1.5 pl-5">
            <li>
              <strong className="text-white/85">Google (Gemini API)</strong> — generates
              translations from the text you submit.
            </li>
            <li>
              <strong className="text-white/85">Rork</strong> — provides authentication, application
              hosting, database storage and AI gateway services.
            </li>
            <li>
              <strong className="text-white/85">Google and Apple</strong> — provide sign-in and
              return the identity details listed above.
            </li>
          </ul>
        </Section>

        <Section title="4. Administrator access">
          <p>
            Portal administrators can see member accounts, roles, verification requests and service
            activity — including recent translation records — for moderation, support and abuse
            prevention. Administrators are bound to use this access only to operate the portal.
          </p>
        </Section>

        <Section title="5. Data sharing">
          <p>
            We share personal information only with the processors listed above, and where required
            by law, to enforce our Terms, or to protect the rights and safety of our users. We do
            not share your data with advertisers or data brokers.
          </p>
        </Section>

        <Section title="6. Retention">
          <p>
            Account records and translation history are retained while your account is active. If
            you request deletion, we remove your profile, history and glossary within 30 days,
            except where we must retain records to comply with a legal obligation.
          </p>
        </Section>

        <Section title="7. Your rights and choices">
          <p>
            You can request access to, correction of, export of, or deletion of your personal data
            at any time by emailing{' '}
            <a href={`mailto:${SUPPORT_EMAIL}`} className="text-[#00f0ff] underline">
              {SUPPORT_EMAIL}
            </a>{' '}
            from your registered address. You can also revoke camera, microphone and photo
            permissions at any time in your device settings, and sign out to end your session. See
            our <a href="/privacy-choices" className="text-[#00f0ff] underline">Your Privacy Choices</a>{' '}
            page for step-by-step instructions.
          </p>
        </Section>

        <Section title="8. Security">
          <p>
            Data is transmitted over encrypted HTTPS connections. Session tokens are stored in the
            secure keychain on iOS and in protected app storage on Android and the web. No system is
            perfectly secure, so please use a strong, unique password on your Google or Apple
            account.
          </p>
        </Section>

        <Section title="9. Children">
          <p>
            The portal is not directed to children under 13, and we do not knowingly collect
            personal information from them. If you believe a child has provided us information,
            contact us and we will delete it.
          </p>
        </Section>

        <Section title="10. International users">
          <p>
            Our service is operated with infrastructure that may process data in the United States
            and other countries. By using the portal you consent to this transfer.
          </p>
        </Section>

        <Section title="11. Changes to this policy">
          <p>
            We may update this policy as the portal grows. Material changes will be announced in the
            app and on this page with a new "last updated" date.
          </p>
        </Section>

        <Section title="12. Contact">
          <p>
            Questions about privacy? Email{' '}
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

export default Privacy;
