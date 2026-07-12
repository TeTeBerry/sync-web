export type PlanGenerationStage =
  | 'mission'
  | 'festival'
  | 'lineup'
  | 'route'
  | 'assembly'
  | 'guide'
  | 'completed'
  | 'failed';

/** Backend pipeline steps reported by Raven plan generation jobs. */
export type BackendGenerationStep =
  | 'queued'
  | 'pending'
  | 'validating'
  | 'map_poi'
  | 'quotes_hotels'
  | 'searching_hotels'
  | 'quotes'
  | 'quotes_flights'
  | 'searching_flights'
  | 'ai_writing'
  | 'building_itinerary'
  | 'assembling'
  | 'finishing'
  | 'completed'
  | 'failed'
  | 'running';

export type FestivalGenerationAtmosphere =
  | 'enchanted'
  | 'neon'
  | 'industrial'
  | 'coastal'
  | 'desert'
  | 'forest'
  | 'cosmic'
  | 'urban';

export type FestivalGenerationTheme = {
  id: string;
  festivalSlug?: string;
  displayName: string;
  atmosphere: FestivalGenerationAtmosphere;
  /** Existing Raven festival atmosphere token used by CSS theme engine. */
  ravenAtmosphere: 'violet' | 'amber' | 'electric' | 'neon' | 'ember' | 'steel' | 'lime';
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  glowColor: string;
  routeStyle: 'arc' | 'pulse' | 'wave' | 'beam';
  motif: 'portal' | 'rings' | 'horizon' | 'pulse' | 'field' | 'tower' | 'mist';
  copyTone: 'dreamlike' | 'energetic' | 'intense' | 'minimal';
};

export type PlanGenerationNarrative = {
  eyebrow: string;
  title: string;
  lead: string;
};

export type PlanGenerationCopy = {
  mission: PlanGenerationNarrative;
  festival: PlanGenerationNarrative;
  lineup: PlanGenerationNarrative;
  lineupFallback: PlanGenerationNarrative;
  route: PlanGenerationNarrative;
  assembly: PlanGenerationNarrative;
  assemblyLabels: string[];
  guide: PlanGenerationNarrative;
  guideRotating: string[];
  completed: PlanGenerationNarrative;
  failed: PlanGenerationNarrative;
  retry: string;
  adjust: string;
  stageLabels: Record<Exclude<PlanGenerationStage, 'failed'>, string>;
};
