import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import {
  getMessages,
  DEFAULT_LOCALE,
  isLocale,
  type Locale,
} from '../../../lib/i18n';
import {
  absoluteAlternateLanguages,
  absoluteLocalizedUrl,
  buildSocialMetadata,
} from '../../../lib/seo';

type CookiePolicyPageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: CookiePolicyPageProps): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  const t = getMessages(locale).cookies;
  const url = absoluteLocalizedUrl(locale, '/cookies');

  return {
    title: { absolute: t.seoTitle },
    description: t.intro,
    alternates: {
      canonical: url,
      languages: absoluteAlternateLanguages('/cookies'),
    },
    robots: { index: true, follow: true },
    ...buildSocialMetadata({
      title: t.seoTitle,
      description: t.intro,
      url,
      locale,
    }),
  };
}

export default async function CookiePolicyPage({ params }: CookiePolicyPageProps) {
  const { locale: rawLocale } = await params;
  if (!isLocale(rawLocale)) notFound();

  const locale = rawLocale as Locale;
  const t = getMessages(locale).cookies;

  return (
    <main className="legal-page">
      <section className="section legal-page__section" aria-labelledby="cookie-policy-title">
        <div className="container legal-page__container">
          <header className="legal-page__header">
            <h1 id="cookie-policy-title">{t.title}</h1>
            <p className="legal-page__updated">{t.updated}</p>
            <p className="legal-page__intro">{t.intro}</p>
          </header>

          <div className="legal-page__sections">
            {t.sections.map((section) => (
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
