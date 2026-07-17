import type { Activity } from '../lib/types';
import { getFestivalOfficialData } from '../lib/festival-officials';
import { type Locale } from '../lib/i18n';

type OfficialFestivalLinksProps = {
  activity: Activity;
  locale: Locale;
};

function formatOfferPrice(price: number, currency: string | undefined, locale: Locale): string {
  if (!currency) return String(price);
  try {
    return new Intl.NumberFormat(locale === 'zh' ? 'zh-CN' : 'en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(price);
  } catch {
    return `${price} ${currency}`;
  }
}

export function OfficialFestivalLinks({ activity, locale }: OfficialFestivalLinksProps) {
  const official = getFestivalOfficialData(activity);
  const officialUrl = official?.officialUrl || undefined;
  const ticketUrl = activity.externalUrl?.trim() || official?.ticketUrl;
  const offers = (activity.ticketOffers ?? []).filter(
    (offer) => offer.price != null && offer.price > 0 && offer.currency,
  );

  if (!officialUrl && !ticketUrl && !offers.length) return null;

  const zh = locale === 'zh';
  return (
    <section className="detail-official" aria-labelledby="official-festival-heading" data-reveal>
      <div className="container">
        <div className="detail-official__inner">
          <p className="detail-official__kicker">{zh ? '官方来源' : 'Official source'}</p>
          <h2 id="official-festival-heading" className="detail-official__title">
            {zh ? '官方信息与票务' : 'Official information & tickets'}
          </h2>
          <p className="detail-official__lead">
            {zh
              ? '链接来自活动官方或官方授权票务页面。价格仅在官方数据明确提供时展示。'
              : 'Links come from the festival or an official ticketing page. Prices appear only when supplied by verified catalog data.'}
          </p>

          <div className="detail-official__links">
            {officialUrl ? (
              <a href={officialUrl} target="_blank" rel="noopener noreferrer">
                <span>{zh ? '官方网站' : 'Official website'}</span>
                <strong>{official?.organizer ?? activity.name}</strong>
              </a>
            ) : null}
            {ticketUrl ? (
              <a href={ticketUrl} target="_blank" rel="noopener noreferrer">
                <span>{zh ? '官方购票 / 售票信息' : 'Official tickets / sales info'}</span>
                <strong>{zh ? '前往官方页面' : 'Open official page'}</strong>
              </a>
            ) : null}
            {offers.map((offer, index) => (
              <a
                href={offer.url || ticketUrl || officialUrl || '#'}
                target="_blank"
                rel="noopener noreferrer"
                key={`${offer.name ?? 'offer'}-${index}`}
              >
                <span>{offer.name ?? (zh ? '官方票种' : 'Official ticket')}</span>
                <strong>{formatOfferPrice(offer.price!, offer.currency, locale)}</strong>
              </a>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
