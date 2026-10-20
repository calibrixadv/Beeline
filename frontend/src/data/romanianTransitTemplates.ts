import {
  TransitProvider,
  TransitLineSchedule,
  LocationCoordinates,
} from '../types/schedule';

export const ROMANIAN_PROVIDERS: Record<string, TransitProvider> = {
  METROREX: {
    id: 'metrorex',
    name: 'Metrorex S.A.',
    shortName: 'Metrorex',
    city: 'București',
    modes: ['METRO'],
    badgeColor: '#0284C7', // Sky Blue
  },
  TRANSURB: {
    id: 'transurb',
    name: 'Transurb S.A. Galați',
    shortName: 'Transurb Galați',
    city: 'Galați',
    modes: ['TRAM', 'BUS'],
    badgeColor: '#059669', // Emerald Green
  },
  STB: {
    id: 'stb',
    name: 'Societatea de Transport București',
    shortName: 'STB',
    city: 'București',
    modes: ['TRAM', 'BUS'],
    badgeColor: '#2563EB', // Royal Blue
  },
  CTP_CLUJ: {
    id: 'ctp-cluj',
    name: 'Compania de Transport Public Cluj-Napoca',
    shortName: 'CTP Cluj',
    city: 'Cluj-Napoca',
    modes: ['TRAM', 'BUS'],
    badgeColor: '#7C3AED', // Violet
  },
  STPT_TIMISOARA: {
    id: 'stpt',
    name: 'Societatea de Transport Public Timișoara',
    shortName: 'STPT Timișoara',
    city: 'Timișoara',
    modes: ['TRAM', 'BUS'],
    badgeColor: '#D97706', // Amber
  },
  CTP_IASI: {
    id: 'ctp-iasi',
    name: 'Compania de Transport Public Iași',
    shortName: 'CTP Iași',
    city: 'Iași',
    modes: ['TRAM', 'BUS'],
    badgeColor: '#DC2626', // Red
  },
  RATBV_BRASOV: {
    id: 'ratbv',
    name: 'Regia Autonomă de Transport Brașov',
    shortName: 'RATBV Brașov',
    city: 'Brașov',
    modes: ['BUS'],
    badgeColor: '#4F46E5', // Indigo
  },
  CT_BUS_CONSTANTA: {
    id: 'ct-bus',
    name: 'CT Bus S.A. Constanța',
    shortName: 'CT Bus Constanța',
    city: 'Constanța',
    modes: ['BUS'],
    badgeColor: '#0891B2', // Cyan
  },
  OTL_ORADEA: {
    id: 'otl',
    name: 'Oradea Transport Local',
    shortName: 'OTL Oradea',
    city: 'Oradea',
    modes: ['TRAM', 'BUS'],
    badgeColor: '#EA580C', // Orange
  },
  TURSIB_SIBIU: {
    id: 'tursib',
    name: 'Tursib S.A. Sibiu',
    shortName: 'Tursib Sibiu',
    city: 'Sibiu',
    modes: ['BUS'],
    badgeColor: '#0D9488', // Teal
  },
  CFR_CALATORI: {
    id: 'cfr',
    name: 'CFR Călători',
    shortName: 'CFR Călători',
    city: 'National',
    modes: ['TRAIN'],
    badgeColor: '#B91C1C', // Rail Red
    isNationalRail: true,
  },
  ASTRA_TRANS_CARPATIC: {
    id: 'astra',
    name: 'Astra Trans Carpatic',
    shortName: 'Astra Trans Carpatic',
    city: 'National',
    modes: ['TRAIN'],
    badgeColor: '#D97706', // Golden Amber
    isNationalRail: true,
  },
  TRANSFEROVIAR: {
    id: 'tfc',
    name: 'Transferoviar Călători',
    shortName: 'TFC',
    city: 'National',
    modes: ['TRAIN'],
    badgeColor: '#16A34A', // Green
    isNationalRail: true,
  },
  SOFTRANS: {
    id: 'softrans',
    name: 'Softrans Hyperion',
    shortName: 'Softrans',
    city: 'National',
    modes: ['TRAIN'],
    badgeColor: '#9333EA', // Purple
    isNationalRail: true,
  },
  REGIO_CALATORI: {
    id: 'regio-calatori',
    name: 'Regio Călători',
    shortName: 'Regio Călători',
    city: 'National',
    modes: ['TRAIN'],
    badgeColor: '#2563EB', // Blue
    isNationalRail: true,
  },
};

