import { Sparkles } from 'lucide-react';

type TravelInsightCardProps = {
  summary: string;
  badge: string;
};

export function TravelInsightCard({ summary, badge }: TravelInsightCardProps) {
  return (
    <aside className="travel-insight" aria-label={badge}>
      <div className="travel-insight__icon" aria-hidden="true">
        <Sparkles size={16} strokeWidth={2.25} />
      </div>
      <div className="travel-insight__copy">
        <span className="travel-insight__badge">{badge}</span>
        <p className="travel-insight__text">{summary}</p>
      </div>
    </aside>
  );
}
