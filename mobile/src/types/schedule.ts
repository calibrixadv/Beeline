import { TransitMode } from './routePlan';

export { TransitMode };
export type ScheduleSection = 'URBAN' | 'TRAIN';

export interface TransitProvider {
  id: string;
  name: string;
  shortName: string;
  city: string; // e.g. 'București', 'Galați', 'Cluj-Napoca', 'National'
  modes: TransitMode[];
  badgeColor: string;
  isNationalRail?: boolean;
}

export interface DepartureTime {
  time: string; // e.g. '14:25'
  minutesUntil: number; // e.g. 4
  crowdingLevel?: 'LOW' | 'MEDIUM' | 'HIGH';
  platform?: string;
  isLiveTracking?: boolean;
}

export interface TransitLineSchedule {
  id: string;
  lineCode: string; // e.g. 'M2', '41', '102', 'IR 1631'
  lineName: string; // e.g. 'Pipera ⇄ Berceni'
  mode: TransitMode;
  provider: TransitProvider;
  city: string;
  origin: string;
  destination: string;
  nextDepartures: DepartureTime[];
  frequencyDescription?: string; // e.g. 'Every 4-6 min'
  status: 'ON_TIME' | 'DELAYED' | 'DISRUPTED';
  fareLei: number; // e.g. 3.00, 3.50, 48.00
  viaStops?: string[];
}

export interface LocationCoordinates {
  latitude: number;
  longitude: number;
  city?: string;
}

export interface ScheduleFilterParams {
  section: ScheduleSection;
  selectedCity?: string;
  modes?: TransitMode[];
  providerId?: string;
  searchQuery?: string;
}
