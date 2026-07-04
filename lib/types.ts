export type ActivityRegion = 'domestic' | 'overseas' | 'hmt';

export type ActivityCatalogType = 'festival' | 'indoor';

export type Activity = {
  _id?: string;
  legacyId: number;
  name: string;
  title?: string;
  code?: string;
  alias?: string[];
  date?: string;
  location?: string;
  city?: string;
  area?: string;
  region?: ActivityRegion;
  latitude?: number;
  longitude?: number;
  image?: string;
  description?: string;
  lineup?: string[];
  artists?: string[];
  status?: string;
  activityType?: ActivityCatalogType;
  hot?: boolean;
  attendees?: number;
  lineupPublished?: boolean;
  travelGuideSupported?: boolean;
  externalUrl?: string;
  infoSource?: string;
  infoUpdatedAt?: string;
  damaiProjectId?: string;
};

export type ActivityListPage = {
  items?: Activity[];
  total?: number;
  skip?: number;
  limit?: number;
};
