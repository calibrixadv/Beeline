export type TrainStatus = 'ON_TIME' | 'DELAYED' | 'CANCELLED' | 'BOARDING';

export type TrainClass = 'STANDARD' | 'FIRST' | 'BUSINESS' | 'SLEEPER';

export type Amenity =
  | 'WIFI'
  | 'POWER_OUTLETS'
  | 'DINING_CAR'
  | 'BIKE_STORAGE'
  | 'WHEELCHAIR_ACCESSIBLE'
  | 'QUIET_ZONE';

export interface Station {
  code: string;
  name: string;
  city: string;
  platform?: string;
}

export interface TrainStop {
  stopNumber: number;
  station: Station;
  scheduledArrival?: string;
  scheduledDeparture?: string;
  actualArrival?: string;
  actualDeparture?: string;
  platform?: string;
}

export interface TrainFare {
  classType: TrainClass;
  price: number;
  currency: string;
  seatsAvailable: number;
}

export interface TrainJourney {
  id: string;
  trainNumber: string;
  operator: string;
  origin: Station;
  destination: Station;
  departureTime: string; // ISO 8601 string: YYYY-MM-DDTHH:mm:ss
  arrivalTime: string;   // ISO 8601 string: YYYY-MM-DDTHH:mm:ss
  durationMinutes: number;
  durationFormatted: string;
  status: TrainStatus;
  delayMinutes: number;
  fares: TrainFare[];
  stops: TrainStop[];
  amenities: Amenity[];
  carbonFootprintKg: number;
}

export interface TrainFilterState {
  searchQuery: string;
  statusFilter: TrainStatus | 'ALL';
  operatorFilter: string | 'ALL';
  maxPrice?: number;
  sortBy: 'departure' | 'price' | 'duration';
  sortOrder: 'asc' | 'desc';
}
