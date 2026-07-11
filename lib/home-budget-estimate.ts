import { displayCurrencyForLocale, formatDisplayMoney, formatDisplayMoneyRange, toDisplayAmount } from './raven-currency';
import { eventSlug } from './event-slug';
import type { Locale } from './i18n';
import type { Activity } from './types';

export type FestivalBudgetEstimate = {
  festivalId: string;
  festivalSlug: string;
  festivalName: string;
  festivalCity: string;
  festivalCountry: string;
  departureCity: string;
  currency: 'CNY' | 'USD';
  tripNights: number;
  totalEstimate: number;
  minEstimate: number;
  maxEstimate: number;
  breakdown: { ticket: number; flight: number; hotel: number; foodAndLocalTransport: number };
  isFallbackEstimate: true;
};

export type HomepageEstimateContext = Pick<
  FestivalBudgetEstimate,
  'currency' | 'tripNights' | 'totalEstimate' | 'breakdown'
>;

export function parseHomepageEstimateContext(input: {
  estimate?: string;
  nights?: string;
  currency?: string;
  breakdown?: string;
}): HomepageEstimateContext | null {
  const totalEstimate = Number(input.estimate);
  const tripNights = Number(input.nights);
  const currency = input.currency === 'USD' || input.currency === 'CNY' ? input.currency : null;
  if (!currency || !Number.isFinite(totalEstimate) || totalEstimate <= 0 || !Number.isInteger(tripNights) || tripNights <= 0) return null;
  try {
    const breakdown = JSON.parse(input.breakdown ?? '') as FestivalBudgetEstimate['breakdown'];
    const values = [breakdown?.ticket, breakdown?.flight, breakdown?.hotel, breakdown?.foodAndLocalTransport];
    if (!values.every((value) => typeof value === 'number' && Number.isFinite(value) && value >= 0)) return null;
    return { currency, tripNights, totalEstimate, breakdown };
  } catch {
    return null;
  }
}

function nightsFor(activity: Activity): number {
  if (activity.startDate && activity.endDate) {
    const days = Math.round((Date.parse(activity.endDate) - Date.parse(activity.startDate)) / 86_400_000);
    if (Number.isFinite(days) && days >= 0) return Math.min(7, Math.max(2, days + 2));
  }
  return activity.region === 'overseas' ? 5 : 3;
}

function cityWeight(value: string): number {
  return [...value.trim().toLocaleLowerCase()].reduce((sum, char) => sum + char.codePointAt(0)!, 0) % 9;
}

/** A transparent, deterministic homepage estimate until a lightweight quote endpoint exists. */
export function buildFallbackFestivalBudgetEstimate(
  activity: Activity,
  departureCity: string,
  locale: Locale,
): FestivalBudgetEstimate {
  const nights = nightsFor(activity);
  const regionalFlight = activity.region === 'overseas' ? 6_200 : activity.region === 'hmt' ? 2_100 : 1_250;
  const cityFactor = cityWeight(departureCity) * 180;
  const ticket = activity.region === 'overseas' ? 2_400 : 1_200;
  const flight = regionalFlight + cityFactor;
  const hotel = nights * (activity.region === 'overseas' ? 920 : 580);
  const foodAndLocalTransport = nights * (activity.region === 'overseas' ? 340 : 240);
  const total = ticket + flight + hotel + foodAndLocalTransport;
  const currency = displayCurrencyForLocale(locale);
  const city = activity.city ?? activity.location?.split(/[·,，]/)[0] ?? '';
  const country = activity.area ?? (activity.region === 'overseas' ? 'International' : 'China');

  return {
    festivalId: String(activity.legacyId),
    festivalSlug: eventSlug(activity, locale),
    festivalName: activity.title ?? activity.name,
    festivalCity: city,
    festivalCountry: country,
    departureCity: departureCity.trim(),
    currency,
    tripNights: nights,
    totalEstimate: toDisplayAmount(total, 'CNY', locale),
    minEstimate: toDisplayAmount(Math.round(total * 0.85), 'CNY', locale),
    maxEstimate: toDisplayAmount(Math.round(total * 1.26), 'CNY', locale),
    breakdown: {
      ticket: toDisplayAmount(ticket, 'CNY', locale),
      flight: toDisplayAmount(flight, 'CNY', locale),
      hotel: toDisplayAmount(hotel, 'CNY', locale),
      foodAndLocalTransport: toDisplayAmount(foodAndLocalTransport, 'CNY', locale),
    },
    isFallbackEstimate: true,
  };
}

export function formatEstimateMoney(amount: number, currency: FestivalBudgetEstimate['currency'], locale: Locale): string {
  return formatDisplayMoney(amount, currency, locale, { approx: false });
}

export function formatEstimateRange(estimate: FestivalBudgetEstimate, locale: Locale): string {
  return formatDisplayMoneyRange(estimate.minEstimate, estimate.maxEstimate, estimate.currency, locale, { approx: false });
}
