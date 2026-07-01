export type Activity = {
  legacyId: number;
  name: string;
  title?: string;
  code?: string;
  date?: string;
  location?: string;
  city?: string;
  image?: string;
  description?: string;
  lineup?: string[];
  artists?: string[];
  status?: string;
};

export type RecruitPost = {
  id: string;
  authorName?: string;
  eventTitle?: string;
  body?: string;
  content?: string;
  location?: string;
  departureCity?: string;
  activityLegacyId?: number;
  recruitStatus?: string;
  currentPeople?: number;
  targetPeople?: number;
  unityTags?: string[];
};

export type EventPostsPage = {
  items?: RecruitPost[];
  posts?: RecruitPost[];
  nextCursor?: string | null;
};
