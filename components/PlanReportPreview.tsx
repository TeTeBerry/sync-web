type PlanReportSection = {
  icon: string;
  label: string;
  value: string;
  highlight?: boolean;
};

type PlanReportPreviewProps = {
  badge: string;
  title: string;
  meta: string;
  sections: readonly PlanReportSection[];
};

export function PlanReportPreview({ badge, title, meta, sections }: PlanReportPreviewProps) {
  return (
    <div className="plan-report" role="img" aria-label={title}>
      <div className="plan-report__chrome">
        <header className="plan-report__header">
          <span className="plan-report__badge">{badge}</span>
          <h3 className="plan-report__title">{title}</h3>
          <p className="plan-report__meta">{meta}</p>
        </header>

        <div className="plan-report__divider" aria-hidden />

        <ul className="plan-report__list">
          {sections.map((section) => (
            <li
              className={`plan-report__row${section.highlight ? ' plan-report__row--highlight' : ''}`}
              key={section.label}
            >
              <span className="plan-report__icon" aria-hidden>
                {section.icon}
              </span>
              <span className="plan-report__label">{section.label}</span>
              <span className="plan-report__value">{section.value}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
