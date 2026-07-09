import { getActivityContinent, type ActivityContinent } from './activity-continent';
import type { Activity } from './types';

export type FestivalAtmosphere = 'violet' | 'amber' | 'electric' | 'neon' | 'ember' | 'steel' | 'lime';

const FESTIVAL_PROFILES: Array<{ atmosphere: FestivalAtmosphere; markers: string[] }> = [
  { atmosphere: 'amber', markers: ['tomorrowland', '明日世界', 'coachella', 'mysteryland'] },
  { atmosphere: 'neon', markers: ['edc', 'electric daisy'] },
  { atmosphere: 'electric', markers: ['ultra', '超世代', 's2o', 'tomorrowland winter'] },
  { atmosphere: 'ember', markers: ['lost lands', '失落之地', 'defqon', 'hardstyle', 'q-dance', 'intents'] },
  { atmosphere: 'steel', markers: ['awakenings', '觉醒', 'sonar', 'time warp', 'drumcode', 'karrera', 'ade'] },
  { atmosphere: 'lime', markers: ['creamfields', '奶油田', 'parookaville', 'exit festival', 'lollapalooza'] },
];

const CONTINENT_ATMOSPHERE: Partial<Record<ActivityContinent, FestivalAtmosphere>> = {
  europe: 'steel',
  north_america: 'electric',
  asia: 'violet',
  middle_east: 'amber',
  oceania: 'lime',
  south_america: 'ember',
  africa: 'ember',
};

function identityOf(activity: Activity): string {
  return `${activity.name} ${activity.title ?? ''} ${(activity.alias ?? []).join(' ')}`.toLowerCase();
}

export function getFestivalAtmosphere(activity: Activity, dominantGenre?: string): FestivalAtmosphere {
  const identity = identityOf(activity);
  const profile = FESTIVAL_PROFILES.find(({ markers }) => markers.some((marker) => identity.includes(marker)));
  if (profile) return profile.atmosphere;

  const genre = (dominantGenre ?? '').toLowerCase();
  if (genre.includes('hardstyle') || genre.includes('hardcore') || genre.includes('hard ')) return 'ember';
  if (genre.includes('techno') || genre.includes('minimal')) return 'steel';
  if (genre.includes('trance') || genre.includes('progressive')) return 'amber';
  if (genre.includes('bass') || genre.includes('dubstep') || genre.includes('drum')) return 'ember';
  if (genre.includes('house') || genre.includes('disco')) return 'lime';

  if (activity.activityType === 'indoor') return 'steel';

  const continent = getActivityContinent(activity);
  if (continent && CONTINENT_ATMOSPHERE[continent]) {
    return CONTINENT_ATMOSPHERE[continent]!;
  }

  if (activity.region === 'overseas') return 'amber';
  if (activity.region === 'hmt') return 'electric';

  return 'violet';
}
