import {
  TransitRoutePlan,
  TransitMode,
  CuratedPillar,
} from '../types/routePlan';
import { TrainJourney, TrainFare, TrainStop, Amenity } from '../types/train';
import {
  SAMPLE_ROUTE_PLAN_MICRO19_TO_PIATA_UNIRII,
  SAMPLE_ROUTE_PLAN_BUCHAREST_TO_BRASOV,
} from '../data/sampleRoutePlans';

export interface TripFilterState {
  modes: TransitMode[];
  providers: string[];
  pillar: 'ALL' | CuratedPillar;
  maxPriceLei?: number;
  maxDurationMinutes?: number;
  sortBy: 'departure' | 'duration' | 'price' | 'risk';
  sortOrder: 'asc' | 'desc';
}

export const DEFAULT_TRIP_FILTERS: TripFilterState = {
  modes: ['TRAIN', 'METRO', 'TRAM', 'BUS'],
  providers: [],
  pillar: 'ALL',
  maxPriceLei: undefined,
  maxDurationMinutes: undefined,
  sortBy: 'departure',
  sortOrder: 'asc',
};

export const POPULAR_ROMANIAN_PROVIDERS = [
  'CFR Călători',
  'Astra Trans Carpatic',
  'Transferoviar Călători',
  'Metrorex',
  'Transurb Galați',
  'STB',
];

/**
 * Normalizes station/city names for robust route matching.
 */
