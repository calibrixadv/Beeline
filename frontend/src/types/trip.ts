import { TrainClass, TrainJourney } from './train';
import { CuratedPillar, TransferDetail } from './routePlan';

export interface TripOption {
  id: string;
  journey: TrainJourney;
  curatedPillar?: CuratedPillar | null;
  curatedPillars?: CuratedPillar[];
  date?: string;
  totalDurationMinutes?: number;
  priceLei?: number;
  transfers?: TransferDetail[];
}

export interface TripItem {
  id: string;
  savedRouteId?: string;
  journey: TrainJourney;
  selectedClass: TrainClass;
  travelDate: string;
  notes?: string;
  addedAt: string;
  date?: string;
  alertMuted?: boolean;
  alertLeadMinutes?: 5 | 10 | 30 | 60;
  curatedPillars?: CuratedPillar[];
  curatedPillar?: CuratedPillar;
  bookingWindow?: {
    minDate: string;
    maxDate: string;
    advanceBookingDays: number;
    activeTimetable: string;
    liveSource: string;
  };
  liveStatus?: 'ON_TIME' | 'DELAYED' | 'CANCELLED' | 'SCHEDULED';
  delayMinutes?: number;
  timetableSource?: string;
  commercialStops?: string[];
  legs?: any[];
  transfersCount?: number;
  transfers?: any[];
}

export interface TripContextType {
  trips: TripItem[];
  addTrainToTrip: (journey: TrainJourney, selectedClass?: TrainClass, travelDate?: string) => boolean;
  addTrip: (journeyOrItem: TrainJourney | TripItem, selectedClass?: TrainClass, travelDate?: string) => boolean;
  removeTrainFromTrip: (tripItemId: string) => void;
  updateTripAlertSettings: (
    tripId: string,
    settings: { alertMuted?: boolean; alertLeadMinutes?: 5 | 10 | 30 | 60 }
  ) => Promise<void> | void;
  isTrainInTrip: (trainId: string) => boolean;
  clearTrip: () => void;
  getTripTotalCost: () => number;
  getTripItemCount: () => number;
  totalCost: number;
  totalDurationMinutes: number;
  totalCo2Kg: number;
  totalCo2SavedKg: number;
}
