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
  journey: TrainJourney;
  selectedClass: TrainClass;
  travelDate: string;
  notes?: string;
  addedAt: string;
  date?: string;
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
}

export interface TripContextType {
  trips: TripItem[];
  addTrainToTrip: (journey: TrainJourney, selectedClass?: TrainClass, travelDate?: string) => boolean;
  removeTrainFromTrip: (tripItemId: string) => void;
  isTrainInTrip: (trainId: string) => boolean;
  clearTrip: () => void;
  getTripTotalCost: () => number;
  getTripItemCount: () => number;
  totalCost: number;
  totalDurationMinutes: number;
  totalCo2Kg: number;
  totalCo2SavedKg: number;
}
