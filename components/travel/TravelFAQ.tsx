import type { TravelFaqItem } from '../../lib/event-travel';

type TravelFAQProps = {
  items: TravelFaqItem[];
  title: string;
};

export function TravelFAQ({ items, title }: TravelFAQProps) {
  return (
    <section className="travel-faq" aria-labelledby="travel-faq-title">
      <h3 id="travel-faq-title" className="travel-faq__title">
        {title}
      </h3>
      <dl className="travel-faq__list">
        {items.map((item) => (
          <div className="travel-faq__item" key={item.question}>
            <dt className="travel-faq__question">{item.question}</dt>
            <dd className="travel-faq__answer">{item.answer}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
