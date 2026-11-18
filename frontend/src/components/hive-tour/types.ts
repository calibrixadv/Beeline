export type HiveTourChapter = 'hero' | 'queens' | 'providers' | 'ecosystem';

export type MiniBeeVariant = 'fast' | 'safe' | 'economy';

export interface TransitProviderInfo {
  id: string;
  name: string;
  fullName: string;
  type: 'rail' | 'junction';
  badge: string;
  badgeColor: string;
  accentColor: string;
  coverage: string;
  fleet: string;
  syncFeature: string;
  iconName: string;
}
