import Image from 'next/image';
import { PlanReportPreview } from './PlanReportPreview';

type FlowStep = {
  index: string;
  title: string;
  imageSrc?: string;
  imageAlt: string;
};

type PlanReportContent = {
  badge: string;
  title: string;
  meta: string;
  sections: readonly {
    icon: string;
    label: string;
    value: string;
    highlight?: boolean;
  }[];
};

type HomeProductFlowProps = {
  steps: readonly FlowStep[];
  planReport: PlanReportContent;
};

export function HomeProductFlow({ steps, planReport }: HomeProductFlowProps) {
  return (
    <ol className="product-flow" data-reveal-stagger>
      {steps.map((step, stepIndex) => (
        <li className="product-flow__step" key={step.title}>
          <div className="product-flow__label">
            <span className="product-flow__index" aria-hidden>
              {step.index}
            </span>
            <h3 className="product-flow__title">{step.title}</h3>
          </div>

          <div
            className={`product-flow__screen${
              step.imageSrc ? ' product-flow__screen--visual' : ' product-flow__screen--report'
            }`}
          >
            {step.imageSrc ? (
              <Image
                className="product-flow__image"
                src={step.imageSrc}
                alt={step.imageAlt}
                width={1440}
                height={900}
                sizes="(max-width: 860px) 72vw, 320px"
                priority={stepIndex === 0}
              />
            ) : (
              <PlanReportPreview
                badge={planReport.badge}
                title={planReport.title}
                meta={planReport.meta}
                sections={planReport.sections}
              />
            )}
          </div>

          {stepIndex < steps.length - 1 ? (
            <div className="product-flow__arrow" aria-hidden>
              ↓
            </div>
          ) : null}
        </li>
      ))}
    </ol>
  );
}