export const ROMANIAN_CITIES: Array<{
  name: string;
  coords: LocationCoordinates;
  aliases: string[];
}> = [
  {
    name: 'București',
    coords: { latitude: 44.4268, longitude: 26.1025, city: 'București' },
    aliases: ['bucuresti', 'bucharest', 'buc'],
  },
  {
    name: 'Galați',
    coords: { latitude: 45.4353, longitude: 28.0076, city: 'Galați' },
    aliases: ['galati', 'galatz'],
  },
  {
    name: 'Cluj-Napoca',
    coords: { latitude: 46.7712, longitude: 23.6236, city: 'Cluj-Napoca' },
    aliases: ['cluj', 'cluj napoca', 'kolozsvar'],
  },
  {
    name: 'Timișoara',
    coords: { latitude: 45.7537, longitude: 21.2257, city: 'Timișoara' },
    aliases: ['timisoara', 'temesvar'],
  },
  {
    name: 'Iași',
    coords: { latitude: 47.1585, longitude: 27.6014, city: 'Iași' },
    aliases: ['iasi', 'jassy'],
  },
  {
    name: 'Brașov',
    coords: { latitude: 45.6579, longitude: 25.6012, city: 'Brașov' },
    aliases: ['brasov', 'kronstadt'],
  },
  {
    name: 'Constanța',
    coords: { latitude: 44.1807, longitude: 28.6343, city: 'Constanța' },
    aliases: ['constanta'],
  },
  {
    name: 'Oradea',
    coords: { latitude: 47.0465, longitude: 21.9189, city: 'Oradea' },
    aliases: ['oradea', 'nagyvarad'],
  },
  {
    name: 'Sibiu',
    coords: { latitude: 45.7983, longitude: 24.1256, city: 'Sibiu' },
    aliases: ['sibiu', 'hermannstadt'],
  },
  {
    name: 'Craiova',
    coords: { latitude: 44.3302, longitude: 23.7949, city: 'Craiova' },
    aliases: ['craiova'],
  },
];

