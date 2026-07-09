import type { ScheduleDj } from '../../lib/api';

export type LineupGenreGroup = {
  genreLabel: string;
  color: string;
  djs: ScheduleDj[];
};
