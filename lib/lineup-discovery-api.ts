import type {
  DiscoveryArtist,
  DiscoveryBundle,
  DiscoveryMood,
} from "./lineup-discovery";
import type { Locale } from "./i18n";
import { GENRE_BROAD_COLORS, resolveGenreBroadToken } from "./lineup-genre";

const ANON_STORAGE_KEY = "sync-taste-anonymous-id";

export type ServerDiscoveryArtist = {
  artistId: string;
  name?: string;
  primaryGenre?: string;
  genreColor?: string;
  score?: number;
  label?: DiscoveryArtist["label"];
  reasons?: string[];
  relatedToArtistIds?: string[];
};

export type ServerDiscoveryResponse = {
  mode: "personalized" | "session-personalized" | "festival-fallback";
  pickedForYou: ServerDiscoveryArtist[];
  newDiscoveries: ServerDiscoveryArtist[];
  wildcard?: ServerDiscoveryArtist;
  summary: {
    pickedCount: number;
    discoveryCount: number;
    wildcardCount: number;
  };
};

type ApiEnvelope<T> = { code?: number; message?: string; data?: T };

export function getOrCreateAnonymousId(): string {
  if (typeof window === "undefined") return "";
  try {
    const existing = window.localStorage.getItem(ANON_STORAGE_KEY);
    if (existing && /^[a-zA-Z0-9_-]{8,80}$/.test(existing)) return existing;
    const created = `anon_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
    window.localStorage.setItem(ANON_STORAGE_KEY, created);
    return created;
  } catch {
    return `anon_${Date.now().toString(36)}`;
  }
}

function colorFor(genre?: string, fallback?: string): string {
  if (fallback) return fallback;
  const broad = resolveGenreBroadToken(genre ?? "");
  return (broad && GENRE_BROAD_COLORS[broad]) || "#7c6cff";
}

function reasonCopy(key: string, locale: Locale): string {
  const zh: Record<string, string> = {
    similar_saved: "与你已标记的艺人相近。",
    shared_genre: "同属你关注的曲风。",
    adjacent_genre: "邻近曲风里的自然延伸。",
    lineup_overlap: "与你的行程选择相关。",
    journey_overlap: "与你的 Journey 选择相连。",
    mood_fit: "贴合你此刻追的气氛。",
    festival_highlight: "这场阵容里的高光名字。",
    high_energy_bridge: "与这场高能动线相连。",
    wildcard_bridge: "意外、却说得通的一条路。",
  };
  const en: Record<string, string> = {
    similar_saved: "Similar to artists already in My Lineup.",
    shared_genre: "Shares genres with artists you saved.",
    adjacent_genre: "A natural bridge into a related style.",
    lineup_overlap: "Connected to your lineup selections.",
    journey_overlap: "Connected to a Journey selection.",
    mood_fit: "Fits the mood you are chasing today.",
    festival_highlight: "A highlight sound in this festival’s cast.",
    high_energy_bridge: "Connected through this festival’s high-energy path.",
    wildcard_bridge: "One defensible surprise on the edge of your path.",
  };
  return (locale === "zh" ? zh : en)[key] ?? key;
}

function mapArtist(
  artist: ServerDiscoveryArtist,
  category: DiscoveryArtist["category"],
  locale: Locale,
): DiscoveryArtist {
  const genre = artist.primaryGenre ?? "";
  const reasons = (artist.reasons ?? []).map((key) => reasonCopy(key, locale));
  return {
    id: artist.artistId,
    name: artist.name ?? artist.artistId,
    genre,
    color: colorFor(genre, artist.genreColor),
    category,
    label: artist.label ?? (category === "picked" ? "related" : category),
    editorial: reasons[0] ?? genre,
    reasons,
    score: artist.score ?? 0,
  };
}

export function mapServerDiscoveryToBundle(
  data: ServerDiscoveryResponse,
  savedIds: string[],
  locale: Locale,
): DiscoveryBundle {
  const hasSignals = data.mode !== "festival-fallback";
  const picked = data.pickedForYou.map((a) => mapArtist(a, "picked", locale));
  const discoveries = data.newDiscoveries.map((a) =>
    mapArtist(a, "discovery", locale),
  );
  const wildcard = data.wildcard
    ? mapArtist(data.wildcard, "wildcard", locale)
    : null;
  return {
    hasSignals,
    savedIds,
    savedGenres: [],
    picked,
    discoveries,
    wildcard,
    counts: hasSignals
      ? {
          picked: data.summary.pickedCount,
          discoveries: data.summary.discoveryCount,
          wildcard: data.summary.wildcardCount,
        }
      : null,
  };
}

export async function fetchLineupDiscovery(input: {
  eventId: number;
  weekend?: "w1" | "w2";
  mood?: DiscoveryMood | null;
  savedArtistIds: string[];
  anonymousId: string;
}): Promise<ServerDiscoveryResponse | null> {
  const params = new URLSearchParams();
  if (input.mood) params.set("mood", input.mood);
  if (input.weekend) params.set("weekend", input.weekend);
  if (input.anonymousId) params.set("anonymousId", input.anonymousId);
  if (input.savedArtistIds.length) {
    params.set("savedArtistIds", input.savedArtistIds.slice(0, 80).join(","));
  }
  try {
    const response = await fetch(
      `/api/lineup-discovery/events/${input.eventId}/discovery?${params.toString()}`,
      { cache: "no-store" },
    );
    if (!response.ok) return null;
    const json = (await response.json()) as
      | ApiEnvelope<ServerDiscoveryResponse>
      | ServerDiscoveryResponse;
    if ("data" in json && json.data) return json.data;
    if ("pickedForYou" in json) return json;
    return null;
  } catch {
    return null;
  }
}

export async function fetchFestivalDna(
  eventId: number,
  weekend?: "w1" | "w2",
): Promise<ServerFestivalDna | null> {
  const query = weekend ? `?weekend=${weekend}` : "";
  try {
    const response = await fetch(
      `/api/lineup-discovery/events/${eventId}/festival-dna${query}`,
      { cache: "no-store" },
    );
    if (!response.ok) return null;
    const json = (await response.json()) as
      | ApiEnvelope<ServerFestivalDna>
      | ServerFestivalDna;
    if ("data" in json && json.data) return json.data;
    if ("dimensions" in json) return json;
    return null;
  } catch {
    return null;
  }
}

export type ServerFestivalDna = {
  dimensions: Array<{
    key: string;
    label: string;
    strength: number;
    confidence: "high" | "medium" | "low";
    explanation: string;
  }>;
  summary: string[];
  dataCoverage: { artistCount: number; enrichedArtistCount: number };
};

export async function fetchConstellation(input: {
  eventId: number;
  weekend?: "w1" | "w2";
  mood?: DiscoveryMood | null;
  savedArtistIds: string[];
  anonymousId: string;
  focusArtistId?: string;
}): Promise<unknown | null> {
  const params = new URLSearchParams();
  if (input.mood) params.set("mood", input.mood);
  if (input.weekend) params.set("weekend", input.weekend);
  if (input.anonymousId) params.set("anonymousId", input.anonymousId);
  if (input.focusArtistId) params.set("focusArtistId", input.focusArtistId);
  if (input.savedArtistIds.length) {
    params.set("savedArtistIds", input.savedArtistIds.slice(0, 80).join(","));
  }
  try {
    const response = await fetch(
      `/api/lineup-discovery/events/${input.eventId}/constellation?${params.toString()}`,
      { cache: "no-store" },
    );
    if (!response.ok) return null;
    const json = await response.json();
    if (json && typeof json === "object" && "data" in json)
      return (json as { data: unknown }).data;
    return json;
  } catch {
    return null;
  }
}

export async function recordTasteSignal(input: {
  anonymousId: string;
  eventId: number;
  artistId?: string;
  signalType:
    | "artist_saved"
    | "artist_unsaved"
    | "artist_added_to_lineup"
    | "artist_removed_from_lineup"
    | "mood_selected"
    | "constellation_artist_opened"
    | "wildcard_opened"
    | "journey_artist_added"
    | "journey_artist_removed";
  mood?: string;
}): Promise<void> {
  try {
    await fetch("/api/lineup-discovery/taste-signals", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        anonymousId: input.anonymousId,
        eventId: String(input.eventId),
        artistId: input.artistId,
        signalType: input.signalType,
        mood: input.mood,
      }),
      keepalive: true,
    });
  } catch {
    // Taste signals are best-effort — never block UI.
  }
}