export const ROMANIAN_TRANSIT_TEMPLATES: TransitLineSchedule[] = [
  // ----------------------------------------------------
  // METROREX (București - Metro)
  // ----------------------------------------------------
  {
    id: 'metrorex-m2',
    lineCode: 'M2',
    lineName: 'Pipera ⇄ Tudor Arghezi',
    mode: 'METRO',
    provider: ROMANIAN_PROVIDERS.METROREX,
    city: 'București',
    origin: 'Pipera',
    destination: 'Tudor Arghezi (Berceni)',
    nextDepartures: [
      { time: '14:03', minutesUntil: 3, platform: 'Linia 1', crowdingLevel: 'MEDIUM', isLiveTracking: true },
      { time: '14:07', minutesUntil: 7, platform: 'Linia 1', crowdingLevel: 'HIGH', isLiveTracking: true },
      { time: '14:12', minutesUntil: 12, platform: 'Linia 1', crowdingLevel: 'MEDIUM' },
    ],
    frequencyDescription: 'Every 3–5 min',
    status: 'ON_TIME',
    fareLei: 3.0,
    viaStops: ['Aurel Vlaicu', 'Piața Victoriei', 'Piața Romană', 'Piața Unirii 2', 'Eroii Revoluției'],
  },
  {
    id: 'metrorex-m1',
    lineCode: 'M1',
    lineName: 'Dristor 2 ⇄ Pantelimon',
    mode: 'METRO',
    provider: ROMANIAN_PROVIDERS.METROREX,
    city: 'București',
    origin: 'Dristor 2',
    destination: 'Pantelimon',
    nextDepartures: [
      { time: '14:05', minutesUntil: 5, platform: 'Peron A', crowdingLevel: 'LOW', isLiveTracking: true },
      { time: '14:11', minutesUntil: 11, platform: 'Peron A', crowdingLevel: 'MEDIUM' },
    ],
    frequencyDescription: 'Every 5–7 min',
    status: 'ON_TIME',
    fareLei: 3.0,
    viaStops: ['Piața Victoriei 1', 'Gara de Nord 1', 'Eroilor', 'Piața Unirii 1', 'Timpul'],
  },
  {
    id: 'metrorex-m3',
    lineCode: 'M3',
    lineName: 'Preciziei ⇄ Anghel Saligny',
    mode: 'METRO',
    provider: ROMANIAN_PROVIDERS.METROREX,
    city: 'București',
    origin: 'Preciziei',
    destination: 'Anghel Saligny',
    nextDepartures: [
      { time: '14:08', minutesUntil: 8, platform: 'Linia 2', crowdingLevel: 'LOW' },
      { time: '14:16', minutesUntil: 16, platform: 'Linia 2', crowdingLevel: 'MEDIUM' },
    ],
    frequencyDescription: 'Every 6–8 min',
    status: 'ON_TIME',
    fareLei: 3.0,
    viaStops: ['Politehnica', 'Eroilor', 'Piața Unirii 1', 'Dristor 1', 'Nicolae Grigorescu'],
  },
  {
    id: 'metrorex-m5',
    lineCode: 'M5',
    lineName: 'Râul Doamnei ⇄ Eroilor 2',
    mode: 'METRO',
    provider: ROMANIAN_PROVIDERS.METROREX,
    city: 'București',
    origin: 'Râul Doamnei',
    destination: 'Eroilor 2',
    nextDepartures: [
      { time: '14:06', minutesUntil: 6, platform: 'Peron 1', crowdingLevel: 'LOW', isLiveTracking: true },
      { time: '14:14', minutesUntil: 14, platform: 'Peron 1', crowdingLevel: 'LOW' },
    ],
    frequencyDescription: 'Every 7–9 min',
    status: 'ON_TIME',
    fareLei: 3.0,
    viaStops: ['Parc Drumul Taberei', 'Favorit', 'Academia Militară', 'Eroilor 2'],
  },

  // ----------------------------------------------------
  // TRANSURB GALAȚI (Galați - Tram & Bus)
  // ----------------------------------------------------
  {
    id: 'transurb-tram-39',
    lineCode: 'Tram 39',
    lineName: 'Micro 19 ⇄ Bariera Traian',
    mode: 'TRAM',
    provider: ROMANIAN_PROVIDERS.TRANSURB,
    city: 'Galați',
    origin: 'Micro 19',
    destination: 'Bariera Traian',
    nextDepartures: [
      { time: '14:04', minutesUntil: 4, platform: 'Refugiu 1', crowdingLevel: 'MEDIUM', isLiveTracking: true },
      { time: '14:14', minutesUntil: 14, platform: 'Refugiu 1', crowdingLevel: 'LOW' },
      { time: '14:24', minutesUntil: 24, platform: 'Refugiu 1', crowdingLevel: 'LOW' },
    ],
    frequencyDescription: 'Every 8–10 min',
    status: 'ON_TIME',
    fareLei: 3.0,
    viaStops: ['Spitalul Județean', 'Flora', 'Patinoar', 'Piața Energiei', 'Piața Centrală'],
  },
  {
    id: 'transurb-tram-7',
    lineCode: 'Tram 7',
    lineName: 'Micro 19 ⇄ Piața Centrală',
    mode: 'TRAM',
    provider: ROMANIAN_PROVIDERS.TRANSURB,
    city: 'Galați',
    origin: 'Micro 19',
    destination: 'Piața Centrală',
    nextDepartures: [
      { time: '14:10', minutesUntil: 10, platform: 'Peron B', crowdingLevel: 'LOW', isLiveTracking: true },
      { time: '14:25', minutesUntil: 25, platform: 'Peron B', crowdingLevel: 'LOW' },
    ],
    frequencyDescription: 'Every 12–15 min',
    status: 'ON_TIME',
    fareLei: 3.0,
    viaStops: ['Cinema Dacia', 'Siderurgiștilor', 'General', 'Piața Centrală'],
  },
  {
    id: 'transurb-bus-102',
    lineCode: 'Bus 102',
    lineName: 'Micro 19 ⇄ Gara CFR Galați',
    mode: 'BUS',
    provider: ROMANIAN_PROVIDERS.TRANSURB,
    city: 'Galați',
    origin: 'Micro 19',
    destination: 'Gara CFR Galați',
    nextDepartures: [
      { time: '14:02', minutesUntil: 2, platform: 'Stația 1', crowdingLevel: 'HIGH', isLiveTracking: true },
      { time: '14:09', minutesUntil: 9, platform: 'Stația 1', crowdingLevel: 'MEDIUM', isLiveTracking: true },
      { time: '14:17', minutesUntil: 17, platform: 'Stația 1', crowdingLevel: 'LOW' },
    ],
    frequencyDescription: 'Every 7–10 min',
    status: 'ON_TIME',
    fareLei: 3.0,
    viaStops: ['IREG', 'Tiglina 1', 'Mazepa', 'Centru', 'Gara CFR Galați'],
  },
  {
    id: 'transurb-bus-11',
    lineCode: 'Bus 11',
    lineName: 'Micro 13 ⇄ Piața Centrală',
    mode: 'BUS',
    provider: ROMANIAN_PROVIDERS.TRANSURB,
    city: 'Galați',
    origin: 'Micro 13',
    destination: 'Piața Centrală',
    nextDepartures: [
      { time: '14:07', minutesUntil: 7, platform: 'Stația A', crowdingLevel: 'LOW', isLiveTracking: true },
      { time: '14:19', minutesUntil: 19, platform: 'Stația A', crowdingLevel: 'MEDIUM' },
    ],
    frequencyDescription: 'Every 10–12 min',
    status: 'ON_TIME',
    fareLei: 3.0,
    viaStops: ['Micro 14', 'Complex Siret', 'Parc Viva', 'Piața Centrală'],
  },
  {
    id: 'transurb-bus-10',
    lineCode: 'Bus 10',
    lineName: 'Dimitrie Cantemir ⇄ Damen Șantier',
    mode: 'BUS',
    provider: ROMANIAN_PROVIDERS.TRANSURB,
    city: 'Galați',
    origin: 'Dimitrie Cantemir',
    destination: 'Damen Șantier Naval',
    nextDepartures: [
      { time: '14:15', minutesUntil: 15, platform: 'Stația C', crowdingLevel: 'LOW' },
      { time: '14:35', minutesUntil: 35, platform: 'Stația C', crowdingLevel: 'LOW' },
    ],
    frequencyDescription: 'Every 15–20 min',
    status: 'ON_TIME',
    fareLei: 3.0,
    viaStops: ['Dunărea Mall', 'Port Bazinul Nou', 'Șantierul Naval Damen'],
  },

  // ----------------------------------------------------
  // STB (București - Tram & Bus)
  // ----------------------------------------------------
  {
    id: 'stb-tram-41',
    lineCode: 'Tram 41',
    lineName: 'Piața Presei Libere ⇄ Ghencea (Metrou Ușor)',
    mode: 'TRAM',
    provider: ROMANIAN_PROVIDERS.STB,
    city: 'București',
    origin: 'Piața Presei Libere',
    destination: 'Ghencea',
    nextDepartures: [
      { time: '14:01', minutesUntil: 1, platform: 'Refugiu 1', crowdingLevel: 'HIGH', isLiveTracking: true },
      { time: '14:05', minutesUntil: 5, platform: 'Refugiu 1', crowdingLevel: 'HIGH', isLiveTracking: true },
      { time: '14:09', minutesUntil: 9, platform: 'Refugiu 1', crowdingLevel: 'MEDIUM' },
    ],
    frequencyDescription: 'Every 3–5 min',
    status: 'ON_TIME',
    fareLei: 3.0,
    viaStops: ['Mănăstirea Cașin', 'Pod Grant', 'Crângași', 'Pasaj Lujerului', 'Brașov (Dr. Taberei)'],
  },
  {
    id: 'stb-tram-1',
    lineCode: 'Tram 1',
    lineName: 'Șura Mare ⇄ Bd. Banu Manta (Inelul Principal)',
    mode: 'TRAM',
    provider: ROMANIAN_PROVIDERS.STB,
    city: 'București',
    origin: 'Șura Mare',
    destination: 'Bd. Banu Manta',
    nextDepartures: [
      { time: '14:06', minutesUntil: 6, platform: 'Refugiu B', crowdingLevel: 'MEDIUM', isLiveTracking: true },
      { time: '14:14', minutesUntil: 14, platform: 'Refugiu B', crowdingLevel: 'LOW' },
    ],
    frequencyDescription: 'Every 7–9 min',
    status: 'ON_TIME',
    fareLei: 3.0,
    viaStops: ['Piața Iancului', 'Obor', 'Ștefan cel Mare', 'Piața Victoriei'],
  },
  {
    id: 'stb-bus-100',
    lineCode: 'Bus 100 Express',
    lineName: 'Piața Unirii 2 ⇄ Aeroport Henri Coandă Otopeni',
    mode: 'BUS',
    provider: ROMANIAN_PROVIDERS.STB,
    city: 'București',
    origin: 'Piața Unirii 2',
    destination: 'Aeroport Otopeni Sosiri',
    nextDepartures: [
      { time: '14:12', minutesUntil: 12, platform: 'Stația Express', crowdingLevel: 'LOW', isLiveTracking: true },
      { time: '14:27', minutesUntil: 27, platform: 'Stația Express', crowdingLevel: 'LOW' },
    ],
    frequencyDescription: 'Every 15 min (Express)',
    status: 'ON_TIME',
    fareLei: 3.0,
    viaStops: ['Piața Universității', 'Piața Romană', 'Piața Victoriei', 'Aeroport Băneasa', 'Otopeni'],
  },
  {
    id: 'stb-bus-381',
    lineCode: 'Bus 381',
    lineName: 'Clăbucet ⇄ Piața Reșița',
    mode: 'BUS',
    provider: ROMANIAN_PROVIDERS.STB,
    city: 'București',
    origin: 'Clăbucet',
    destination: 'Piața Reșița',
    nextDepartures: [
      { time: '14:04', minutesUntil: 4, platform: 'Stația 2', crowdingLevel: 'MEDIUM', isLiveTracking: true },
      { time: '14:13', minutesUntil: 13, platform: 'Stația 2', crowdingLevel: 'LOW' },
    ],
    frequencyDescription: 'Every 8–10 min',
    status: 'ON_TIME',
    fareLei: 3.0,
    viaStops: ['Piața Victoriei', 'Piața Romană', 'Piața Unirii', 'Tineretului'],
  },

  // ----------------------------------------------------
  // CTP CLUJ-NAPOCA (Cluj - Tram & Bus)
  // ----------------------------------------------------
  {
    id: 'ctp-cluj-tram-101',
    lineCode: 'Tram 101',
    lineName: 'Bucium (Mănăștur) ⇄ Piața Gării',
    mode: 'TRAM',
    provider: ROMANIAN_PROVIDERS.CTP_CLUJ,
    city: 'Cluj-Napoca',
    origin: 'Mănăștur Bucium',
    destination: 'Piața Gării Cluj',
    nextDepartures: [
      { time: '14:05', minutesUntil: 5, platform: 'Refugiu 1', crowdingLevel: 'MEDIUM', isLiveTracking: true },
      { time: '14:13', minutesUntil: 13, platform: 'Refugiu 1', crowdingLevel: 'LOW' },
    ],
    frequencyDescription: 'Every 7–9 min',
    status: 'ON_TIME',
    fareLei: 3.0,
    viaStops: ['Platinia Arena', 'Parcul Central', 'Barițiu', 'Gara Cluj-Napoca'],
  },
  {
    id: 'ctp-cluj-bus-24b',
    lineCode: 'Bus 24B',
    lineName: 'Polus Vivo Center ⇄ Iulius Mall Gheorgheni',
    mode: 'BUS',
    provider: ROMANIAN_PROVIDERS.CTP_CLUJ,
    city: 'Cluj-Napoca',
    origin: 'Vivo Cluj Center',
    destination: 'Iulius Mall Gheorgheni',
    nextDepartures: [
      { time: '14:08', minutesUntil: 8, platform: 'Stația Mall', crowdingLevel: 'HIGH', isLiveTracking: true },
      { time: '14:18', minutesUntil: 18, platform: 'Stația Mall', crowdingLevel: 'MEDIUM' },
    ],
    frequencyDescription: 'Every 8–10 min',
    status: 'ON_TIME',
    fareLei: 3.0,
    viaStops: ['Mănăștur Calvaria', 'Agronomia', 'Regionala CFR', 'Iulius Mall'],
  },

  // ----------------------------------------------------
  // STPT TIMIȘOARA (Timișoara - Tram & Bus)
  // ----------------------------------------------------
  {
    id: 'stpt-tram-1',
    lineCode: 'Tram 1',
    lineName: 'Gara de Nord ⇄ Gara de Est',
    mode: 'TRAM',
    provider: ROMANIAN_PROVIDERS.STPT_TIMISOARA,
    city: 'Timișoara',
    origin: 'Gara de Nord Timișoara',
    destination: 'Gara de Est',
    nextDepartures: [
      { time: '14:06', minutesUntil: 6, platform: 'Peron A', crowdingLevel: 'LOW', isLiveTracking: true },
      { time: '14:16', minutesUntil: 16, platform: 'Peron A', crowdingLevel: 'MEDIUM' },
    ],
    frequencyDescription: 'Every 8–10 min',
    status: 'ON_TIME',
    fareLei: 4.0,
    viaStops: ['Catedrala Mitropolitană', 'Piața Traian', 'Badea Cârțan'],
  },
  {
    id: 'stpt-bus-33',
    lineCode: 'Bus 33',
    lineName: 'Catedrala Mitropolitană ⇄ Metro Sud',
    mode: 'BUS',
    provider: ROMANIAN_PROVIDERS.STPT_TIMISOARA,
    city: 'Timișoara',
    origin: 'Catedrala Mitropolitană',
    destination: 'Metro Sud',
    nextDepartures: [
      { time: '14:11', minutesUntil: 11, platform: 'Stația 1', crowdingLevel: 'LOW' },
      { time: '14:26', minutesUntil: 26, platform: 'Stația 1', crowdingLevel: 'LOW' },
    ],
    frequencyDescription: 'Every 12–15 min',
    status: 'ON_TIME',
    fareLei: 4.0,
    viaStops: ['Piața Mocioni', 'Calea Șagului', 'Shopping City Timișoara'],
  },

  // ----------------------------------------------------
  // CTP IAȘI (Iași - Tram & Bus)
  // ----------------------------------------------------
  {
    id: 'ctp-iasi-tram-1',
    lineCode: 'Tram 1',
    lineName: 'Copou ⇄ Baza 3',
    mode: 'TRAM',
    provider: ROMANIAN_PROVIDERS.CTP_IASI,
    city: 'Iași',
    origin: 'Copou (Rond)',
    destination: 'Baza 3',
    nextDepartures: [
      { time: '14:04', minutesUntil: 4, platform: 'Peron Copou', crowdingLevel: 'MEDIUM', isLiveTracking: true },
      { time: '14:15', minutesUntil: 15, platform: 'Peron Copou', crowdingLevel: 'LOW' },
    ],
    frequencyDescription: 'Every 9–11 min',
    status: 'ON_TIME',
    fareLei: 3.5,
    viaStops: ['Universitate', 'Piața Unirii', 'Tg. Cucu', 'Tătărași Sud'],
  },

  // ----------------------------------------------------
  // RATBV BRAȘOV (Brașov - Bus)
  // ----------------------------------------------------
  {
    id: 'ratbv-bus-20',
    lineCode: 'Bus 20',
    lineName: 'Livada Poștei ⇄ Poiana Brașov',
    mode: 'BUS',
    provider: ROMANIAN_PROVIDERS.RATBV_BRASOV,
    city: 'Brașov',
    origin: 'Livada Poștei',
    destination: 'Poiana Brașov (Rond)',
    nextDepartures: [
      { time: '14:15', minutesUntil: 15, platform: 'Peron Poiana', crowdingLevel: 'MEDIUM', isLiveTracking: true },
      { time: '14:45', minutesUntil: 45, platform: 'Peron Poiana', crowdingLevel: 'LOW' },
    ],
    frequencyDescription: 'Every 20–30 min',
    status: 'ON_TIME',
    fareLei: 6.0,
    viaStops: ['Warthe', 'Facultatea de Silvicultură', 'Poiana Mică', 'Poiana Brașov'],
  },
  {
    id: 'ratbv-bus-4',
    lineCode: 'Bus 4',
    lineName: 'Gara Brașov ⇄ Tocile (Șchei)',
    mode: 'BUS',
    provider: ROMANIAN_PROVIDERS.RATBV_BRASOV,
    city: 'Brașov',
    origin: 'Gara Brașov',
    destination: 'Tocile',
    nextDepartures: [
      { time: '14:07', minutesUntil: 7, platform: 'Stația Gării', crowdingLevel: 'LOW', isLiveTracking: true },
      { time: '14:19', minutesUntil: 19, platform: 'Stația Gării', crowdingLevel: 'LOW' },
    ],
    frequencyDescription: 'Every 10–12 min',
    status: 'ON_TIME',
    fareLei: 4.0,
    viaStops: ['Camera de Comerț', 'Primărie', 'Biserica Neagră', 'Piața Unirii'],
  },

  // ----------------------------------------------------
  // CT BUS CONSTANȚA (Constanța - Bus)
  // ----------------------------------------------------
  {
    id: 'ct-bus-100m',
    lineCode: 'Bus 100M',
    lineName: 'Gara CFR Constanța ⇄ Stațiunea Mamaia Nord',
    mode: 'BUS',
    provider: ROMANIAN_PROVIDERS.CT_BUS_CONSTANTA,
    city: 'Constanța',
    origin: 'Gara CFR Constanța',
    destination: 'Mamaia Nord (Tabăra Turist)',
    nextDepartures: [
      { time: '14:10', minutesUntil: 10, platform: 'Peron Gară', crowdingLevel: 'HIGH', isLiveTracking: true },
      { time: '14:25', minutesUntil: 25, platform: 'Peron Gară', crowdingLevel: 'MEDIUM' },
    ],
    frequencyDescription: 'Every 12–15 min',
    status: 'ON_TIME',
    fareLei: 3.0,
    viaStops: ['Delfinariu', 'City Park Mall', 'Sat Vacanță', 'Cazino Mamaia'],
  },

  // ----------------------------------------------------
  // OTL ORADEA (Oradea - Tram & Bus)
  // ----------------------------------------------------
  {
    id: 'otl-tram-1n',
    lineCode: 'Tram 1N',
    lineName: 'Pod CFR ⇄ Nufărul (Inel Nord)',
    mode: 'TRAM',
    provider: ROMANIAN_PROVIDERS.OTL_ORADEA,
    city: 'Oradea',
    origin: 'Pod CFR',
    destination: 'Nufărul',
    nextDepartures: [
      { time: '14:05', minutesUntil: 5, platform: 'Refugiu 1', crowdingLevel: 'LOW', isLiveTracking: true },
      { time: '14:14', minutesUntil: 14, platform: 'Refugiu 1', crowdingLevel: 'LOW' },
    ],
    frequencyDescription: 'Every 8–10 min',
    status: 'ON_TIME',
    fareLei: 3.5,
    viaStops: ['Gara Centrală', 'Piața Unirii', 'Centrul Civic', 'Lotus Center'],
  },

  // ----------------------------------------------------
  // TRAIN OPERATORS (National & Regional Rail in Romania)
  // ----------------------------------------------------
  {
    id: 'cfr-ir-1631',
    lineCode: 'IR 1631',
    lineName: 'București Nord ➔ Brașov (CFR InterRegio)',
    mode: 'TRAIN',
    provider: ROMANIAN_PROVIDERS.CFR_CALATORI,
    city: 'București',
    origin: 'București Nord',
    destination: 'Brașov',
    nextDepartures: [
      { time: '14:20', minutesUntil: 20, platform: 'Linia 4', crowdingLevel: 'HIGH', isLiveTracking: true },
      { time: '16:45', minutesUntil: 165, platform: 'Linia 3', crowdingLevel: 'MEDIUM' },
    ],
    frequencyDescription: 'Direct 2h 15m • High-Speed Corridor',
    status: 'ON_TIME',
    fareLei: 48.0,
    viaStops: ['Ploiești Vest', 'Câmpina', 'Sinaia', 'Predeal', 'Brașov'],
  },
  {
    id: 'cfr-ir-1582',
    lineCode: 'IR 1582',
    lineName: 'Constanța ➔ București Nord (Trenul Soarelui)',
    mode: 'TRAIN',
    provider: ROMANIAN_PROVIDERS.CFR_CALATORI,
    city: 'Constanța',
    origin: 'Constanța',
    destination: 'București Nord',
    nextDepartures: [
      { time: '14:30', minutesUntil: 30, platform: 'Linia 2', crowdingLevel: 'MEDIUM', isLiveTracking: true },
      { time: '17:00', minutesUntil: 180, platform: 'Linia 1', crowdingLevel: 'LOW' },
    ],
    frequencyDescription: 'Direct 2h 00m • 160 km/h line',
    status: 'ON_TIME',
    fareLei: 65.0,
    viaStops: ['Fetești', 'Ciulnița', 'București Nord'],
  },
  {
    id: 'cfr-re-7001',
    lineCode: 'RE 7001',
    lineName: 'Galați ➔ București Nord (CFR Regio-Expres)',
    mode: 'TRAIN',
    provider: ROMANIAN_PROVIDERS.CFR_CALATORI,
    city: 'Galați',
    origin: 'Galați',
    destination: 'București Nord',
    nextDepartures: [
      { time: '14:40', minutesUntil: 40, platform: 'Linia 1', crowdingLevel: 'MEDIUM', isLiveTracking: true },
      { time: '18:15', minutesUntil: 255, platform: 'Linia 2', crowdingLevel: 'LOW' },
    ],
    frequencyDescription: '3h 35m • Direct Connection',
    status: 'ON_TIME',
    fareLei: 38.0,
    viaStops: ['Brăila', 'Ianca', 'Făurei', 'Buzău', 'Ploiești Sud', 'București Nord'],
  },
  {
    id: 'astra-ir-15531',
    lineCode: 'IR 15531',
    lineName: 'București Nord ➔ Brașov ➔ Arad',
    mode: 'TRAIN',
    provider: ROMANIAN_PROVIDERS.ASTRA_TRANS_CARPATIC,
    city: 'București',
    origin: 'București Nord',
    destination: 'Arad',
    nextDepartures: [
      { time: '15:15', minutesUntil: 75, platform: 'Linia 7', crowdingLevel: 'LOW', isLiveTracking: true },
      { time: '21:30', minutesUntil: 450, platform: 'Linia 8', crowdingLevel: 'LOW' },
    ],
    frequencyDescription: 'Modern Couchette & Luxury Seating',
    status: 'ON_TIME',
    fareLei: 52.0,
    viaStops: ['Ploiești Vest', 'Brașov', 'Sighișoara', 'Alba Iulia', 'Deva', 'Arad'],
  },
  {
    id: 'tfc-re-10111',
    lineCode: 'RE 10111',
    lineName: 'București Nord ⇄ Aeroport Henri Coandă Otopeni',
    mode: 'TRAIN',
    provider: ROMANIAN_PROVIDERS.TRANSFEROVIAR,
    city: 'București',
    origin: 'București Nord',
    destination: 'Aeroport Henri Coandă T1',
    nextDepartures: [
      { time: '14:10', minutesUntil: 10, platform: 'Linia 13', crowdingLevel: 'LOW', isLiveTracking: true },
      { time: '14:50', minutesUntil: 50, platform: 'Linia 13', crowdingLevel: 'LOW' },
    ],
    frequencyDescription: 'Every 40 min • 20 min transit',
    status: 'ON_TIME',
    fareLei: 5.5,
    viaStops: ['Mogoșoaia', 'Patinaj PO Otopeni', 'Aeroport Henri Coandă T1'],
  },
  {
    id: 'tfc-r-15302',
    lineCode: 'R 15302',
    lineName: 'Galați ⇄ Bârlad (TFC Regional)',
    mode: 'TRAIN',
    provider: ROMANIAN_PROVIDERS.TRANSFEROVIAR,
    city: 'Galați',
    origin: 'Galați',
    destination: 'Bârlad',
    nextDepartures: [
      { time: '15:20', minutesUntil: 80, platform: 'Linia 3', crowdingLevel: 'LOW' },
    ],
    frequencyDescription: 'Regional connection • 2h 20m',
    status: 'ON_TIME',
    fareLei: 18.0,
    viaStops: ['Foltești', 'Târgu Bujor', 'Berești', 'Bârlad'],
  },
  {
    id: 'softrans-ir-15931',
    lineCode: 'IR 15931',
    lineName: 'Craiova ➔ București Nord ➔ Brașov (Hyperion)',
    mode: 'TRAIN',
    provider: ROMANIAN_PROVIDERS.SOFTRANS,
    city: 'Craiova',
    origin: 'Craiova',
    destination: 'Brașov',
    nextDepartures: [
      { time: '14:55', minutesUntil: 55, platform: 'Linia 2', crowdingLevel: 'MEDIUM', isLiveTracking: true },
    ],
    frequencyDescription: 'Electric Hyperion EMU • Free WiFi & Power',
    status: 'ON_TIME',
    fareLei: 45.0,
    viaStops: ['Videle', 'București Nord', 'Ploiești Vest', 'Câmpina', 'Sinaia', 'Brașov'],
  },
  {
    id: 'regio-calatori-r-14001',
    lineCode: 'R 14001',
    lineName: 'Brașov ➔ Zărnești (Regio Călători)',
    mode: 'TRAIN',
    provider: ROMANIAN_PROVIDERS.REGIO_CALATORI,
    city: 'Brașov',
    origin: 'Brașov',
    destination: 'Zărnești',
    nextDepartures: [
      { time: '14:40', minutesUntil: 40, platform: 'Linia 5', crowdingLevel: 'LOW' },
    ],
    frequencyDescription: 'Scenic Piatra Craiului route • 45 min',
    status: 'ON_TIME',
    fareLei: 8.5,
    viaStops: ['Bartolomeu', 'Cristian', 'Râșnov', 'Zărnești'],
  },
];
