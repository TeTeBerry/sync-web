import type {
  BudgetLevel,
  FestivalSquadProfile,
  LookingForIntent,
  SquadMatch,
} from '../../lib/festival-squad';
import type { Locale, Messages } from '../../lib/i18n';

export type SquadCopy = Messages['festivalSquad'];

export function formatSquadDate(value: string, locale: Locale): string {
  const t = Date.parse(value);
  if (!Number.isFinite(t)) return value;
  return new Intl.DateTimeFormat(locale === 'zh' ? 'zh-CN' : 'en-US', {
    month: 'short',
    day: 'numeric',
  }).format(new Date(t));
}

export function lookingLabel(intent: LookingForIntent, copy: SquadCopy): string {
  if (intent === 'festival_buddy') return copy.filters.festivalBuddy;
  if (intent === 'roommate') return copy.filters.roommate;
  if (intent === 'ride_share') return copy.filters.rideShare;
  return copy.filters.travelGroup;
}

export function budgetLabel(level: BudgetLevel, copy: SquadCopy): string {
  if (level === 'budget') return copy.filters.budgetLevel;
  if (level === 'premium') return copy.filters.premium;
  return copy.filters.comfort;
}

export function stayLabel(profile: FestivalSquadProfile, copy: SquadCopy): string {
  if (profile.accommodationName && profile.visibility.showAccommodationName) {
    return profile.accommodationName;
  }
  if (profile.accommodationType === 'dreamville' || profile.accommodationType === 'camping') {
    return copy.filters.dreamville;
  }
  if (profile.accommodationType === 'hotel') return copy.filters.hotel;
  if (profile.accommodationType === 'hostel') return copy.filters.hostel;
  return copy.filters.notDecided;
}

export function originLabel(profile: FestivalSquadProfile): string {
  if (profile.visibility.showCountryOnly && profile.originCountry) {
    return profile.originCountry;
  }
  if (profile.visibility.showExactCity) {
    return [profile.originCity, profile.originCountry].filter(Boolean).join(', ');
  }
  return profile.originCountry || profile.originCity;
}

export function matchAffinityText(match: SquadMatch, copy: SquadCopy): string {
  if (match.sparseData || match.label === 'sparse') {
    return copy.card.basedOn.replace('{count}', String(match.sharedPreferenceCount));
  }
  return copy.labels[match.label];
}

export function journeyPathParts(
  profile: Pick<
    FestivalSquadProfile,
    'originCity' | 'originCountry' | 'arrivalDate' | 'departureDate' | 'accommodationType' | 'accommodationName' | 'budgetLevel' | 'favoriteArtists' | 'visibility'
  >,
  locale: Locale,
  copy: SquadCopy,
): string[] {
  const origin = [profile.originCity, profile.originCountry].filter(Boolean).join(', ');
  const dates =
    profile.arrivalDate && profile.departureDate
      ? `${formatSquadDate(profile.arrivalDate, locale)} – ${formatSquadDate(profile.departureDate, locale)}`
      : profile.arrivalDate
        ? formatSquadDate(profile.arrivalDate, locale)
        : '';
  const stay = stayLabel(profile as FestivalSquadProfile, copy);
  const budget = budgetLabel(profile.budgetLevel ?? 'comfort', copy);
  const artists = (profile.favoriteArtists ?? []).slice(0, 3).join(' · ');
  return [origin, dates, stay, budget, artists].filter(Boolean);
}
