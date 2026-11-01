import { TrainJourney } from '../types/train';

export const SAMPLE_TRAINS: TrainJourney[] = [
  {
    id: 'TR-FR-6612',
    trainNumber: 'TGV INOUI 6612',
    operator: 'SNCF',
    origin: {
      code: 'PAR-GDL',
      name: 'Paris Gare de Lyon',
      city: 'Paris',
      platform: 'Hall 1, Voie 3'
    },
    destination: {
      code: 'LYO-LPD',
      name: 'Lyon Part-Dieu',
      city: 'Lyon',
      platform: 'Voie E'
    },
    departureTime: '2026-10-15T08:14:00',
    arrivalTime: '2026-10-15T10:10:00',
    durationMinutes: 116,
    durationFormatted: '1h 56m',
    status: 'ON_TIME',
    delayMinutes: 0,
    fares: [
      { classType: 'STANDARD', price: 49.0, currency: 'EUR', seatsAvailable: 28 },
      { classType: 'FIRST', price: 79.0, currency: 'EUR', seatsAvailable: 12 },
      { classType: 'BUSINESS', price: 115.0, currency: 'EUR', seatsAvailable: 6 }
    ],
    stops: [
      {
        stopNumber: 1,
        station: { code: 'PAR-GDL', name: 'Paris Gare de Lyon', city: 'Paris', platform: '3' },
        scheduledDeparture: '08:14'
      },
      {
        stopNumber: 2,
        station: { code: 'LE-CREUSOT', name: 'Le Creusot TGV', city: 'Le Creusot', platform: '1' },
        scheduledArrival: '09:30',
        scheduledDeparture: '09:32'
      },
      {
        stopNumber: 3,
        station: { code: 'LYO-LPD', name: 'Lyon Part-Dieu', city: 'Lyon', platform: 'E' },
        scheduledArrival: '10:10'
      }
    ],
    amenities: ['WIFI', 'POWER_OUTLETS', 'DINING_CAR', 'WHEELCHAIR_ACCESSIBLE', 'QUIET_ZONE'],
    carbonFootprintKg: 3.2
  },
  {
    id: 'TR-DE-921',
    trainNumber: 'ICE 921',
    operator: 'Deutsche Bahn',
    origin: {
      code: 'FRA-HBF',
      name: 'Frankfurt (Main) Hbf',
      city: 'Frankfurt',
      platform: 'Gleis 8'
    },
    destination: {
      code: 'MUC-HBF',
      name: 'München Hbf',
      city: 'Munich',
      platform: 'Gleis 19'
    },
    departureTime: '2026-10-15T09:20:00',
    arrivalTime: '2026-10-15T12:35:00',
    durationMinutes: 195,
    durationFormatted: '3h 15m',
    status: 'DELAYED',
    delayMinutes: 18,
    fares: [
      { classType: 'STANDARD', price: 65.5, currency: 'EUR', seatsAvailable: 44 },
      { classType: 'FIRST', price: 108.0, currency: 'EUR', seatsAvailable: 19 }
    ],
    stops: [
      {
        stopNumber: 1,
        station: { code: 'FRA-HBF', name: 'Frankfurt (Main) Hbf', city: 'Frankfurt', platform: '8' },
        scheduledDeparture: '09:20',
        actualDeparture: '09:38'
      },
      {
        stopNumber: 2,
        station: { code: 'STR-HBF', name: 'Stuttgart Hbf', city: 'Stuttgart', platform: '10' },
        scheduledArrival: '10:45',
        scheduledDeparture: '10:50'
      },
      {
        stopNumber: 3,
        station: { code: 'ULM-HBF', name: 'Ulm Hbf', city: 'Ulm', platform: '4' },
        scheduledArrival: '11:38',
        scheduledDeparture: '11:40'
      },
      {
        stopNumber: 4,
        station: { code: 'MUC-HBF', name: 'München Hbf', city: 'Munich', platform: '19' },
        scheduledArrival: '12:35',
        actualArrival: '12:53'
      }
    ],
    amenities: ['WIFI', 'POWER_OUTLETS', 'DINING_CAR', 'BIKE_STORAGE', 'WHEELCHAIR_ACCESSIBLE'],
    carbonFootprintKg: 4.8
  },
  {
    id: 'TR-UK-9014',
    trainNumber: 'Eurostar 9014',
    operator: 'Eurostar',
    origin: {
      code: 'LON-STP',
      name: 'London St Pancras Int’l',
      city: 'London',
      platform: 'Platform 5'
    },
    destination: {
      code: 'PAR-GDN',
      name: 'Paris Gare du Nord',
      city: 'Paris',
      platform: 'Voie 7'
    },
    departureTime: '2026-10-15T10:24:00',
    arrivalTime: '2026-10-15T13:47:00',
    durationMinutes: 143,
    durationFormatted: '2h 23m',
    status: 'BOARDING',
    delayMinutes: 0,
    fares: [
      { classType: 'STANDARD', price: 92.0, currency: 'EUR', seatsAvailable: 15 },
      { classType: 'FIRST', price: 165.0, currency: 'EUR', seatsAvailable: 8 },
      { classType: 'BUSINESS', price: 280.0, currency: 'EUR', seatsAvailable: 4 }
    ],
    stops: [
      {
        stopNumber: 1,
        station: { code: 'LON-STP', name: 'London St Pancras Int’l', city: 'London', platform: '5' },
        scheduledDeparture: '10:24'
      },
      {
        stopNumber: 2,
        station: { code: 'EBB-INT', name: 'Ebbsfleet Int’l', city: 'Ebbsfleet', platform: '2' },
        scheduledArrival: '10:41',
        scheduledDeparture: '10:43'
      },
      {
        stopNumber: 3,
        station: { code: 'PAR-GDN', name: 'Paris Gare du Nord', city: 'Paris', platform: '7' },
        scheduledArrival: '13:47'
      }
    ],
    amenities: ['WIFI', 'POWER_OUTLETS', 'DINING_CAR', 'WHEELCHAIR_ACCESSIBLE', 'QUIET_ZONE'],
    carbonFootprintKg: 5.1
  },
  {
    id: 'TR-IT-9607',
    trainNumber: 'Frecciarossa 9607',
    operator: 'Trenitalia',
    origin: {
      code: 'MIL-CEN',
      name: 'Milano Centrale',
      city: 'Milan',
      platform: 'Binario 14'
    },
    destination: {
      code: 'ROM-TER',
      name: 'Roma Termini',
      city: 'Rome',
      platform: 'Binario 6'
    },
    departureTime: '2026-10-15T11:10:00',
    arrivalTime: '2026-10-15T14:15:00',
    durationMinutes: 185,
    durationFormatted: '3h 05m',
    status: 'ON_TIME',
    delayMinutes: 0,
    fares: [
      { classType: 'STANDARD', price: 54.9, currency: 'EUR', seatsAvailable: 60 },
      { classType: 'FIRST', price: 89.0, currency: 'EUR', seatsAvailable: 22 },
      { classType: 'BUSINESS', price: 140.0, currency: 'EUR', seatsAvailable: 9 }
    ],
    stops: [
      {
        stopNumber: 1,
        station: { code: 'MIL-CEN', name: 'Milano Centrale', city: 'Milan', platform: '14' },
        scheduledDeparture: '11:10'
      },
      {
        stopNumber: 2,
        station: { code: 'BOL-CEN', name: 'Bologna Centrale', city: 'Bologna', platform: '16' },
        scheduledArrival: '12:15',
        scheduledDeparture: '12:18'
      },
      {
        stopNumber: 3,
        station: { code: 'FIR-SMN', name: 'Firenze SMN', city: 'Florence', platform: '11' },
        scheduledArrival: '12:53',
        scheduledDeparture: '12:58'
      },
      {
        stopNumber: 4,
        station: { code: 'ROM-TER', name: 'Roma Termini', city: 'Rome', platform: '6' },
        scheduledArrival: '14:15'
      }
    ],
    amenities: ['WIFI', 'POWER_OUTLETS', 'DINING_CAR', 'WHEELCHAIR_ACCESSIBLE', 'QUIET_ZONE'],
    carbonFootprintKg: 4.2
  },
  {
    id: 'TR-RO-1631',
    trainNumber: 'IR 1631',
    operator: 'CFR Călători',
    origin: {
      code: 'BUC-NOR',
      name: 'București Nord',
      city: 'Bucharest',
      platform: 'Linia 4'
    },
    destination: {
      code: 'BRA-STA',
      name: 'Brașov',
      city: 'Brașov',
      platform: 'Linia 2'
    },
    departureTime: '2026-10-15T12:00:00',
    arrivalTime: '2026-10-15T14:32:00',
    durationMinutes: 152,
    durationFormatted: '2h 32m',
    status: 'ON_TIME',
    delayMinutes: 0,
    fares: [
      { classType: 'STANDARD', price: 12.5, currency: 'EUR', seatsAvailable: 50 },
      { classType: 'FIRST', price: 19.0, currency: 'EUR', seatsAvailable: 16 }
    ],
    stops: [
      {
        stopNumber: 1,
        station: { code: 'BUC-NOR', name: 'București Nord', city: 'Bucharest', platform: '4' },
        scheduledDeparture: '12:00'
      },
      {
        stopNumber: 2,
        station: { code: 'PLO-VES', name: 'Ploiești Vest', city: 'Ploiești', platform: '3' },
        scheduledArrival: '12:35',
        scheduledDeparture: '12:37'
      },
      {
        stopNumber: 3,
        station: { code: 'SIN-STA', name: 'Sinaia', city: 'Sinaia', platform: '1' },
        scheduledArrival: '13:28',
        scheduledDeparture: '13:30'
      },
      {
        stopNumber: 4,
        station: { code: 'PRE-STA', name: 'Predeal', city: 'Predeal', platform: '2' },
        scheduledArrival: '13:58',
        scheduledDeparture: '14:00'
      },
      {
        stopNumber: 5,
        station: { code: 'BRA-STA', name: 'Brașov', city: 'Brașov', platform: '2' },
        scheduledArrival: '14:32'
      }
    ],
    amenities: ['POWER_OUTLETS', 'BIKE_STORAGE'],
    carbonFootprintKg: 2.1
  },
  {
    id: 'TR-AT-468',
    trainNumber: 'Nightjet NJ 468',
    operator: 'ÖBB',
    origin: {
      code: 'VIE-HBF',
      name: 'Wien Hauptbahnhof',
      city: 'Vienna',
      platform: 'Bahnsteig 7'
    },
    destination: {
      code: 'ZUR-HB',
      name: 'Zürich HB',
      city: 'Zurich',
      platform: 'Gleis 12'
    },
    departureTime: '2026-10-15T21:27:00',
    arrivalTime: '2026-10-16T08:20:00',
    durationMinutes: 653,
    durationFormatted: '10h 53m',
    status: 'ON_TIME',
    delayMinutes: 0,
    fares: [
      { classType: 'STANDARD', price: 44.0, currency: 'EUR', seatsAvailable: 35 },
      { classType: 'FIRST', price: 84.0, currency: 'EUR', seatsAvailable: 14 },
      { classType: 'SLEEPER', price: 139.0, currency: 'EUR', seatsAvailable: 8 }
    ],
    stops: [
      {
        stopNumber: 1,
        station: { code: 'VIE-HBF', name: 'Wien Hauptbahnhof', city: 'Vienna', platform: '7' },
        scheduledDeparture: '21:27'
      },
      {
        stopNumber: 2,
        station: { code: 'SLZ-HBF', name: 'Salzburg Hbf', city: 'Salzburg', platform: '5' },
        scheduledArrival: '00:03',
        scheduledDeparture: '00:15'
      },
      {
        stopNumber: 3,
        station: { code: 'INN-HBF', name: 'Innsbruck Hbf', city: 'Innsbruck', platform: '3' },
        scheduledArrival: '02:40',
        scheduledDeparture: '02:50'
      },
      {
        stopNumber: 4,
        station: { code: 'ZUR-HB', name: 'Zürich HB', city: 'Zurich', platform: '12' },
        scheduledArrival: '08:20'
      }
    ],
    amenities: ['WIFI', 'POWER_OUTLETS', 'DINING_CAR', 'WHEELCHAIR_ACCESSIBLE'],
    carbonFootprintKg: 6.9
  },
  {
    id: 'TR-ES-3142',
    trainNumber: 'AVE 03142',
    operator: 'Renfe',
    origin: {
      code: 'MAD-ATO',
      name: 'Madrid Puerta de Atocha',
      city: 'Madrid',
      platform: 'Vía 5'
    },
    destination: {
      code: 'BAR-SAN',
      name: 'Barcelona Sants',
      city: 'Barcelona',
      platform: 'Vía 2'
    },
    departureTime: '2026-10-15T14:30:00',
    arrivalTime: '2026-10-15T17:00:00',
    durationMinutes: 150,
    durationFormatted: '2h 30m',
    status: 'CANCELLED',
    delayMinutes: 0,
    fares: [
      { classType: 'STANDARD', price: 62.0, currency: 'EUR', seatsAvailable: 0 },
      { classType: 'FIRST', price: 98.0, currency: 'EUR', seatsAvailable: 0 }
    ],
    stops: [
      {
        stopNumber: 1,
        station: { code: 'MAD-ATO', name: 'Madrid Puerta de Atocha', city: 'Madrid', platform: '5' },
        scheduledDeparture: '14:30'
      },
      {
        stopNumber: 2,
        station: { code: 'ZAR-DEL', name: 'Zaragoza-Delicias', city: 'Zaragoza', platform: '3' },
        scheduledArrival: '15:45',
        scheduledDeparture: '15:50'
      },
      {
        stopNumber: 3,
        station: { code: 'BAR-SAN', name: 'Barcelona Sants', city: 'Barcelona', platform: '2' },
        scheduledArrival: '17:00'
      }
    ],
    amenities: ['WIFI', 'POWER_OUTLETS', 'DINING_CAR', 'WHEELCHAIR_ACCESSIBLE', 'QUIET_ZONE'],
    carbonFootprintKg: 5.4
  },
  {
    id: 'TR-CH-511',
    trainNumber: 'IC 511',
    operator: 'SBB CFF FFS',
    origin: {
      code: 'ZUR-HB',
      name: 'Zürich HB',
      city: 'Zurich',
      platform: 'Gleis 6'
    },
    destination: {
      code: 'GEN-COR',
      name: 'Genève Cornavin',
      city: 'Geneva',
      platform: 'Voie 4'
    },
    departureTime: '2026-10-15T15:03:00',
    arrivalTime: '2026-10-15T17:48:00',
    durationMinutes: 165,
    durationFormatted: '2h 45m',
    status: 'ON_TIME',
    delayMinutes: 0,
    fares: [
      { classType: 'STANDARD', price: 46.0, currency: 'EUR', seatsAvailable: 52 },
      { classType: 'FIRST', price: 82.0, currency: 'EUR', seatsAvailable: 24 }
    ],
    stops: [
      {
        stopNumber: 1,
        station: { code: 'ZUR-HB', name: 'Zürich HB', city: 'Zurich', platform: '6' },
        scheduledDeparture: '15:03'
      },
      {
        stopNumber: 2,
        station: { code: 'BERN-HB', name: 'Bern', city: 'Bern', platform: '3' },
        scheduledArrival: '16:00',
        scheduledDeparture: '16:04'
      },
      {
        stopNumber: 3,
        station: { code: 'LAU-GDR', name: 'Lausanne', city: 'Lausanne', platform: '2' },
        scheduledArrival: '17:12',
        scheduledDeparture: '17:15'
      },
      {
        stopNumber: 4,
        station: { code: 'GEN-COR', name: 'Genève Cornavin', city: 'Geneva', platform: '4' },
        scheduledArrival: '17:48'
      }
    ],
    amenities: ['WIFI', 'POWER_OUTLETS', 'DINING_CAR', 'BIKE_STORAGE', 'QUIET_ZONE'],
    carbonFootprintKg: 3.8
  },
  {
    id: 'TR-BE-9339',
    trainNumber: 'Eurostar (Thalys) 9339',
    operator: 'Eurostar',
    origin: {
      code: 'AMS-CEN',
      name: 'Amsterdam Centraal',
      city: 'Amsterdam',
      platform: 'Spoor 15'
    },
    destination: {
      code: 'BRU-MID',
      name: 'Bruxelles-Midi',
      city: 'Brussels',
      platform: 'Spoor 4'
    },
    departureTime: '2026-10-15T16:15:00',
    arrivalTime: '2026-10-15T18:08:00',
    durationMinutes: 113,
    durationFormatted: '1h 53m',
    status: 'ON_TIME',
    delayMinutes: 0,
    fares: [
      { classType: 'STANDARD', price: 39.0, currency: 'EUR', seatsAvailable: 27 },
      { classType: 'FIRST', price: 69.0, currency: 'EUR', seatsAvailable: 11 }
    ],
    stops: [
      {
        stopNumber: 1,
        station: { code: 'AMS-CEN', name: 'Amsterdam Centraal', city: 'Amsterdam', platform: '15' },
        scheduledDeparture: '16:15'
      },
      {
        stopNumber: 2,
        station: { code: 'ROT-CEN', name: 'Rotterdam Centraal', city: 'Rotterdam', platform: '4' },
        scheduledArrival: '16:54',
        scheduledDeparture: '16:57'
      },
      {
        stopNumber: 3,
        station: { code: 'ANT-CEN', name: 'Antwerpen-Centraal', city: 'Antwerp', platform: '22' },
        scheduledArrival: '17:30',
        scheduledDeparture: '17:33'
      },
      {
        stopNumber: 4,
        station: { code: 'BRU-MID', name: 'Bruxelles-Midi', city: 'Brussels', platform: '4' },
        scheduledArrival: '18:08'
      }
    ],
    amenities: ['WIFI', 'POWER_OUTLETS', 'DINING_CAR', 'WHEELCHAIR_ACCESSIBLE'],
    carbonFootprintKg: 2.9
  },
  {
    id: 'TR-CZ-1003',
    trainNumber: 'RegioJet 1003',
    operator: 'RegioJet',
    origin: {
      code: 'PRG-HLN',
      name: 'Praha hlavní nádraží',
      city: 'Prague',
      platform: 'Nástupiště 3'
    },
    destination: {
      code: 'BRN-HLN',
      name: 'Brno hlavní nádraží',
      city: 'Brno',
      platform: 'Nástupiště 1'
    },
    departureTime: '2026-10-15T17:44:00',
    arrivalTime: '2026-10-15T20:12:00',
    durationMinutes: 148,
    durationFormatted: '2h 28m',
    status: 'DELAYED',
    delayMinutes: 12,
    fares: [
      { classType: 'STANDARD', price: 14.0, currency: 'EUR', seatsAvailable: 40 },
      { classType: 'BUSINESS', price: 22.0, currency: 'EUR', seatsAvailable: 15 }
    ],
    stops: [
      {
        stopNumber: 1,
        station: { code: 'PRG-HLN', name: 'Praha hlavní nádraží', city: 'Prague', platform: '3' },
        scheduledDeparture: '17:44',
        actualDeparture: '17:56'
      },
      {
        stopNumber: 2,
        station: { code: 'PAR-HLN', name: 'Pardubice hl.n.', city: 'Pardubice', platform: '2' },
        scheduledArrival: '18:40',
        scheduledDeparture: '18:42'
      },
      {
        stopNumber: 3,
        station: { code: 'BRN-HLN', name: 'Brno hlavní nádraží', city: 'Brno', platform: '1' },
        scheduledArrival: '20:12',
        actualArrival: '20:24'
      }
    ],
    amenities: ['WIFI', 'POWER_OUTLETS', 'DINING_CAR', 'BIKE_STORAGE'],
    carbonFootprintKg: 3.1
  }
];
