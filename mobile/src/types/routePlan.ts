/**
 * Standardized Transit Route & Multi-Modal Itinerary Contract
 *
 * Designed as the unified contract across Beeline for:
 * - Multi-modal door-to-door journeys (e.g. Galați Micro 19 ➔ București Piața Unirii)
 * - Romanian domestic corridors and European gateway routes
 * - The Romanian Transfer Shield risk scoring engine
 * - Downstream map rendering (GeoJSON LineString compliant)
 * - Multi-carrier ticketing and carbon benchmarks
 */

export type TransitMode =
  | 'TRAIN'      // CFR Călători, Astra Trans Carpatic, TFC, Softrans, Regio Călători
  | 'METRO'      // Metrorex (M1, M2, M3, M4, M5)
  | 'TRAM'       // Transurb Galați (Tram 39, 7), STB (Tram 41, 1), CTP Cluj, STPT
  | 'BUS'        // Transurb Galați (Bus 102, 105), STB, regional express coaches
  | 'WALK'       // Pedestrian transfer between stops or platforms
  | 'AIR'        // Domestic or European regional flights
  | 'FERRY';     // Danube river ferries (Galați-Tulcea, Brăila, etc.)

export type CuratedPillar = 'FASTEST' | 'BEST_VALUE' | 'MOST_RELIABLE' | 'ECO_HERO';

export type RiskLevel = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';

export type BufferAdequacy = 'GENEROUS' | 'OPTIMAL' | 'TIGHT' | 'INSUFFICIENT';

/**
 * MANDATORY: Point coordinates with optional station/platform and address metadata.
 */
export interface GeoPoint {
  latitude: number;
  longitude: number;
  city?: string;
  address?: string;
  platform?: string;
  stopId?: string;
}

/**
 * RFC 7946 compliant GeoJSON LineString geometry: array of [longitude, latitude] coordinates.
 */
export interface GeoJSONLineString {
  type: 'LineString';
  coordinates: [number, number][];
}

/**
 * Scheduled stop along a transit leg.
 */
export interface IntermediateStop {
  stopSequence: number;
  name: string;
  coords: GeoPoint;
  scheduledArrival?: string;
  scheduledDeparture?: string;
  platform?: string;
}

/**
 * MANDATORY: Full naming entity hierarchy for transit legs.
 */
export interface LegNames {
  originName: string;            // e.g. "Micro 19"
  originCity: string;            // e.g. "Galați"
  destinationName: string;       // e.g. "Gara CFR Galați"
  destinationCity: string;       // e.g. "Galați"
  lineCode?: string;             // e.g. "102", "IR 1572", "M2"
  lineName?: string;             // e.g. "Micro 19 ⇄ Gara CFR Galați"
  operatorName?: string;         // e.g. "Transurb S.A. Galați"
  operatorShortName?: string;    // e.g. "Transurb"
  headsign?: string;             // e.g. "Gara CFR"
  vehicleIdentifier?: string;    // e.g. "Desiro VT 642" or "Astra Imperio 3822"
}

/**
 * MANDATORY: Coordinates for leg origin, destination, intermediate stops, and GeoJSON path.
 */
export interface LegCoordinates {
  originCoords: GeoPoint;
  destinationCoords: GeoPoint;
  intermediateStops: IntermediateStop[];
  geometry: GeoJSONLineString;
}

/**
 * Scheduled and estimated realtime timing for a transit leg.
 */
export interface LegTimings {
  scheduledDeparture: string;    // ISO 8601 string
  scheduledArrival: string;      // ISO 8601 string
  estimatedDeparture: string;    // ISO 8601 string
  estimatedArrival: string;      // ISO 8601 string
  durationMinutes: number;
  delayMinutes: number;
  isRealtime: boolean;
}

/**
 * Real-time service disruption affecting a specific leg.
 */
export interface TransitDisruption {
  id: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  headline: string;
  description: string;
  estimatedDelayMinutes?: number;
}

/**
 * MANDATORY: Risk and reliability metrics for an individual leg and subsequent connection.
 */
export interface LegRiskProfile {
  /** Leg-level risk score from 0 (very reliable) to 100 (high probability of delay) */
  legRiskScore: number;
  /** Historical carrier punctuality rate as percentage (e.g. 94.0 = 94%) */
  historicalPunctualityPercent: number;
  /** Buffer time in minutes between this leg's arrival and next leg's departure */
  transferBufferAfterMinutes?: number;
  /** True if transfer buffer meets or exceeds the 25-min Romanian Transfer Shield standard */
  isShieldedBuffer: boolean;
  /** Active real-time disruptions on this leg */
  disruptions: TransitDisruption[];
}

/**
 * Fare and ticketing information for a single leg.
 */
export interface LegFare {
  amount: number;
  currency: 'RON' | 'EUR';
  ticketCategory: 'URBAN_TRANSIT' | 'RAIL_REGIO' | 'RAIL_INTERREGIO' | 'METRO_SINGLE' | 'FREE';
  bookingUrl?: string;
  providerPaymentMethods?: ('24PAY' | 'SMS_VALIDATION' | 'CONTACTLESS_CARD' | 'CFR_TICKET_OFFICE')[];
}

/**
 * On-board amenities, comfort levels, and accessibility support.
 */