function normalizeName(str: string): string {
  return (str || '')
    .trim()
    .toLowerCase()
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Creates a canonical or generated set of multi-carrier trip options between two places.
 */
export function generateTripsForCorridor(
  origin: string,
  destination: string,
  departureTimePref?: string
): TransitRoutePlan[] {
  const normOrig = normalizeName(origin);
  const normDest = normalizeName(destination);

  const baseDeparture = departureTimePref || '2026-10-21T08:00:00+03:00';

  // 1. Galați ➔ București corridor
  if (
    (normOrig.includes('galati') || normOrig.includes('micro 19') || normOrig.includes('micro19')) &&
    (normDest.includes('bucuresti') || normDest.includes('uniri') || normDest.includes('gara de nord'))
  ) {
    return [
      // Option 1: Fastest Direct IR (CFR Călători)
      {
        id: 'trip-gl-buc-fastest-01',
        query: {
          origin: { name: origin, city: 'Galați' },
          destination: { name: destination, city: 'București' },
          departureTime: baseDeparture,
          allowedModes: ['TRAIN'],
          optimizationPreference: 'FASTEST',
        },
        summary: 'CFR InterRegio IR 1572 (Direct Express)',
        departureTime: '2026-10-21T07:30:00+03:00',
        arrivalTime: '2026-10-21T10:45:00+03:00',
        totalDurationMinutes: 195,
        totalWalkMinutes: 5,
        totalWalkDistanceMeters: 250,
        transfersCount: 0,
        curatedPillar: 'FASTEST',
        mascotRecommendation: {
          persona: 'barnaby',
          badgeLabel: 'FASTEST DIRECT IR',
          advice: 'Direct CFR express via Brăila and Ploiești Sud. Zero connection transfers.',
        },
        riskAnalysis: {
          overallRiskScore: 12,
          riskLevel: 'LOW',
          historicalPunctualityRate: 0.91,
          tightestBufferMinutes: 999,
          bufferAdequacy: 'GENEROUS',
          riskSummaryText: 'Direct rail corridor with 0 transfers: reliable on-time arrival.',
          factors: [],
        },
        fare: {
          totalAmountLei: 63.0,
          totalAmountEur: 12.6,
          isIntegratedTicketAvailable: true,
          legFares: [
            { legId: 'leg-ir-1572', operator: 'CFR Călători', amountLei: 63.0, amountEur: 12.6 },
          ],
        },
        eco: {
          routeEmissionsKgCO2: 7.2,
          carEmissionsKgCO2: 38.0,
          savedKgCO2: 30.8,
          percentageSaved: 81.0,
          treeDaysEquivalent: 5.1,
        },
        legs: [
          {
            id: 'leg-ir-1572',
            legIndex: 0,
            transportType: 'TRAIN',
            names: {
              originName: 'Gara Galați',
              originCity: 'Galați',
              destinationName: 'București Nord',
              destinationCity: 'București',
              lineCode: 'IR 1572',
              lineName: 'Galați ➔ București Nord',
              operatorName: 'CFR Călători',
              operatorShortName: 'CFR Călători',
              headsign: 'București Nord',
              vehicleIdentifier: 'Alstom Coradia Stream / LE 5100',
            },
            coords: {
              originCoords: { latitude: 45.4418, longitude: 28.0583, city: 'Galați', platform: 'Track 2' },
              destinationCoords: { latitude: 44.4475, longitude: 26.0747, city: 'București', platform: 'Track 5' },
              intermediateStops: [
                { stopSequence: 1, name: 'Brăila', coords: { latitude: 45.2758, longitude: 27.9622 } },
                { stopSequence: 2, name: 'Buzău', coords: { latitude: 45.1436, longitude: 26.8291 } },
                { stopSequence: 3, name: 'Ploiești Sud', coords: { latitude: 44.9281, longitude: 26.0354 } },
              ],
              geometry: {
                type: 'LineString',
                coordinates: [
                  [28.0583, 45.4418],
                  [27.9622, 45.2758],
                  [26.8291, 45.1436],
                  [26.0354, 44.9281],
                  [26.0747, 44.4475],
                ],
              },
            },
            timings: {
              scheduledDeparture: '2026-10-21T07:30:00+03:00',
              scheduledArrival: '2026-10-21T10:45:00+03:00',
              estimatedDeparture: '2026-10-21T07:30:00+03:00',
              estimatedArrival: '2026-10-21T10:45:00+03:00',
              durationMinutes: 195,
              delayMinutes: 0,
              isRealtime: true,
            },
            risk: {
              legRiskScore: 12,
              historicalPunctualityPercent: 91.0,
              transferBufferAfterMinutes: undefined,
              isShieldedBuffer: true,
              disruptions: [],
            },
            fare: {
              amount: 63.0,
              currency: 'RON',
              ticketCategory: 'RAIL_INTERREGIO',
              bookingUrl: 'https://bilete.cfrcalatori.ro',
            },
            amenities: {
              items: ['WIFI', 'POWER_OUTLETS', 'AIR_CONDITIONING', 'RESTROOM', 'BICYCLE_RACK'],
              crowdingLevel: 'MEDIUM',
              stepFreeAccess: true,
            },
            instructions: {
              leadText: 'Board CFR InterRegio IR 1572 at Gara Galați Track 2',
              detailSteps: ['Direct express via Brăila, Buzău and Ploiești Sud', 'Arrive at București Nord Track 5'],
              transferNotice: 'Final train stop. Walk to metro or taxi stands.',
            },
          },
        ],
        createdAt: '2026-10-21T06:00:00+03:00',
        validUntil: '2026-10-21T12:00:00+03:00',
      },

      // Option 2: Best Value Regional (Transferoviar Călători + STB)
      {
        id: 'trip-gl-buc-value-02',
        query: {
          origin: { name: origin, city: 'Galați' },
          destination: { name: destination, city: 'București' },
          departureTime: baseDeparture,
          allowedModes: ['TRAIN', 'BUS'],
          optimizationPreference: 'BEST_VALUE',
        },
        summary: 'TFC Regional 15072 ➔ STB Bus 100 Express',
        departureTime: '2026-10-21T06:15:00+03:00',
        arrivalTime: '2026-10-21T10:05:00+03:00',
        totalDurationMinutes: 230,
        totalWalkMinutes: 8,
        totalWalkDistanceMeters: 450,
        transfersCount: 1,
        curatedPillar: 'BEST_VALUE',
        mascotRecommendation: {
          persona: 'honey',
          badgeLabel: 'BEST VALUE SAVER',
          advice: 'Saves 21 LEI vs direct IR under the €10/hour rule with comfortable TFC Bombardier DMU.',
        },
        riskAnalysis: {
          overallRiskScore: 19,
          riskLevel: 'LOW',
          historicalPunctualityRate: 0.88,
          tightestBufferMinutes: 24,
          bufferAdequacy: 'OPTIMAL',
          riskSummaryText: 'Optimal 24 min buffer at București Nord safely absorbs potential delays.',
          factors: [],
        },
        fare: {
          totalAmountLei: 42.0,
          totalAmountEur: 8.4,
          isIntegratedTicketAvailable: false,
          legFares: [
            { legId: 'leg-tfc-1', operator: 'Transferoviar Călători', amountLei: 39.0, amountEur: 7.8 },
            { legId: 'leg-stb-1', operator: 'STB', amountLei: 3.0, amountEur: 0.6 },
          ],
        },
        eco: {
          routeEmissionsKgCO2: 8.1,
          carEmissionsKgCO2: 41.2,
          savedKgCO2: 33.1,
          percentageSaved: 80.3,
          treeDaysEquivalent: 5.5,
        },
        legs: [
          {
            id: 'leg-tfc-1',
            legIndex: 0,
            transportType: 'TRAIN',
            names: {
              originName: 'Gara Galați',
              originCity: 'Galați',
              destinationName: 'București Nord',
              destinationCity: 'București',
              lineCode: 'RE 15072',
              lineName: 'Galați ➔ București Nord (TFC)',
              operatorName: 'Transferoviar Călători',
              operatorShortName: 'Transferoviar Călători',
              headsign: 'București Nord',
              vehicleIdentifier: 'Bombardier Talent DMU',
            },
            coords: {
              originCoords: { latitude: 45.4418, longitude: 28.0583, city: 'Galați' },
              destinationCoords: { latitude: 44.4475, longitude: 26.0747, city: 'București' },
              intermediateStops: [
                { stopSequence: 1, name: 'Brăila', coords: { latitude: 45.2758, longitude: 27.9622 } },
                { stopSequence: 2, name: 'Făurei', coords: { latitude: 45.0862, longitude: 27.2711 } },
                { stopSequence: 3, name: 'Urziceni', coords: { latitude: 44.7175, longitude: 26.6347 } },
              ],
              geometry: {
                type: 'LineString',
                coordinates: [
                  [28.0583, 45.4418],
                  [27.9622, 45.2758],
                  [27.2711, 45.0862],
                  [26.6347, 44.7175],
                  [26.0747, 44.4475],
                ],
              },
            },
            timings: {
              scheduledDeparture: '2026-10-21T06:15:00+03:00',
              scheduledArrival: '2026-10-21T09:40:00+03:00',
              estimatedDeparture: '2026-10-21T06:15:00+03:00',
              estimatedArrival: '2026-10-21T09:40:00+03:00',
              durationMinutes: 205,
              delayMinutes: 0,
              isRealtime: true,
            },
            risk: {
              legRiskScore: 19,
              historicalPunctualityPercent: 88.0,
              transferBufferAfterMinutes: 25,
              isShieldedBuffer: true,
              disruptions: [],
            },
            fare: {
              amount: 39.0,
              currency: 'RON',
              ticketCategory: 'RAIL_REGIO',
              bookingUrl: 'https://transferoviarcalatori.ro',
            },
            amenities: {
              items: ['AIR_CONDITIONING', 'POWER_OUTLETS', 'RESTROOM'],
              crowdingLevel: 'LOW',
              stepFreeAccess: true,
            },
            instructions: {
              leadText: 'Board Transferoviar Regional RE 15072 at Gara Galați',
              detailSteps: ['Scenic route via Urziceni line to București Nord'],
              transferNotice: '25 min transfer buffer at București Nord to connect with STB bus lines.',
            },
          },
          {
            id: 'leg-stb-1',
            legIndex: 1,
            transportType: 'BUS',
            names: {
              originName: 'Gara de Nord',
              originCity: 'București',
              destinationName: destination,
              destinationCity: 'București',
              lineCode: '100',
              lineName: 'Piața Romană ⇄ Piața Unirii',
              operatorName: 'Societatea de Transport București',
              operatorShortName: 'STB',
              headsign: 'Piața Unirii',
              vehicleIdentifier: 'Mercedes Citaro Hybrid',
            },
            coords: {
              originCoords: { latitude: 44.4475, longitude: 26.0747, city: 'București' },
              destinationCoords: { latitude: 44.4276, longitude: 26.1026, city: 'București' },
              intermediateStops: [
                { stopSequence: 1, name: 'Piața Victoriei', coords: { latitude: 44.4523, longitude: 26.0864 } },
                { stopSequence: 2, name: 'Universitate', coords: { latitude: 44.4357, longitude: 26.1025 } },
              ],
              geometry: {
                type: 'LineString',
                coordinates: [
                  [26.0747, 44.4475],
                  [26.0864, 44.4523],
                  [26.1025, 44.4357],
                  [26.1026, 44.4276],
                ],
              },
            },
            timings: {
              scheduledDeparture: '2026-10-21T09:50:00+03:00',
              scheduledArrival: '2026-10-21T10:05:00+03:00',
              estimatedDeparture: '2026-10-21T09:50:00+03:00',
              estimatedArrival: '2026-10-21T10:05:00+03:00',
              durationMinutes: 15,
              delayMinutes: 0,
              isRealtime: true,
            },
            risk: {
              legRiskScore: 8,
              historicalPunctualityPercent: 95.0,
              transferBufferAfterMinutes: undefined,
              isShieldedBuffer: true,
              disruptions: [],
            },
            fare: {
              amount: 3.0,
              currency: 'RON',
              ticketCategory: 'URBAN_TRANSIT',
              providerPaymentMethods: ['CONTACTLESS_CARD', 'SMS_VALIDATION'],
            },
            amenities: {
              items: ['AIR_CONDITIONING', 'LOW_FLOOR_ACCESSIBLE'],
              crowdingLevel: 'MEDIUM',
              stepFreeAccess: true,
            },
            instructions: {
              leadText: 'Board STB Express Bus 100 in front of Gara de Nord',
              detailSteps: ['Ride 4 stops via Universitate directly to Piața Unirii'],
              transferNotice: 'Destination reached.',
            },
          },
        ],
        createdAt: '2026-10-21T06:00:00+03:00',
        validUntil: '2026-10-21T12:00:00+03:00',
      },

      // Option 3: Canonical Honey Shielded (Transurb Bus 102 ➔ CFR IR 1572 ➔ Metrorex M2)
      SAMPLE_ROUTE_PLAN_MICRO19_TO_PIATA_UNIRII,
    ];
  }

  // 2. București ➔ Brașov corridor
  if (
    (normOrig.includes('bucur') || normOrig.includes('gara de nord')) &&
    (normDest.includes('brasov') || normDest.includes('gara brasov'))
  ) {
    return [
      // Option 1: Fastest Direct IR (CFR IR 1631)
      SAMPLE_ROUTE_PLAN_BUCHAREST_TO_BRASOV,

      // Option 2: Best Value Regional (Regio Călători R 3005)
      {
        id: 'trip-buc-brasov-regio-02',
        query: {
          origin: { name: origin, city: 'București' },
          destination: { name: destination, city: 'Brașov' },
          departureTime: baseDeparture,
          allowedModes: ['TRAIN'],
          optimizationPreference: 'BEST_VALUE',
        },
        summary: 'CFR Regio R 3005 (Scenic Regional)',
        departureTime: '2026-10-21T07:15:00+03:00',
        arrivalTime: '2026-10-21T10:35:00+03:00',
        totalDurationMinutes: 200,
        totalWalkMinutes: 0,
        totalWalkDistanceMeters: 0,
        transfersCount: 0,
        curatedPillar: 'BEST_VALUE',
        mascotRecommendation: {
          persona: 'honey',
          badgeLabel: 'BUDGET REGIONAL HERO',
          advice: 'Only 29 LEI (€5.80) for a picturesque morning ride through the Carpathian foothills.',
        },
        riskAnalysis: {
          overallRiskScore: 16,
          riskLevel: 'LOW',
          historicalPunctualityRate: 0.89,
          tightestBufferMinutes: 999,
          bufferAdequacy: 'GENEROUS',
          riskSummaryText: 'Direct regional service: zero connection transfers required.',
          factors: [],
        },
        fare: {
          totalAmountLei: 29.0,
          totalAmountEur: 5.8,
          isIntegratedTicketAvailable: true,
          legFares: [
            { legId: 'leg-r-3005', operator: 'CFR Călători', amountLei: 29.0, amountEur: 5.8 },
          ],
        },
        eco: {
          routeEmissionsKgCO2: 4.5,
          carEmissionsKgCO2: 28.5,
          savedKgCO2: 24.0,
          percentageSaved: 84.2,
          treeDaysEquivalent: 4.0,
        },
        legs: [
          {
            id: 'leg-r-3005',
            legIndex: 0,
            transportType: 'TRAIN',
            names: {
              originName: 'București Nord',
              originCity: 'București',
              destinationName: 'Gara Brașov',
              destinationCity: 'Brașov',
              lineCode: 'R 3005',
              lineName: 'București Nord ➔ Brașov (CFR Regio)',
              operatorName: 'CFR Călători',
              operatorShortName: 'CFR Călători',
              headsign: 'Brașov',
              vehicleIdentifier: 'Siemens Desiro Classic',
            },
            coords: {
              originCoords: { latitude: 44.4475, longitude: 26.0747, city: 'București', platform: 'Track 1' },
              destinationCoords: { latitude: 45.6622, longitude: 25.6144, city: 'Brașov', platform: 'Track 2' },
              intermediateStops: [
                { stopSequence: 1, name: 'Ploiești Vest', coords: { latitude: 44.9312, longitude: 26.0023 } },
                { stopSequence: 2, name: 'Câmpina', coords: { latitude: 45.1278, longitude: 25.7289 } },
                { stopSequence: 3, name: 'Sinaia', coords: { latitude: 45.3533, longitude: 25.5539 } },
                { stopSequence: 4, name: 'Bușteni', coords: { latitude: 45.4181, longitude: 25.5367 } },
                { stopSequence: 5, name: 'Azuga', coords: { latitude: 45.4431, longitude: 25.5542 } },
                { stopSequence: 6, name: 'Predeal', coords: { latitude: 45.5036, longitude: 25.5786 } },
              ],
              geometry: {
                type: 'LineString',
                coordinates: [
                  [26.0747, 44.4475],
                  [26.0023, 44.9312],
                  [25.7289, 45.1278],
                  [25.5539, 45.3533],
                  [25.5367, 45.4181],
                  [25.5542, 45.4431],
                  [25.5786, 45.5036],
                  [25.6144, 45.6622],
                ],
              },
            },
            timings: {
              scheduledDeparture: '2026-10-21T07:15:00+03:00',
              scheduledArrival: '2026-10-21T10:35:00+03:00',
              estimatedDeparture: '2026-10-21T07:15:00+03:00',
              estimatedArrival: '2026-10-21T10:35:00+03:00',
              durationMinutes: 200,
              delayMinutes: 0,
              isRealtime: true,
            },
            risk: {
              legRiskScore: 16,
              historicalPunctualityPercent: 89.0,
              isShieldedBuffer: true,
              disruptions: [],
            },
            fare: {
              amount: 29.0,
              currency: 'RON',
              ticketCategory: 'RAIL_REGIO',
              bookingUrl: 'https://bilete.cfrcalatori.ro',
            },
            amenities: {
              items: ['AIR_CONDITIONING', 'RESTROOM', 'BICYCLE_RACK'],
              crowdingLevel: 'MEDIUM',
              stepFreeAccess: true,
            },
            instructions: {
              leadText: 'Board CFR Regio R 3005 at București Nord Track 1',
              detailSteps: ['Scenic ride stopping at all Prahova Valley resorts', 'Arrives at Gara Brașov'],
            },
          },
        ],
        createdAt: '2026-10-21T06:00:00+03:00',
        validUntil: '2026-10-21T12:00:00+03:00',
      },

      // Option 3: Honey Shielded (Metrorex M2 ➔ CFR IR 1633 with 30m shield buffer)
      {
        id: 'trip-buc-brasov-shield-03',
        query: {
          origin: { name: origin, city: 'București' },
          destination: { name: destination, city: 'Brașov' },
          departureTime: baseDeparture,
          allowedModes: ['METRO', 'TRAIN'],
          optimizationPreference: 'SAFE_BUFFERS',
          minimumBufferMinutes: 25,
        },
        summary: 'Metrorex M2 ➔ CFR InterRegio IR 1633 (Honey Shielded)',
        departureTime: '2026-10-21T10:15:00+03:00',
        arrivalTime: '2026-10-21T13:30:00+03:00',
        totalDurationMinutes: 195,
        totalWalkMinutes: 7,
        totalWalkDistanceMeters: 420,
        transfersCount: 1,
        curatedPillar: 'MOST_RELIABLE',
        mascotRecommendation: {
          persona: 'bumble',
          badgeLabel: 'TRANSFER SHIELD GUARD',
          advice: 'Includes a protected 32-min buffer at Gara de Nord concourse. Maximum connection assurance.',
        },
        riskAnalysis: {
          overallRiskScore: 8,
          riskLevel: 'LOW',
          historicalPunctualityRate: 0.94,
          tightestBufferMinutes: 32,
          bufferAdequacy: 'OPTIMAL',
          riskSummaryText: 'Shielded connection: 32-min transfer buffer comfortably exceeds the 25-min Romanian standard.',
          factors: [],
        },
        fare: {
          totalAmountLei: 51.0,
          totalAmountEur: 10.2,
          isIntegratedTicketAvailable: false,
          legFares: [
            { legId: 'leg-m2', operator: 'Metrorex', amountLei: 3.0, amountEur: 0.6 },
            { legId: 'leg-ir-1633', operator: 'CFR Călători', amountLei: 48.0, amountEur: 9.6 },
          ],
        },
        eco: {
          routeEmissionsKgCO2: 5.0,
          carEmissionsKgCO2: 28.5,
          savedKgCO2: 23.5,
          percentageSaved: 82.5,
          treeDaysEquivalent: 3.8,
        },
        legs: [
          {
            id: 'leg-m2',
            legIndex: 0,
            transportType: 'METRO',
            names: {
              originName: origin.includes('Nord') ? 'Piața Romană' : origin,
              originCity: 'București',
              destinationName: 'Gara de Nord 1',
              destinationCity: 'București',
              lineCode: 'M2',
              lineName: 'Metrorex M2 Direct',
              operatorName: 'Metrorex',
              operatorShortName: 'Metrorex',
              headsign: 'Gara de Nord',
              vehicleIdentifier: 'Bombardier Movia',
            },
            coords: {
              originCoords: { latitude: 44.4448, longitude: 26.0975, city: 'București' },
              destinationCoords: { latitude: 44.4468, longitude: 26.0754, city: 'București' },
              intermediateStops: [
                { stopSequence: 1, name: 'Piața Victoriei', coords: { latitude: 44.4523, longitude: 26.0864 } },
              ],
              geometry: {
                type: 'LineString',
                coordinates: [
                  [26.0975, 44.4448],
                  [26.0864, 44.4523],
                  [26.0754, 44.4468],
                ],
              },
            },
            timings: {
              scheduledDeparture: '2026-10-21T10:15:00+03:00',
              scheduledArrival: '2026-10-21T10:28:00+03:00',
              estimatedDeparture: '2026-10-21T10:15:00+03:00',
              estimatedArrival: '2026-10-21T10:28:00+03:00',
              durationMinutes: 13,
              delayMinutes: 0,
              isRealtime: true,
            },
            risk: {
              legRiskScore: 3,
              historicalPunctualityPercent: 99.0,
              transferBufferAfterMinutes: 32,
              isShieldedBuffer: true,
              disruptions: [],
            },
            fare: {
              amount: 3.0,
              currency: 'RON',
              ticketCategory: 'METRO_SINGLE',
              providerPaymentMethods: ['CONTACTLESS_CARD', 'SMS_VALIDATION'],
            },
            amenities: {
              items: ['AIR_CONDITIONING', 'LOW_FLOOR_ACCESSIBLE'],
              crowdingLevel: 'MEDIUM',
              stepFreeAccess: true,
            },
            instructions: {
              leadText: 'Take Metrorex M2 to Gara de Nord',
              detailSteps: ['Exit via north concourse to mainline train platforms'],
              transferNotice: '🛡️ 32 min Romanian Transfer Shield buffer before IR 1633 departure.',
            },
          },
          {
            id: 'leg-ir-1633',
            legIndex: 1,
            transportType: 'TRAIN',
            names: {
              originName: 'București Nord',
              originCity: 'București',
              destinationName: 'Gara Brașov',
              destinationCity: 'Brașov',
              lineCode: 'IR 1633',
              lineName: 'București Nord ➔ Brașov',
              operatorName: 'CFR Călători',
              operatorShortName: 'CFR Călători',
              headsign: 'Brașov',
              vehicleIdentifier: 'Alstom Coradia Stream',
            },
            coords: {
              originCoords: { latitude: 44.4475, longitude: 26.0747, city: 'București' },
              destinationCoords: { latitude: 45.6622, longitude: 25.6144, city: 'Brașov' },
              intermediateStops: [
                { stopSequence: 1, name: 'Ploiești Vest', coords: { latitude: 44.9312, longitude: 26.0023 } },
                { stopSequence: 2, name: 'Sinaia', coords: { latitude: 45.3533, longitude: 25.5539 } },
                { stopSequence: 3, name: 'Predeal', coords: { latitude: 45.5036, longitude: 25.5786 } },
              ],
              geometry: {
                type: 'LineString',
                coordinates: [
                  [26.0747, 44.4475],
                  [26.0023, 44.9312],
                  [25.5539, 45.3533],
                  [25.5786, 45.5036],
                  [25.6144, 45.6622],
                ],
              },
            },
            timings: {
              scheduledDeparture: '2026-10-21T11:00:00+03:00',
              scheduledArrival: '2026-10-21T13:30:00+03:00',
              estimatedDeparture: '2026-10-21T11:00:00+03:00',
              estimatedArrival: '2026-10-21T13:30:00+03:00',
              durationMinutes: 150,
              delayMinutes: 0,
              isRealtime: true,
            },
            risk: {
              legRiskScore: 9,
              historicalPunctualityPercent: 92.0,
              isShieldedBuffer: true,
              disruptions: [],
            },
            fare: {
              amount: 48.0,
              currency: 'RON',
              ticketCategory: 'RAIL_INTERREGIO',
              bookingUrl: 'https://bilete.cfrcalatori.ro',
            },
            amenities: {
              items: ['WIFI', 'POWER_OUTLETS', 'AIR_CONDITIONING', 'RESTROOM'],
              crowdingLevel: 'LOW',
              stepFreeAccess: true,
            },
            instructions: {
              leadText: 'Board CFR InterRegio IR 1633 at Track 4',
              detailSteps: ['Carpathian express through Prahova Valley', 'Arrives at Gara Brașov Track 1'],
            },
          },
        ],
        createdAt: '2026-10-21T06:00:00+03:00',
        validUntil: '2026-10-21T13:00:00+03:00',
      },

      // Option 4: Astra Trans Carpatic Eco Luxury
      {
        id: 'trip-buc-brasov-astra-04',
        query: {
          origin: { name: origin, city: 'București' },
          destination: { name: destination, city: 'Brașov' },
          departureTime: baseDeparture,
          allowedModes: ['TRAIN'],
          optimizationPreference: 'FASTEST',
        },
        summary: 'Astra Trans Carpatic IC 15531 (Electric Panoramic)',
        departureTime: '2026-10-21T14:20:00+03:00',
        arrivalTime: '2026-10-21T16:50:00+03:00',
        totalDurationMinutes: 150,
        totalWalkMinutes: 2,
        totalWalkDistanceMeters: 100,
        transfersCount: 0,
        curatedPillar: 'ECO_HERO',
        mascotRecommendation: {
          persona: 'honey',
          badgeLabel: 'PANORAMIC ECO TRAIN',
          advice: 'Modern Danish IC2 train with power outlets at every seat, espresso bar, and lowest CO2 emissions.',
        },
        riskAnalysis: {
          overallRiskScore: 10,
          riskLevel: 'LOW',
          historicalPunctualityRate: 0.93,
          tightestBufferMinutes: 999,
          bufferAdequacy: 'GENEROUS',
          riskSummaryText: 'Direct private rail operator with excellent track record and high passenger comfort.',
          factors: [],
        },
        fare: {
          totalAmountLei: 58.0,
          totalAmountEur: 11.6,
          isIntegratedTicketAvailable: true,
          legFares: [
            { legId: 'leg-astra-15531', operator: 'Astra Trans Carpatic', amountLei: 58.0, amountEur: 11.6 },
          ],
        },
        eco: {
          routeEmissionsKgCO2: 3.9,
          carEmissionsKgCO2: 28.5,
          savedKgCO2: 24.6,
          percentageSaved: 86.3,
          treeDaysEquivalent: 4.1,
        },
        legs: [
          {
            id: 'leg-astra-15531',
            legIndex: 0,
            transportType: 'TRAIN',
            names: {
              originName: 'București Nord',
              originCity: 'București',
              destinationName: 'Gara Brașov',
              destinationCity: 'Brașov',
              lineCode: 'IC 15531',
              lineName: 'București ➔ Brașov (Astra Carpatic)',
              operatorName: 'Astra Trans Carpatic',
              operatorShortName: 'Astra Trans Carpatic',
              headsign: 'Arad via Brașov',
              vehicleIdentifier: 'AnsaldoBreda IC4 / Astra Vagoane',
            },
            coords: {
              originCoords: { latitude: 44.4475, longitude: 26.0747, city: 'București', platform: 'Track 3' },
              destinationCoords: { latitude: 45.6622, longitude: 25.6144, city: 'Brașov', platform: 'Track 1' },
              intermediateStops: [
                { stopSequence: 1, name: 'Ploiești Vest', coords: { latitude: 44.9312, longitude: 26.0023 } },
                { stopSequence: 2, name: 'Sinaia', coords: { latitude: 45.3533, longitude: 25.5539 } },
              ],
              geometry: {
                type: 'LineString',
                coordinates: [
                  [26.0747, 44.4475],
                  [26.0023, 44.9312],
                  [25.5539, 45.3533],
                  [25.6144, 45.6622],
                ],
              },
            },
            timings: {
              scheduledDeparture: '2026-10-21T14:20:00+03:00',
              scheduledArrival: '2026-10-21T16:50:00+03:00',
              estimatedDeparture: '2026-10-21T14:20:00+03:00',
              estimatedArrival: '2026-10-21T16:50:00+03:00',
              durationMinutes: 150,
              delayMinutes: 0,
              isRealtime: true,
            },
            risk: {
              legRiskScore: 10,
              historicalPunctualityPercent: 93.0,
              isShieldedBuffer: true,
              disruptions: [],
            },
            fare: {
              amount: 58.0,
              currency: 'RON',
              ticketCategory: 'RAIL_INTERREGIO',
              bookingUrl: 'https://astratranscarpatic.ro',
            },
            amenities: {
              items: ['WIFI', 'POWER_OUTLETS', 'AIR_CONDITIONING', 'RESTROOM', 'BICYCLE_RACK'],
              crowdingLevel: 'LOW',
              stepFreeAccess: true,
            },
            instructions: {
              leadText: 'Board Astra Trans Carpatic IC 15531 at București Nord Track 3',
              detailSteps: ['High comfort private carriage service directly to Brașov'],
            },
          },
        ],
        createdAt: '2026-10-21T06:00:00+03:00',
        validUntil: '2026-10-21T18:00:00+03:00',
      },
    ];
  }

  // 3. Dynamic Multi-Modal Generator for any custom pair
  const cleanOrig = origin.trim() || 'Origin Hub';
  const cleanDest = destination.trim() || 'Destination Hub';

  return [
    // Dynamic 1: Fastest InterRegio Direct
    {
      id: `trip-dyn-${cleanOrig}-${cleanDest}-fastest`,
      query: {
        origin: { name: cleanOrig },
        destination: { name: cleanDest },
        departureTime: baseDeparture,
        allowedModes: ['TRAIN'],
        optimizationPreference: 'FASTEST',
      },
      summary: `CFR Călători IR Direct (${cleanOrig} ➔ ${cleanDest})`,
      departureTime: '2026-10-21T08:30:00+03:00',
      arrivalTime: '2026-10-21T11:45:00+03:00',
      totalDurationMinutes: 195,
      totalWalkMinutes: 5,
      totalWalkDistanceMeters: 300,
      transfersCount: 0,
      curatedPillar: 'FASTEST',
      mascotRecommendation: {
        persona: 'barnaby',
        badgeLabel: 'LIGHTNING FASTEST IR',
        advice: `Direct intercity train from ${cleanOrig} directly to ${cleanDest} minimizing transit time.`,
      },
      riskAnalysis: {
        overallRiskScore: 11,
        riskLevel: 'LOW',
        historicalPunctualityRate: 0.92,
        tightestBufferMinutes: 999,
        bufferAdequacy: 'GENEROUS',
        riskSummaryText: 'Zero-transfer direct journey with 92% historical reliability.',
        factors: [],
      },
      fare: {
        totalAmountLei: 68.0,
        totalAmountEur: 13.6,
        isIntegratedTicketAvailable: true,
        legFares: [
          { legId: 'leg-dyn-cfr-1', operator: 'CFR Călători', amountLei: 68.0, amountEur: 13.6 },
        ],
      },
      eco: {
        routeEmissionsKgCO2: 6.8,
        carEmissionsKgCO2: 34.0,
        savedKgCO2: 27.2,
        percentageSaved: 80.0,
        treeDaysEquivalent: 4.5,
      },
      legs: [
        {
          id: 'leg-dyn-cfr-1',
          legIndex: 0,
          transportType: 'TRAIN',
          names: {
            originName: cleanOrig,
            originCity: cleanOrig,
            destinationName: cleanDest,
            destinationCity: cleanDest,
            lineCode: 'IR 1742',
            lineName: `${cleanOrig} ➔ ${cleanDest}`,
            operatorName: 'CFR Călători',
            operatorShortName: 'CFR Călători',
            headsign: cleanDest,
            vehicleIdentifier: 'Alstom Coradia Stream',
          },
          coords: {
            originCoords: { latitude: 44.44, longitude: 26.07 },
            destinationCoords: { latitude: 45.66, longitude: 25.61 },
            intermediateStops: [],
            geometry: {
              type: 'LineString',
              coordinates: [
                [26.07, 44.44],
                [25.61, 45.66],
              ],
            },
          },
          timings: {
            scheduledDeparture: '2026-10-21T08:30:00+03:00',
            scheduledArrival: '2026-10-21T11:45:00+03:00',
            estimatedDeparture: '2026-10-21T08:30:00+03:00',
            estimatedArrival: '2026-10-21T11:45:00+03:00',
            durationMinutes: 195,
            delayMinutes: 0,
            isRealtime: true,
          },
          risk: {
            legRiskScore: 11,
            historicalPunctualityPercent: 92.0,
            isShieldedBuffer: true,
            disruptions: [],
          },
          fare: {
            amount: 68.0,
            currency: 'RON',
            ticketCategory: 'RAIL_INTERREGIO',
            bookingUrl: 'https://bilete.cfrcalatori.ro',
          },
          amenities: {
            items: ['WIFI', 'POWER_OUTLETS', 'AIR_CONDITIONING', 'RESTROOM'],
            crowdingLevel: 'LOW',
            stepFreeAccess: true,
          },
          instructions: {
            leadText: `Board direct CFR InterRegio connection from ${cleanOrig} to ${cleanDest}`,
          },
        },
      ],
      createdAt: '2026-10-21T06:00:00+03:00',
      validUntil: '2026-10-21T12:00:00+03:00',
    },

    // Dynamic 2: Best Value Regional (Transferoviar Călători / TFC)
    {
      id: `trip-dyn-${cleanOrig}-${cleanDest}-value`,
      query: {
        origin: { name: cleanOrig },
        destination: { name: cleanDest },
        departureTime: baseDeparture,
        allowedModes: ['TRAIN'],
        optimizationPreference: 'BEST_VALUE',
      },
      summary: `TFC Regional Saver (${cleanOrig} ➔ ${cleanDest})`,
      departureTime: '2026-10-21T07:45:00+03:00',
      arrivalTime: '2026-10-21T11:35:00+03:00',
      totalDurationMinutes: 230,
      totalWalkMinutes: 4,
      totalWalkDistanceMeters: 220,
      transfersCount: 0,
      curatedPillar: 'BEST_VALUE',
      mascotRecommendation: {
        persona: 'honey',
        badgeLabel: 'BEST VALUE SAVER',
        advice: 'Smart low-cost rail fare matching the €10/hour rule with clean regional rolling stock.',
      },
      riskAnalysis: {
        overallRiskScore: 17,
        riskLevel: 'LOW',
        historicalPunctualityRate: 0.9,
        tightestBufferMinutes: 999,
        bufferAdequacy: 'GENEROUS',
        riskSummaryText: 'Direct economical transit with low connection risk.',
        factors: [],
      },
      fare: {
        totalAmountLei: 38.0,
        totalAmountEur: 7.6,
        isIntegratedTicketAvailable: true,
        legFares: [
          { legId: 'leg-dyn-tfc-1', operator: 'Transferoviar Călători', amountLei: 38.0, amountEur: 7.6 },
        ],
      },
      eco: {
        routeEmissionsKgCO2: 5.9,
        carEmissionsKgCO2: 34.0,
        savedKgCO2: 28.1,
        percentageSaved: 82.6,
        treeDaysEquivalent: 4.7,
      },
      legs: [
        {
          id: 'leg-dyn-tfc-1',
          legIndex: 0,
          transportType: 'TRAIN',
          names: {
            originName: cleanOrig,
            originCity: cleanOrig,
            destinationName: cleanDest,
            destinationCity: cleanDest,
            lineCode: 'R 15024',
            lineName: `${cleanOrig} ➔ ${cleanDest} (TFC)`,
            operatorName: 'Transferoviar Călători',
            operatorShortName: 'Transferoviar Călători',
            headsign: cleanDest,
            vehicleIdentifier: 'Bombardier Talent',
          },
          coords: {
            originCoords: { latitude: 44.44, longitude: 26.07 },
            destinationCoords: { latitude: 45.66, longitude: 25.61 },
            intermediateStops: [],
            geometry: {
              type: 'LineString',
              coordinates: [
                [26.07, 44.44],
                [25.61, 45.66],
              ],
            },
          },
          timings: {
            scheduledDeparture: '2026-10-21T07:45:00+03:00',
            scheduledArrival: '2026-10-21T11:35:00+03:00',
            estimatedDeparture: '2026-10-21T07:45:00+03:00',
            estimatedArrival: '2026-10-21T11:35:00+03:00',
            durationMinutes: 230,
            delayMinutes: 0,
            isRealtime: true,
          },
          risk: {
            legRiskScore: 17,
            historicalPunctualityPercent: 90.0,
            isShieldedBuffer: true,
            disruptions: [],
          },
          fare: {
            amount: 38.0,
            currency: 'RON',
            ticketCategory: 'RAIL_REGIO',
            bookingUrl: 'https://transferoviarcalatori.ro',
          },
          amenities: {
            items: ['AIR_CONDITIONING', 'POWER_OUTLETS', 'RESTROOM'],
            crowdingLevel: 'LOW',
            stepFreeAccess: true,
          },
          instructions: {
            leadText: `Board economical TFC Regional train towards ${cleanDest}`,
          },
        },
      ],
      createdAt: '2026-10-21T06:00:00+03:00',
      validUntil: '2026-10-21T12:00:00+03:00',
    },

    // Dynamic 3: Most Reliable Honey Shielded Multi-Modal
    {
      id: `trip-dyn-${cleanOrig}-${cleanDest}-shield`,
      query: {
        origin: { name: cleanOrig },
        destination: { name: cleanDest },
        departureTime: baseDeparture,
        allowedModes: ['BUS', 'TRAIN', 'METRO'],
        optimizationPreference: 'SAFE_BUFFERS',
        minimumBufferMinutes: 25,
      },
      summary: `Urban Feeder Bus ➔ CFR IR (Honey Shield Protected)`,
      departureTime: '2026-10-21T07:10:00+03:00',
      arrivalTime: '2026-10-21T11:00:00+03:00',
      totalDurationMinutes: 230,
      totalWalkMinutes: 8,
      totalWalkDistanceMeters: 480,
      transfersCount: 1,
      curatedPillar: 'MOST_RELIABLE',
      mascotRecommendation: {
        persona: 'bumble',
        badgeLabel: 'HONEY SHIELD PROTECTED',
        advice: 'Optimal 28 min connection buffer protects against Romanian rail delays.',
      },
      riskAnalysis: {
        overallRiskScore: 13,
        riskLevel: 'LOW',
        historicalPunctualityRate: 0.93,
        tightestBufferMinutes: 28,
        bufferAdequacy: 'OPTIMAL',
        riskSummaryText: 'Shielded connection: 28 min transfer buffer ensures connection safety.',
        factors: [],
      },
      fare: {
        totalAmountLei: 59.0,
        totalAmountEur: 11.8,
        isIntegratedTicketAvailable: false,
        legFares: [
          { legId: 'leg-dyn-bus-1', operator: 'STB', amountLei: 3.0, amountEur: 0.6 },
          { legId: 'leg-dyn-cfr-2', operator: 'CFR Călători', amountLei: 56.0, amountEur: 11.2 },
        ],
      },
      eco: {
        routeEmissionsKgCO2: 7.0,
        carEmissionsKgCO2: 34.0,
        savedKgCO2: 27.0,
        percentageSaved: 79.4,
        treeDaysEquivalent: 4.5,
      },
      legs: [
        {
          id: 'leg-dyn-bus-1',
          legIndex: 0,
          transportType: 'BUS',
          names: {
            originName: cleanOrig,
            originCity: cleanOrig,
            destinationName: `${cleanOrig} Central Terminal`,
            destinationCity: cleanOrig,
            lineCode: 'Line 1',
            lineName: `${cleanOrig} Feeder Bus`,
            operatorName: 'STB',
            operatorShortName: 'STB',
            headsign: 'Central Terminal',
            vehicleIdentifier: 'Solaris Urbino Electric',
          },
          coords: {
            originCoords: { latitude: 44.44, longitude: 26.07 },
            destinationCoords: { latitude: 44.45, longitude: 26.08 },
            intermediateStops: [],
            geometry: {
              type: 'LineString',
              coordinates: [
                [26.07, 44.44],
                [26.08, 44.45],
              ],
            },
          },
          timings: {
            scheduledDeparture: '2026-10-21T07:10:00+03:00',
            scheduledArrival: '2026-10-21T07:25:00+03:00',
            estimatedDeparture: '2026-10-21T07:10:00+03:00',
            estimatedArrival: '2026-10-21T07:25:00+03:00',
            durationMinutes: 15,
            delayMinutes: 0,
            isRealtime: true,
          },
          risk: {
            legRiskScore: 6,
            historicalPunctualityPercent: 96.0,
            transferBufferAfterMinutes: 28,
            isShieldedBuffer: true,
            disruptions: [],
          },
          fare: {
            amount: 3.0,
            currency: 'RON',
            ticketCategory: 'URBAN_TRANSIT',
          },
          amenities: {
            items: ['AIR_CONDITIONING', 'LOW_FLOOR_ACCESSIBLE'],
            crowdingLevel: 'LOW',
            stepFreeAccess: true,
          },
          instructions: {
            leadText: `Ride local feeder bus to ${cleanOrig} Central Terminal`,
            transferNotice: '🛡️ 28 min Romanian Transfer Shield buffer before boarding train.',
          },
        },
        {
          id: 'leg-dyn-cfr-2',
          legIndex: 1,
          transportType: 'TRAIN',
          names: {
            originName: `${cleanOrig} Central Terminal`,
            originCity: cleanOrig,
            destinationName: cleanDest,
            destinationCity: cleanDest,
            lineCode: 'IR 1622',
            lineName: `${cleanOrig} ➔ ${cleanDest}`,
            operatorName: 'CFR Călători',
            operatorShortName: 'CFR Călători',
            headsign: cleanDest,
            vehicleIdentifier: 'Softronic Transmontana',
          },
          coords: {
            originCoords: { latitude: 44.45, longitude: 26.08 },
            destinationCoords: { latitude: 45.66, longitude: 25.61 },
            intermediateStops: [],
            geometry: {
              type: 'LineString',
              coordinates: [
                [26.08, 44.45],
                [25.61, 45.66],
              ],
            },
          },
          timings: {
            scheduledDeparture: '2026-10-21T07:53:00+03:00',
            scheduledArrival: '2026-10-21T11:00:00+03:00',
            estimatedDeparture: '2026-10-21T07:53:00+03:00',
            estimatedArrival: '2026-10-21T11:00:00+03:00',
            durationMinutes: 187,
            delayMinutes: 0,
            isRealtime: true,
          },
          risk: {
            legRiskScore: 12,
            historicalPunctualityPercent: 92.0,
            isShieldedBuffer: true,
            disruptions: [],
          },
          fare: {
            amount: 56.0,
            currency: 'RON',
            ticketCategory: 'RAIL_INTERREGIO',
          },
          amenities: {
            items: ['WIFI', 'POWER_OUTLETS', 'AIR_CONDITIONING', 'RESTROOM'],
            crowdingLevel: 'MEDIUM',
            stepFreeAccess: true,
          },
          instructions: {
            leadText: `Board connection IR 1622 directly to ${cleanDest}`,
          },
        },
      ],
      createdAt: '2026-10-21T06:00:00+03:00',
      validUntil: '2026-10-21T12:00:00+03:00',
    },
  ];
}

/**
 * Filter and sort multi-modal transit trips.
 */
export function filterAndSortTrips(
  trips: TransitRoutePlan[],
  filters: TripFilterState
): TransitRoutePlan[] {
  let result = [...trips];

  // 1. Curated Pillar filter
  if (filters.pillar && filters.pillar !== 'ALL') {
    result = result.filter((t) => t.curatedPillar === filters.pillar);
  }

  // 2. Transport modes filter
  if (filters.modes && filters.modes.length > 0) {
    result = result.filter((t) =>
      t.legs.some((leg) => filters.modes.includes(leg.transportType))
    );
  }

  // 3. Provider/Operator filter
  if (filters.providers && filters.providers.length > 0) {
    result = result.filter((t) =>
      t.legs.some((leg) => {
        const opShort = leg.names.operatorShortName || '';
        const opFull = leg.names.operatorName || '';
        return filters.providers.some(
          (p) =>
            opShort.toLowerCase().includes(p.toLowerCase()) ||
            opFull.toLowerCase().includes(p.toLowerCase()) ||
            p.toLowerCase().includes(opShort.toLowerCase())
        );
      })
    );
  }

  // 4. Max price filter (LEI)
  if (filters.maxPriceLei !== undefined && filters.maxPriceLei > 0) {
    result = result.filter((t) => t.fare.totalAmountLei <= filters.maxPriceLei!);
  }

  // 5. Max duration filter (Minutes)
  if (filters.maxDurationMinutes !== undefined && filters.maxDurationMinutes > 0) {
    result = result.filter((t) => t.totalDurationMinutes <= filters.maxDurationMinutes!);
  }

  // 6. Sorting
  result.sort((a, b) => {
    let cmp = 0;
    switch (filters.sortBy) {
      case 'departure':
        cmp = new Date(a.departureTime).getTime() - new Date(b.departureTime).getTime();
        break;
      case 'duration':
        cmp = a.totalDurationMinutes - b.totalDurationMinutes;
        break;
      case 'price':
        cmp = a.fare.totalAmountLei - b.fare.totalAmountLei;
        break;
      case 'risk':
        cmp = a.riskAnalysis.overallRiskScore - b.riskAnalysis.overallRiskScore;
        break;
      default:
        cmp = 0;
    }

    return filters.sortOrder === 'desc' ? -cmp : cmp;
  });

  return result;
}

/**
 * Converts a multi-modal TransitRoutePlan into a standard TrainJourney
 * so it can be booked directly into TripContext.
 */
export function convertRoutePlanToTrainJourney(plan: TransitRoutePlan): TrainJourney {
  const mainTrainLeg = plan.legs.find((l) => l.transportType === 'TRAIN') || plan.legs[0];

  const uniqueAmenities: Amenity[] = [];
  plan.legs.forEach((leg) => {
    leg.amenities.items.forEach((item) => {
      if (item === 'WIFI' && !uniqueAmenities.includes('WIFI')) uniqueAmenities.push('WIFI');
      if (item === 'POWER_OUTLETS' && !uniqueAmenities.includes('POWER_OUTLETS'))
        uniqueAmenities.push('POWER_OUTLETS');
      if (item === 'AIR_CONDITIONING' && !uniqueAmenities.includes('AIR_CONDITIONING' as any)) {
        // map to Amenity type
      }
      if (item === 'BICYCLE_RACK' && !uniqueAmenities.includes('BIKE_STORAGE'))
        uniqueAmenities.push('BIKE_STORAGE');
      if (item === 'LOW_FLOOR_ACCESSIBLE' && !uniqueAmenities.includes('WHEELCHAIR_ACCESSIBLE'))
        uniqueAmenities.push('WHEELCHAIR_ACCESSIBLE');
    });
  });

  if (uniqueAmenities.length === 0) {
    uniqueAmenities.push('WIFI', 'POWER_OUTLETS');
  }

  const fares: TrainFare[] = [
    {
      classType: 'STANDARD',
      price: plan.fare.totalAmountLei,
      currency: 'RON',
      seatsAvailable: 28,
    },
    {
      classType: 'FIRST',
      price: Math.round(plan.fare.totalAmountLei * 1.45),
      currency: 'RON',
      seatsAvailable: 10,
    },
  ];

  const stops: TrainStop[] = plan.legs.map((leg, index) => ({
    stopNumber: index + 1,
    station: {
      code: leg.names.originCity ? leg.names.originCity.slice(0, 3).toUpperCase() : 'DEP',
      name: leg.names.originName,
      city: leg.names.originCity,
      platform: leg.coords.originCoords.platform,
    },
    scheduledDeparture: leg.timings.scheduledDeparture,
    actualDeparture: leg.timings.estimatedDeparture,
  }));

  const lastLeg = plan.legs[plan.legs.length - 1];
  stops.push({
    stopNumber: plan.legs.length + 1,
    station: {
      code: lastLeg.names.destinationCity
        ? lastLeg.names.destinationCity.slice(0, 3).toUpperCase()
        : 'ARR',
      name: lastLeg.names.destinationName,
      city: lastLeg.names.destinationCity,
      platform: lastLeg.coords.destinationCoords.platform,
    },
    scheduledArrival: lastLeg.timings.scheduledArrival,
    actualArrival: lastLeg.timings.estimatedArrival,
  });

  const operators = Array.from(
    new Set(plan.legs.map((l) => l.names.operatorShortName || l.names.operatorName || 'Transit'))
  );

  return {
    id: plan.id,
    trainNumber: mainTrainLeg.names.lineCode || plan.summary.slice(0, 24),
    operator: operators.join(' + '),
    origin: {
      code: plan.query.origin.city?.slice(0, 3).toUpperCase() || 'DEP',
      name: plan.query.origin.name,
      city: plan.query.origin.city || '',
    },
    destination: {
      code: plan.query.destination.city?.slice(0, 3).toUpperCase() || 'ARR',
      name: plan.query.destination.name,
      city: plan.query.destination.city || '',
    },
    departureTime: plan.departureTime,
    arrivalTime: plan.arrivalTime,
    durationMinutes: plan.totalDurationMinutes,
    durationFormatted: `${Math.floor(plan.totalDurationMinutes / 60)}h ${
      plan.totalDurationMinutes % 60
    }m`,
    status: 'ON_TIME',
    delayMinutes: 0,
    fares,
    stops,
    amenities: uniqueAmenities,
    carbonFootprintKg: plan.eco.routeEmissionsKgCO2,
  };
}
