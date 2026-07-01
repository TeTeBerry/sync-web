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
  region?: string;
  image?: string;
  description?: string;
  lineup?: string[];
  artists?: string[];
  status?: string;
  attendees?: number;
  recruitPostCount?: number;
  lineupPublished?: boolean;
  travelGuideSupported?: boolean;
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
