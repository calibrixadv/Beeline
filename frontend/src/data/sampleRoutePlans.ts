import { TransitRoutePlan } from '../types/routePlan';

/**
 * Canonical Sample Route Plan 1: Multi-modal door-to-door transit
 * Galați Micro 19 ➔ București Piața Unirii
 * (Transurb Bus 102 ➔ CFR IR 1572 ➔ Metrorex M2)
 */
export const SAMPLE_ROUTE_PLAN_MICRO19_TO_PIATA_UNIRII: TransitRoutePlan = {
  id: 'itinerary-gl-micro19-buc-piata-unirii-001',
  query: {
    origin: {
      name: 'Micro 19',
      city: 'Galați',
      coords: { latitude: 45.4125, longitude: 27.9982, city: 'Galați', platform: 'B' },
    },
    destination: {
      name: 'Piața Unirii',
      city: 'București',
      coords: { latitude: 44.4276, longitude: 26.1026, city: 'București', platform: 'Piața Unirii 1/2' },
    },
    departureTime: '2026-10-21T06:40:00+03:00',
    allowedModes: ['BUS', 'TRAIN', 'METRO', 'WALK'],
    optimizationPreference: 'SAFE_BUFFERS',
    minimumBufferMinutes: 25,
  },
  summary: 'Transurb Bus 102 ➔ CFR IR 1572 ➔ Metrorex M2',
  departureTime: '2026-10-21T06:40:00+03:00',
  arrivalTime: '2026-10-21T11:15:00+03:00',
  totalDurationMinutes: 275,
  totalWalkMinutes: 12,
  totalWalkDistanceMeters: 680,
  transfersCount: 2,
  curatedPillar: 'MOST_RELIABLE',
  mascotRecommendation: {
    persona: 'bumble',
    badgeLabel: 'HONEY SHIELD PROTECTED',
    advice: 'Solid 28-min buffer at Gara Galați and 20-min buffer at Gara de Nord guarantee connection success.',
  },
  riskAnalysis: {
    overallRiskScore: 14,
    riskLevel: 'LOW',
    historicalPunctualityRate: 0.92,
    tightestBufferMinutes: 20,
    bufferAdequacy: 'OPTIMAL',
    riskSummaryText: 'Shielded connection: 20-min transfer buffer safely absorbs standard Romanian transit delays.',
    factors: [
      {
        code: 'SINGLE_TRACK_RAIL',
        severity: 'INFO',
        description: 'Single-track railway segment on Galați-Făurei branch.',
        affectedLegIndex: 1,
      },
    ],
  },
  fare: {
    totalAmountLei: 69.00,
    totalAmountEur: 13.80,
    isIntegratedTicketAvailable: false,
    legFares: [
      { legId: 'leg-1', operator: 'Transurb S.A. Galați', amountLei: 3.00, amountEur: 0.60 },
      { legId: 'leg-2', operator: 'CFR Călători', amountLei: 63.00, amountEur: 12.60 },
      { legId: 'leg-3', operator: 'Metrorex', amountLei: 3.00, amountEur: 0.60 },
    ],
  },
  eco: {
    routeEmissionsKgCO2: 8.4,
    carEmissionsKgCO2: 42.1,
    savedKgCO2: 33.7,
    percentageSaved: 80.0,
    treeDaysEquivalent: 5.6,
  },
  legs: [
    {
      id: 'leg-1',
      legIndex: 0,
      transportType: 'BUS',
      names: {
        originName: 'Micro 19',
        originCity: 'Galați',
        destinationName: 'Gara CFR Galați',
        destinationCity: 'Galați',
        lineCode: '102',
        lineName: 'Micro 19 ⇄ Gara CFR Galați',
        operatorName: 'Transurb S.A. Galați',
        operatorShortName: 'Transurb',
        headsign: 'Gara CFR',
        vehicleIdentifier: 'Solaris Urbino 12',
      },
      coords: {
        originCoords: { latitude: 45.4125, longitude: 27.9982, city: 'Galați', platform: 'B' },
        destinationCoords: { latitude: 45.4418, longitude: 28.0583, city: 'Galați', platform: 'Terminal Gara' },
        intermediateStops: [
          { stopSequence: 1, name: 'Țiglina 1', coords: { latitude: 45.4241, longitude: 28.0256 } },
          { stopSequence: 2, name: 'Mazepa', coords: { latitude: 45.4312, longitude: 28.0415 } },
        ],
        geometry: {
          type: 'LineString',
          coordinates: [
            [27.9982, 45.4125],
            [28.0256, 45.4241],
            [28.0415, 45.4312],
            [28.0583, 45.4418],
          ],
        },
      },
      timings: {
        scheduledDeparture: '2026-10-21T06:40:00+03:00',
        scheduledArrival: '2026-10-21T07:07:00+03:00',
        estimatedDeparture: '2026-10-21T06:40:00+03:00',
        estimatedArrival: '2026-10-21T07:07:00+03:00',
        durationMinutes: 27,
        delayMinutes: 0,
        isRealtime: true,
      },
      risk: {
        legRiskScore: 8,
        historicalPunctualityPercent: 94.0,
        transferBufferAfterMinutes: 28,
        isShieldedBuffer: true,
        disruptions: [],
      },
      fare: {
        amount: 3.00,
        currency: 'RON',
        ticketCategory: 'URBAN_TRANSIT',
        providerPaymentMethods: ['24PAY', 'SMS_VALIDATION', 'CONTACTLESS_CARD'],
      },
      amenities: {
        items: ['AIR_CONDITIONING', 'LOW_FLOOR_ACCESSIBLE'],
        crowdingLevel: 'MEDIUM',
        stepFreeAccess: true,
      },
      instructions: {
        leadText: 'Board Transurb Bus 102 at Micro 19 Terminus Platform B',
        detailSteps: ['Ride 12 stops via Brăilei St to Gara CFR Galați'],
        transferNotice: 'Exit bus and walk 80m into Gara Galați main concourse. Track 2.',
      },
    },
    {
      id: 'leg-2',
      legIndex: 1,
      transportType: 'TRAIN',
      names: {
        originName: 'Gara Galați',
        originCity: 'Galați',
        destinationName: 'București Nord',
        destinationCity: 'București',
        lineCode: 'IR 1572',
        lineName: 'Galați ➔ București Nord (CFR InterRegio)',
        operatorName: 'CFR Călători S.A.',
        operatorShortName: 'CFR',
        headsign: 'București Nord',
        vehicleIdentifier: 'Electroputere LE 5100kW + 4 Vagoane 20-76',
      },
      coords: {
        originCoords: { latitude: 45.4418, longitude: 28.0583, city: 'Galați', platform: 'Line 2' },
        destinationCoords: { latitude: 44.4475, longitude: 26.0747, city: 'București', platform: 'Line 5' },
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
        scheduledDeparture: '2026-10-21T07:35:00+03:00',
        scheduledArrival: '2026-10-21T10:45:00+03:00',
        estimatedDeparture: '2026-10-21T07:35:00+03:00',
        estimatedArrival: '2026-10-21T10:45:00+03:00',
        durationMinutes: 190,
        delayMinutes: 0,
        isRealtime: true,
      },
      risk: {
        legRiskScore: 18,
        historicalPunctualityPercent: 87.0,
        transferBufferAfterMinutes: 20,
        isShieldedBuffer: true,
        disruptions: [],
      },
      fare: {
        amount: 63.00,
        currency: 'RON',
        ticketCategory: 'RAIL_INTERREGIO',
        bookingUrl: 'https://bilete.cfrcalatori.ro',
        providerPaymentMethods: ['CFR_TICKET_OFFICE', 'CONTACTLESS_CARD'],
      },
      amenities: {
        items: ['POWER_OUTLETS', 'AIR_CONDITIONING', 'RESTROOM', 'LUGGAGE_STORAGE'],
        crowdingLevel: 'MEDIUM',
        stepFreeAccess: false,
      },
      instructions: {
        leadText: 'Board CFR InterRegio IR 1572 on Track 2',
        detailSteps: ['Direct express via Brăila, Buzău, and Ploiești Sud to București Nord'],
        transferNotice: 'Follow underground walkway directly from Gara de Nord concourse to Metrorex M1/M2 lines.',
      },
    },
    {
      id: 'leg-3',
      legIndex: 2,
      transportType: 'METRO',
      names: {
        originName: 'Gara de Nord 1',
        originCity: 'București',
        destinationName: 'Piața Unirii',
        destinationCity: 'București',
        lineCode: 'M2',
        lineName: 'Pipera ⇄ Piața Unirii ⇄ Berceni',
        operatorName: 'Metrorex S.A.',
        operatorShortName: 'Metrorex',
        headsign: 'Berceni',
        vehicleIdentifier: 'Bombardier Movia 346',
      },
      coords: {
        originCoords: { latitude: 44.4468, longitude: 26.0754, city: 'București', platform: 'Platform 1' },
        destinationCoords: { latitude: 44.4276, longitude: 26.1026, city: 'București', platform: 'Piața Unirii 1/2' },
        intermediateStops: [
          { stopSequence: 1, name: 'Piața Victoriei', coords: { latitude: 44.4523, longitude: 26.0864 } },
          { stopSequence: 2, name: 'Piața Romană', coords: { latitude: 44.4448, longitude: 26.0975 } },
          { stopSequence: 3, name: 'Universitate', coords: { latitude: 44.4357, longitude: 26.1025 } },
        ],
        geometry: {
          type: 'LineString',
          coordinates: [
            [26.0754, 44.4468],
            [26.0864, 44.4523],
            [26.0975, 44.4448],
            [26.1025, 44.4357],
            [26.1026, 44.4276],
          ],
        },
      },
      timings: {
        scheduledDeparture: '2026-10-21T11:05:00+03:00',
        scheduledArrival: '2026-10-21T11:15:00+03:00',
        estimatedDeparture: '2026-10-21T11:05:00+03:00',
        estimatedArrival: '2026-10-21T11:15:00+03:00',
        durationMinutes: 10,
        delayMinutes: 0,
        isRealtime: true,
      },
      risk: {
        legRiskScore: 3,
        historicalPunctualityPercent: 98.5,
        isShieldedBuffer: true,
        disruptions: [],
      },
      fare: {
        amount: 3.00,
        currency: 'RON',
        ticketCategory: 'METRO_SINGLE',
        providerPaymentMethods: ['CONTACTLESS_CARD', 'SMS_VALIDATION'],
      },
      amenities: {
        items: ['AIR_CONDITIONING', 'LOW_FLOOR_ACCESSIBLE'],
        crowdingLevel: 'HIGH',
        stepFreeAccess: true,
      },
      instructions: {
        leadText: 'Take Metrorex M2 toward Berceni',
        detailSteps: ['Ride 3 stops via Piața Romană and Universitate', 'Alight at Piața Unirii'],
        transferNotice: 'Arrived at destination: Piața Unirii București.',
      },
    },
  ],
  createdAt: '2026-10-20T20:10:00+03:00',
  validUntil: '2026-10-21T06:30:00+03:00',
};

