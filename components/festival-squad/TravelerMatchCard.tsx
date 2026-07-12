'use client';

import type { ReactNode } from 'react';
import type { SquadMatch } from '../../lib/festival-squad';
import type { Locale } from '../../lib/i18n';
import {
  formatSquadDate,
  matchAffinityText,
  originLabel,
  stayLabel,
  type SquadCopy,
} from './squad-labels';

type TravelerMatchCardProps = {
  match: SquadMatch;
  locale: Locale;
  copy: SquadCopy;
  open: boolean;
  onToggle: () => void;
  featured?: boolean;
  echo?: boolean;
  children?: ReactNode;
};

/** One stop on the shared festival path — expands in place. */
export function TravelerMatchCard({
  match,
  locale,
  copy,
  open,
  onToggle,
  featured = false,
  echo = false,
  children,
}: TravelerMatchCardProps) {
  const p = match.profile;
  const topReason = match.reasons[0];
  const artists = p.favoriteArtists.slice(0, featured ? 4 : 2).join(' · ');

  return (
    <article
      className={`traveler-card${open ? ' is-open' : ''}${featured ? ' is-featured' : ''}${echo ? ' is-echo' : ''}`}
    >
      <button type="button" className="traveler-card__hit" onClick={onToggle} aria-expanded={open}>
        {featured ? <p className="traveler-card__featured-kicker">{copy.card.nearest}</p> : null}

        <div className="traveler-card__identity">
          <h3 className="traveler-card__name">{p.displayName}</h3>
          {!echo ? <p className="traveler-card__affinity">{matchAffinityText(match, copy)}</p> : null}
        </div>

        {artists ? <p className="traveler-card__artists">{artists}</p> : null}

        {topReason && !echo ? <p className="traveler-card__moment">{topReason}</p> : null}

        <p className="traveler-card__path">
          {[
            originLabel(p),
            copy.card.arriving.replace('{date}', formatSquadDate(p.arrivalDate, locale)),
            featured ? copy.card.staying.replace('{place}', stayLabel(p, copy)) : null,
          ]
            .filter(Boolean)
            .join(' · ')}
        </p>

        {p.shortNote && (featured || open) ? (
          <p className="traveler-card__note">{p.shortNote}</p>
        ) : null}

        <span className="traveler-card__cta">
          {open ? copy.detail.close : featured ? copy.card.viewMatch : copy.card.viewEcho}
        </span>
      </button>

      {open ? <div className="traveler-card__reveal">{children}</div> : null}
    </article>
  );
}
