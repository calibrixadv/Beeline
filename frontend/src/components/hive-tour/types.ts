export type HiveTourChapter = 'hero' | 'queens' | 'providers' | 'ecosystem';

export type MiniBeeVariant = 'fast' | 'safe' | 'economy';

export interface TransitProviderInfo {
  id: string;
  name: string;
  fullName: string;
  tagline: string;
  story: string;
  popularDestinations: string[];
  tier: 'hero' | 'large' | 'compact';
  type: 'rail' | 'junction';
  badge: string;
  badgeColor: string;
  accentColor: string;
  coverage: string;
  fleet: string;
  syncFeature: string;
  iconName: string;
  // Audited ML & Timetable Telemetry from Stage 1 Codebase Audit:
  trainingRuns: number;
  datasetShare: number; // percentage, e.g. 64.78
  dailyActiveTrains: number; // from XML / dataset
  distinctCorridorRoutes: number; // distinct OD pairs
  meanDelayMinutes: number;
  medianDelayMinutes: number;
  electricTractionPct: number;
  dieselTractionPct: number;
  sampleTrains: string[];
  sourceFile: string;
  cluster: 'primary' | 'extended';
}
