import Link from 'next/link';

export type BreadcrumbItem = {
  label: string;
  href?: string;
};

type BreadcrumbsProps = {
  items: BreadcrumbItem[];
  ariaLabel: string;
};

export function Breadcrumbs({ items, ariaLabel }: BreadcrumbsProps) {
  return (
    <nav className="breadcrumbs" aria-label={ariaLabel}>
      <ol className="breadcrumbs__list">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li className="breadcrumbs__item" key={`${item.label}-${index}`}>
              {isLast || !item.href ? (
                <span className="breadcrumbs__current" aria-current={isLast ? 'page' : undefined}>
                  {item.label}
                </span>
              ) : (
                <Link className="breadcrumbs__link" href={item.href}>
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
