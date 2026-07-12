import type { SquadCopy } from './squad-labels';

type SquadFestivalPreludeProps = {
  eventTitle: string;
  metaLine: string;
  artistNames: string[];
  copy: SquadCopy;
};

/** Keeps the festival present after the hero, before utility enters the page. */
export function SquadFestivalPrelude({
  eventTitle,
  metaLine,
  artistNames,
  copy,
}: SquadFestivalPreludeProps) {
  const voices = [...new Set(artistNames)].slice(0, 4);

  return (
    <section className="squad-prelude" aria-labelledby="squad-prelude-title">
      <div className="squad-prelude__copy">
        <p className="squad-prelude__kicker">{copy.prelude.kicker}</p>
        <h2 id="squad-prelude-title" className="squad-prelude__title">
          {copy.prelude.title}
        </h2>
        <p className="squad-prelude__lead">{copy.prelude.lead.replace('{festival}', eventTitle)}</p>
        {metaLine ? <p className="squad-prelude__meta">{metaLine}</p> : null}
      </div>

      <div className="squad-prelude__signal" aria-label={copy.prelude.musicLabel}>
        <span className="squad-prelude__signal-line" aria-hidden />
        <p className="squad-prelude__signal-label">{copy.prelude.musicLabel}</p>
        {voices.length ? (
          <p className="squad-prelude__artists">{voices.join(' · ')}</p>
        ) : (
          <p className="squad-prelude__artists">{copy.prelude.musicFallback}</p>
        )}
      </div>
    </section>
  );
}
