import { GeoPoint, TransitMode } from './routePlan';

export interface WeeklyStationSyncMeta {
  isoWeek: string;
  lastSyncedAt: string;
  nextWeeklySyncAt: string;
  totalStations: number;
  source?: string;
  schedule?: string;
}

export interface StationAutocompleteItem {
  code: string;
  name: string;
  city: string;
  modes: TransitMode[];
  coordinates: GeoPoint;
  dailyTrainCount?: number;
  operators?: string[];
  isMajorHub?: boolean;
}

export interface StationAutocompleteCatalogResponse {
  stations: StationAutocompleteItem[];
  weeklySync: WeeklyStationSyncMeta;
}

export interface StationSearchResponse {
  stations: StationAutocompleteItem[];
  weeklySync?: WeeklyStationSyncMeta;
}