export interface LegAmenities {
  items: (
    | 'WIFI'
    | 'POWER_OUTLETS'
    | 'AIR_CONDITIONING'
    | 'LOW_FLOOR_ACCESSIBLE'
    | 'BICYCLE_RACK'
    | 'LUGGAGE_STORAGE'
    | 'RESTROOM'
  )[];
  crowdingLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  stepFreeAccess: boolean;
}

/**
 * Step-by-step pedestrian and transit boarding instructions.
 */
export interface LegInstructions {
  leadText: string;
  detailSteps?: string[];
  transferNotice?: string;
}

/**
 * MANDATORY: Single sequential leg of a multi-modal itinerary.
 */
export interface TransitLeg {
  id: string;
  legIndex: number;
  transportType: TransitMode;
  names: LegNames;
  coords: LegCoordinates;
  timings: LegTimings;
  risk: LegRiskProfile;
  fare: LegFare;
  amenities: LegAmenities;
  instructions: LegInstructions;
}

/**
 * Contributing hazard factor to route risk calculation.
 */
export interface RouteRiskFactor {
  code:
    | 'SINGLE_TRACK_RAIL'
    | 'URBAN_RUSH_HOUR_TRAFFIC'
    | 'SUB_15_MIN_TRANSFER'
    | 'WEATHER_ALERT'
    | 'CARRIER_CHRONIC_DELAY';
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  description: string;
  affectedLegIndex?: number;
}

/**
 * MANDATORY: Multi-dimensional route reliability and connection risk evaluation.
 */
export interface RouteRiskAnalysis {
  /**
   * Overall route risk score from 0 (bulletproof / on-time) to 100 (high risk of missed connection).
   */
  overallRiskScore: number;

  /** Discrete risk band classification */
  riskLevel: RiskLevel;

  /** Historical on-time punctuality rate across all legs (0.00 to 1.00) */
  historicalPunctualityRate: number;

  /** Tightest transfer buffer between consecutive legs in minutes */
  tightestBufferMinutes: number;

  /** Evaluation against the Romanian Transfer Shield buffer threshold (25–35 min) */
  bufferAdequacy: BufferAdequacy;

  /** Natural language advice and explanation */
  riskSummaryText: string;

  /** Breakdown of contributing hazard factors */
  factors: RouteRiskFactor[];
}

/**
 * Environmental impact and Romanian highway benchmark (e.g. DN1/DN25 comparison).
 */
export interface EcoBenchmark {
  routeEmissionsKgCO2: number;
  carEmissionsKgCO2: number;
  savedKgCO2: number;
  percentageSaved: number;
  treeDaysEquivalent: number;
}

/**
 * Aggregated fare breakdown across all legs.
 */
export interface RouteFareSummary {
  totalAmountLei: number;
  totalAmountEur: number;
  isIntegratedTicketAvailable: boolean;
  legFares: {
    legId: string;
    operator: string;
    amountLei: number;
    amountEur: number;
  }[];
}

/**
 * Query parameters used to generate the route plan.
 */
export interface TransitRouteQuery {
  origin: {
    name: string;
    coords?: GeoPoint;
    city?: string;
  };
  destination: {
    name: string;
    coords?: GeoPoint;
    city?: string;
  };
  departureTime?: string;
  allowedModes: TransitMode[];
  optimizationPreference: 'FASTEST' | 'BEST_VALUE' | 'SAFE_BUFFERS' | 'LEAST_TRANSFERS';
  minimumBufferMinutes?: number;
}

/**
 * MANDATORY ROOT CONTRACT: Standardized Transit Route & Multi-Modal Itinerary.
 */
export interface TransitRoutePlan {
  /** Unique itinerary identifier (UUID v4) */
  id: string;

  /** Originating query parameters */
  query: TransitRouteQuery;

  /** Human-readable headline summary (e.g. "Transurb Bus 102 ➔ CFR IR 1572 ➔ Metrorex M2") */
  summary: string;

  /** Departure timestamp in ISO 8601 format */
  departureTime: string;

  /** Arrival timestamp in ISO 8601 format */
  arrivalTime: string;

  /** Total journey duration in minutes */
  totalDurationMinutes: number;

  /** Walking duration across all transfers in minutes */
  totalWalkMinutes: number;

  /** Total walking distance in meters */
  totalWalkDistanceMeters: number;

  /** Number of transit vehicle transfers (0 = direct) */
  transfersCount: number;

  /** Curated Trifecta badge classification */
  curatedPillar: CuratedPillar;

  /** Companion mascot recommendation (Barnaby, Honey, or Bumble) */
  mascotRecommendation: {
    persona: 'barnaby' | 'honey' | 'bumble';
    badgeLabel: string;
    advice: string;
  };

  /** MANDATORY: Overall Route Risk & Reliability Analysis */
  riskAnalysis: RouteRiskAnalysis;

  /** Total price and fare details across all legs */
  fare: RouteFareSummary;

  /** Environmental impact and Romanian highway benchmark */
  eco: EcoBenchmark;

  /** MANDATORY: Sequential door-to-door transit legs */
  legs: TransitLeg[];

  /** Timestamp when this itinerary was generated */
  createdAt: string;

  /** Cache validity expiration timestamp */
  validUntil: string;
}
