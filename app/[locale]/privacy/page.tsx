import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import {
  getMessages,
  DEFAULT_LOCALE,
  isLocale,
  localizedPath,
  type Locale,
} from '../../../lib/i18n';
import {
  absoluteAlternateLanguages,
  absoluteLocalizedUrl,
  buildSocialMetadata,
} from '../../../lib/seo';

type PrivacyPageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: PrivacyPageProps): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  const t = getMessages(locale);
  const url = absoluteLocalizedUrl(locale, '/privacy');

  return {
    title: {
      absolute: t.privacy.seoTitle,
    },
    description: t.privacy.intro,
    alternates: {
      canonical: url,
      languages: absoluteAlternateLanguages('/privacy'),
    },
    robots: {
      index: true,
      follow: true,
    },
    ...buildSocialMetadata({
      title: t.privacy.seoTitle,
      description: t.privacy.intro,
      url,
      locale,
    }),
  };
}

export default async function PrivacyPage({ params }: PrivacyPageProps) {
  const { locale: rawLocale } = await params;
  if (!isLocale(rawLocale)) notFound();

  const locale = rawLocale as Locale;
  const t = getMessages(locale);

  return (
    <main className="legal-page">
      <section className="section legal-page__section" aria-labelledby="privacy-title">
        <div className="container legal-page__container">
          <header className="legal-page__header">
            <h1 id="privacy-title">{t.privacy.title}</h1>
            <p className="legal-page__updated">{t.privacy.updated}</p>
            <p className="legal-page__intro">{t.privacy.intro}</p>
          </header>

          <div className="legal-page__sections">
            {t.privacy.sections.map((section) => (
              <section className="legal-page__block" key={section.title}>
                <h2 className="legal-page__block-title">{section.title}</h2>
                <p className="legal-page__block-body">{section.body}</p>
              </section>
            ))}
            <section className="legal-page__block">
              <h2>What Raven collects</h2>
              <p>We collect the email and minimal sign-in profile supplied by Google or an email magic link, plus the schedules, plans, favorites, Squad profile and music preferences you choose to save. Home airport and city are optional; travel origin stays in the current plan unless you choose “Remember my home airport”. We do not ask for date of birth, gender, phone number, contacts, precise GPS, browser fingerprinting, or your Google Calendar, Drive, Gmail, or YouTube data.</p>
            </section>
            <section className="legal-page__block">
              <h2>How Raven uses it</h2>
              <p>We use this information to provide saved journeys, cross-device sync, festival matching and the features you request. Plan inputs may be sent to [AI providers] to generate a requested plan. We prefer structured plan inputs over retaining full free-text prompts.</p>
            </section>
            <section className="legal-page__block">
              <h2>Service providers, analytics and international processing</h2>
              <p>Raven uses Google for optional authentication and may use Vercel, [Analytics providers], [AI providers], email, hosting, maps, ticketing, flight or hotel providers where necessary. We only share data with service providers when necessary to operate Raven, provide requested features, secure the service, or comply with legal obligations. Data may be processed in [Hosting regions].</p>
            </section>
            <section className="legal-page__block">
              <h2>Retention, cookies and your choices</h2>
              <p>Necessary session cookies keep you signed in. Any non-essential analytics consent is handled according to your region. Saved data is retained for [Data retention period] unless you delete your account. You can permanently delete your account in Settings; questions can be sent to [Contact email].</p>
            </section>
          </div>
        </div>
      </section>
    </main>
  );
}