/**
 * Canonical Sample Route Plan 2: Direct Intercity Rail Corridor
 * București Nord ➔ Gara Brașov
 * (CFR Călători InterRegio IR 1631)
 */
export const SAMPLE_ROUTE_PLAN_BUCHAREST_TO_BRASOV: TransitRoutePlan = {
  id: 'itinerary-buc-brasov-direct-002',
  query: {
    origin: {
      name: 'București Nord',
      city: 'București',
      coords: { latitude: 44.4475, longitude: 26.0747, city: 'București', platform: 'Line 3' },
    },
    destination: {
      name: 'Gara Brașov',
      city: 'Brașov',
      coords: { latitude: 45.6622, longitude: 25.6144, city: 'Brașov', platform: 'Line 1' },
    },
    departureTime: '2026-10-21T09:00:00+03:00',
    allowedModes: ['TRAIN'],
    optimizationPreference: 'FASTEST',
  },
  summary: 'CFR InterRegio IR 1631 (Direct)',
  departureTime: '2026-10-21T09:00:00+03:00',
  arrivalTime: '2026-10-21T11:25:00+03:00',
  totalDurationMinutes: 145,
  totalWalkMinutes: 0,
  totalWalkDistanceMeters: 0,
  transfersCount: 0,
  curatedPillar: 'FASTEST',
  mascotRecommendation: {
    persona: 'barnaby',
    badgeLabel: 'LIGHTNING DIRECT CORRIDOR',
    advice: 'Fastest 2h 25m transit through the Prahova Valley bypassing all DN1 weekend traffic jams.',
  },
  riskAnalysis: {
    overallRiskScore: 7,
    riskLevel: 'LOW',
    historicalPunctualityRate: 0.90,
    tightestBufferMinutes: 999,
    bufferAdequacy: 'GENEROUS',
    riskSummaryText: 'Direct route with 0 transfers: zero connection risk.',
    factors: [],
  },
  fare: {
    totalAmountLei: 48.00,
    totalAmountEur: 9.60,
    isIntegratedTicketAvailable: true,
    legFares: [
      { legId: 'leg-ir-1631', operator: 'CFR Călători', amountLei: 48.00, amountEur: 9.60 },
    ],
  },
  eco: {
    routeEmissionsKgCO2: 4.8,
    carEmissionsKgCO2: 28.5,
    savedKgCO2: 23.7,
    percentageSaved: 83.2,
    treeDaysEquivalent: 3.9,
  },
  legs: [
    {
      id: 'leg-ir-1631',
      legIndex: 0,
      transportType: 'TRAIN',
      names: {
        originName: 'București Nord',
        originCity: 'București',
        destinationName: 'Gara Brașov',
        destinationCity: 'Brașov',
        lineCode: 'IR 1631',
        lineName: 'București Nord ➔ Brașov (CFR InterRegio)',
        operatorName: 'CFR Călători S.A.',
        operatorShortName: 'CFR',
        headsign: 'Brașov',
        vehicleIdentifier: 'Alstom Coradia Stream / Softronic Transmontana',
      },
      coords: {
        originCoords: { latitude: 44.4475, longitude: 26.0747, city: 'București', platform: 'Line 3' },
        destinationCoords: { latitude: 45.6622, longitude: 25.6144, city: 'Brașov', platform: 'Line 1' },
        intermediateStops: [
          { stopSequence: 1, name: 'Ploiești Vest', coords: { latitude: 44.9312, longitude: 26.0023 } },
          { stopSequence: 2, name: 'Câmpina', coords: { latitude: 45.1278, longitude: 25.7289 } },
          { stopSequence: 3, name: 'Sinaia', coords: { latitude: 45.3533, longitude: 25.5539 } },
          { stopSequence: 4, name: 'Bușteni', coords: { latitude: 45.4181, longitude: 25.5367 } },
          { stopSequence: 5, name: 'Predeal', coords: { latitude: 45.5036, longitude: 25.5786 } },
        ],
        geometry: {
          type: 'LineString',
          coordinates: [
            [26.0747, 44.4475],
            [26.0023, 44.9312],
            [25.7289, 45.1278],
            [25.5539, 45.3533],
            [25.5367, 45.4181],
            [25.5786, 45.5036],
            [25.6144, 45.6622],
          ],
        },
      },
      timings: {
        scheduledDeparture: '2026-10-21T09:00:00+03:00',
        scheduledArrival: '2026-10-21T11:25:00+03:00',
        estimatedDeparture: '2026-10-21T09:00:00+03:00',
        estimatedArrival: '2026-10-21T11:25:00+03:00',
        durationMinutes: 145,
        delayMinutes: 0,
        isRealtime: true,
      },
      risk: {
        legRiskScore: 7,
        historicalPunctualityPercent: 90.0,
        isShieldedBuffer: true,
        disruptions: [],
      },
      fare: {
        amount: 48.00,
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
        leadText: 'Board CFR InterRegio IR 1631 at București Nord Track 3',
        detailSteps: ['Scenic Carpathian mountain ascent via Sinaia, Bușteni, and Predeal pass', 'Arrive at Gara Brașov'],
        transferNotice: 'Trip complete. Connect to RATBV urban buses in Brașov station forecourt.',
      },
    },
  ],
  createdAt: '2026-10-20T20:10:00+03:00',
  validUntil: '2026-10-21T09:00:00+03:00',
};

export const SAMPLE_ROUTE_PLANS: TransitRoutePlan[] = [
  SAMPLE_ROUTE_PLAN_MICRO19_TO_PIATA_UNIRII,
  SAMPLE_ROUTE_PLAN_BUCHAREST_TO_BRASOV,
];
