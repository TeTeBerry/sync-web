import { track } from '@vercel/analytics';

type AnalyticsValue = string | number | boolean | null;

export function trackLineupDiscovery(
  eventName:
    | 'lineup_discovery_viewed'
    | 'ai_discovery_artist_viewed'
    | 'ai_discovery_artist_saved'
    | 'discovery_category_opened'
    | 'mood_selected'
    | 'constellation_opened'
    | 'constellation_artist_selected'
    | 'constellation_path_explored'
    | 'wildcard_viewed'
    | 'journey_updated_from_discovery'
    | 'full_lineup_discovery_label_used'
    | 'lineup_artist_added'
    | 'lineup_artist_removed'
    | 'lineup_conflict_detected'
    | 'lineup_conflict_reviewed'
    | 'lineup_conflict_resolved'
    | 'lineup_conflict_deferred'
    | 'lineup_split_route_selected'
    | 'lineup_tight_transfer_detected'
    | 'lineup_schedule_pending_saved'
    | 'journey_recalculated_after_conflict'
    | 'mood_alternative_selected_due_to_conflict',
  properties?: Record<string, AnalyticsValue>,
) {
  track(eventName, properties);
}
