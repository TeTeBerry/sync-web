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
          </div>
        </div>
      </section>
    </main>
  );
}
