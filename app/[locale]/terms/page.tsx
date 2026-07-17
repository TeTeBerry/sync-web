import { notFound } from 'next/navigation';
import { isLocale } from '../../../lib/i18n';

export default async function TermsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <main className="legal-page"><section className="section legal-page__section"><div className="container legal-page__container"><header className="legal-page__header"><h1>Raven Terms</h1><p className="legal-page__intro">These terms are a launch placeholder and must be reviewed by [Company or operator name] before Raven is publicly available.</p></header><div className="legal-page__sections"><section className="legal-page__block"><h2>Using Raven</h2><p>Use Raven responsibly and only share information you are comfortable showing to the festival community. Festival schedules, travel information and third-party availability may change.</p></section><section className="legal-page__block"><h2>Contact</h2><p>Questions about these terms: [Contact email].</p></section></div></div></section></main>;
}
