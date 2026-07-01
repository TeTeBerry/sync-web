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
  recruitPostCount?: number;
  lineupPublished?: boolean;
  travelGuideSupported?: boolean;
  externalUrl?: string;
  infoSource?: string;
  infoUpdatedAt?: string;
  damaiProjectId?: string;
};

export type RecruitPost = {
  id: string;
  authorName?: string;
  name?: string;
  handle?: string;
  eventTitle?: string;
  body?: string;
  bodyPreview?: string;
  content?: string;
  location?: string;
  departureCity?: string;
  activityLegacyId?: number;
  recruitStatus?: string;
  currentPeople?: number;
  targetPeople?: number;
  unityTags?: string[];
  tags?: string[];
  recruitUnityTags?: string[];
  slotsFilled?: number;
  slotsTotal?: number;
  comments?: number;
  avatar?: string;
  createdAt?: string;
};

export type EventPostsPage = {
  items?: RecruitPost[];
  posts?: RecruitPost[];
  nextCursor?: string | null;
};
