import { TrainClass, TrainJourney } from './train';

export interface TripItem {
  id: string;
  journey: TrainJourney;
  selectedClass: TrainClass;
  travelDate: string;
  notes?: string;
  addedAt: string;
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
