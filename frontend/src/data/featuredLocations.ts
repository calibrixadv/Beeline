import { TransportMode } from '../components/RouteFinderCard';

export type LocationType = 'STATION' | 'METRO' | 'BUS_TRAM' | 'AIRPORT' | 'CURRENT_LOCATION';

export interface FeaturedLocation {
  id: string;
  name: string;
  city: string;
  type: LocationType;
  isMainHub?: boolean;
  description?: string;
  modes: TransportMode[];
}

export const FEATURED_LOCATIONS: FeaturedLocation[] = [
  // ----------------------------------------------------
  // BUCUREȘTI
  // ----------------------------------------------------
  {
    id: 'buc-gara-de-nord',
    name: 'București Nord',
    city: 'București',
    type: 'STATION',
    isMainHub: true,
    description: 'Main rail terminus • Connections to all Romanian & European destinations',
    modes: ['Trains', 'Metro', 'Busses'],
  },
  {
    id: 'buc-piata-unirii',
    name: 'Piața Unirii',
    city: 'București',
    type: 'METRO',
    isMainHub: true,
    description: 'Central subway interchange • Metro M1, M2, M3 & STB central hub',
    modes: ['Metro', 'Busses'],
  },
  {
    id: 'buc-piata-victoriei',
    name: 'Piața Victoriei',
    city: 'București',
    type: 'METRO',
    description: 'Business hub interchange • Metro M1 & M2',
    modes: ['Metro', 'Busses'],
  },
  {
    id: 'buc-otopeni-airport',
    name: 'Aeroport Otopeni (Henri Coandă)',
    city: 'București',
    type: 'AIRPORT',
    isMainHub: true,
    description: 'International airport • Direct 20m rail link to București Nord & Bus 100 Express',
    modes: ['Trains', 'Busses'],
  },
  {
    id: 'buc-pipera',
    name: 'Pipera',
    city: 'București',
    type: 'METRO',
    description: 'North business district terminus • Metro M2',
    modes: ['Metro', 'Busses'],
  },
  {
    id: 'buc-ghencea',
    name: 'Ghencea (Terminal Tram 41)',
    city: 'București',
    type: 'BUS_TRAM',
    description: 'Southwest light rail terminal • STB Tram 41 to Piața Presei',
    modes: ['Busses'],
  },
  {
    id: 'buc-gara-basarab',
    name: 'Gara Basarab',
    city: 'București',
    type: 'STATION',
    description: 'Regional rail terminal & Metro M1/M4 connection',
    modes: ['Trains', 'Metro'],
  },

  // ----------------------------------------------------
  // GALAȚI
  // ----------------------------------------------------
  {
    id: 'galati-gara-cfr',
    name: 'Gara Galați',
    city: 'Galați',
    type: 'STATION',
    isMainHub: true,
    description: 'Main rail passenger terminal • Direct trains to București, Iași & Brașov',
    modes: ['Trains'],
  },
  {
    id: 'galati-micro-19',
    name: 'Micro 19',
    city: 'Galați',
    type: 'BUS_TRAM',
    isMainHub: true,
    description: 'Southwest urban transit hub • Transurb Tram 39 & Bus 102 terminus',
    modes: ['Busses'],
  },
  {
    id: 'galati-bariera-traian',
    name: 'Bariera Traian',
    city: 'Galați',
    type: 'BUS_TRAM',
    description: 'East transit terminus • Transurb Bus 102 & regional bus connections',
    modes: ['Busses'],
  },
  {
    id: 'galati-spitalul-judetean',
    name: 'Spitalul Județean Galați',
    city: 'Galați',
    type: 'BUS_TRAM',
    description: 'Central transfer point • Brăilei corridor lines',
    modes: ['Busses'],
  },
  {
    id: 'galati-complex-brailei',
    name: 'Complex Brăilei (Flora)',
    city: 'Galați',
    type: 'BUS_TRAM',
    description: 'Central urban transit interchange',
    modes: ['Busses'],
  },
  {
    id: 'galati-cimitirul-israelit',
    name: 'Cimitirul Israelit (Ștefan cel Mare)',
    city: 'Galați',
    type: 'BUS_TRAM',
    description: 'Northern terminal • Transurb Tram 39 terminus',
    modes: ['Busses'],
  },

  // ----------------------------------------------------
  // CLUJ-NAPOCA
  // ----------------------------------------------------
  {
    id: 'cluj-gara-cfr',
    name: 'Gara Cluj-Napoca',
    city: 'Cluj-Napoca',
    type: 'STATION',
    isMainHub: true,
    description: 'Transylvania main rail hub • Direct connections to București, Oradea, Viena',
    modes: ['Trains', 'Busses'],
  },
  {
    id: 'cluj-piata-unirii',
    name: 'Piața Unirii Cluj',
    city: 'Cluj-Napoca',
    type: 'BUS_TRAM',
    isMainHub: true,
    description: 'Historical city center • CTP Cluj transit junction',
    modes: ['Busses'],
  },
  {
    id: 'cluj-airport',
    name: 'Aeroportul Internațional Avram Iancu',
    city: 'Cluj-Napoca',
    type: 'AIRPORT',
    description: 'Regional airport gateway • CTP Bus 5 connection',
    modes: ['Busses'],
  },
  {
    id: 'cluj-bucium',
    name: 'Bucium (Mănăștur)',
    city: 'Cluj-Napoca',
    type: 'BUS_TRAM',
    description: 'Western light rail terminal • CTP Tram 102',
    modes: ['Busses'],
  },
  {
    id: 'cluj-bdul-muncii',
    name: 'B-dul Muncii',
    city: 'Cluj-Napoca',
    type: 'BUS_TRAM',
    description: 'Eastern industrial terminus • CTP Tram 102',
    modes: ['Busses'],
  },

  // ----------------------------------------------------
  // TIMIȘOARA
  // ----------------------------------------------------
  {
    id: 'tm-gara-nord',
    name: 'Gara de Nord Timișoara',
    city: 'Timișoara',
    type: 'STATION',
    isMainHub: true,
    description: 'Main rail passenger hub • Connections to București, Arad, Budapesta',
    modes: ['Trains', 'Busses'],
  },
  {
    id: 'tm-piata-victoriei',
    name: 'Piața Victoriei Timișoara',
    city: 'Timișoara',
    type: 'BUS_TRAM',
    isMainHub: true,
    description: 'Central pedestrian and tram junction',
    modes: ['Busses'],
  },
  {
    id: 'tm-airport',
    name: 'Aeroportul Traian Vuia',
    city: 'Timișoara',
    type: 'AIRPORT',
    description: 'International airport • STPT Bus Express 4',
    modes: ['Busses'],
  },
  {
    id: 'tm-piata-traian',
    name: 'Piața Traian',
    city: 'Timișoara',
    type: 'BUS_TRAM',
    description: 'Fabric historical district tram hub • STPT Tram 1 & 2',
    modes: ['Busses'],
  },

  // ----------------------------------------------------
  // BRAȘOV
  // ----------------------------------------------------
  {
    id: 'bv-gara-cfr',
    name: 'Gara Brașov',
    city: 'Brașov',
    type: 'STATION',
    isMainHub: true,
    description: 'Prahova Valley rail nexus • High frequency IR trains to București Nord',
    modes: ['Trains', 'Busses'],
  },
  {
    id: 'bv-livada-postei',
    name: 'Livada Poștei',
    city: 'Brașov',
    type: 'BUS_TRAM',
    isMainHub: true,
    description: 'Historic center transit hub • RATBV bus junction and Poiana Brașov Line 20',
    modes: ['Busses'],
  },
  {
    id: 'bv-poiana-brasov',
    name: 'Poiana Brașov',
    city: 'Brașov',
    type: 'BUS_TRAM',
    description: 'Mountain resort hub • RATBV Line 20 terminus',
    modes: ['Busses'],
  },
  {
    id: 'bv-airport',
    name: 'Aeroportul Internațional Brașov-Ghimbav',
    city: 'Brașov',
    type: 'AIRPORT',
    description: 'International airport • Direct express bus A1 to Gara Brașov',
    modes: ['Busses'],
  },

  // ----------------------------------------------------
  // CONSTANȚA
  // ----------------------------------------------------
  {
    id: 'ct-gara-cfr',
    name: 'Gara Constanța',
    city: 'Constanța',
    type: 'STATION',
    isMainHub: true,
    description: 'Black Sea rail gateway • 160 km/h Sun Trains to București Nord',
    modes: ['Trains', 'Busses'],
  },
  {
    id: 'ct-mamaia',
    name: 'Mamaia Pasarelă',
    city: 'Constanța',
    type: 'BUS_TRAM',
    description: 'Seaside resort corridor • CT Bus 100M',
    modes: ['Busses'],
  },
  {
    id: 'ct-port',
    name: 'Gara Maritimă Port',
    city: 'Constanța',
    type: 'BUS_TRAM',
    description: 'Port passenger terminal & Old Town gateway',
    modes: ['Busses'],
  },

  // ----------------------------------------------------
  // IAȘI
  // ----------------------------------------------------
  {
    id: 'is-gara-cfr',
    name: 'Gara Iași',
    city: 'Iași',
    type: 'STATION',
    isMainHub: true,
    description: 'Moldova rail hub • Direct trains to București Nord & Galați',
    modes: ['Trains', 'Busses'],
  },
  {
    id: 'is-piata-unirii',
    name: 'Piața Unirii Iași',
    city: 'Iași',
    type: 'BUS_TRAM',
    isMainHub: true,
    description: 'Central tram & bus interchange • CTP Iași lines',
    modes: ['Busses'],
  },
  {
    id: 'is-airport',
    name: 'Aeroportul Internațional Iași',
    city: 'Iași',
    type: 'AIRPORT',
    description: 'International airport • CTP Bus 50 connection',
    modes: ['Busses'],
  },

  // ----------------------------------------------------
  // CRAIOVA
  // ----------------------------------------------------
  {
    id: 'cv-gara-cfr',
    name: 'Gara Craiova',
    city: 'Craiova',
    type: 'STATION',
    isMainHub: true,
    description: 'Oltenia rail hub • Softrans Hyperion & CFR terminus',
    modes: ['Trains', 'Busses'],
  },

  // ----------------------------------------------------
  // ORADEA
  // ----------------------------------------------------
  {
    id: 'or-gara-cfr',
    name: 'Gara Centrală Oradea',
    city: 'Oradea',
    type: 'STATION',
    isMainHub: true,
    description: 'Western rail gateway • Direct connections to Cluj and Budapesta',
    modes: ['Trains', 'Busses'],
  },

  // ----------------------------------------------------
  // SIBIU
  // ----------------------------------------------------
  {
    id: 'sb-gara-cfr',
    name: 'Gara Sibiu',
    city: 'Sibiu',
    type: 'STATION',
    isMainHub: true,
    description: 'Southern Transylvania rail terminal',
    modes: ['Trains', 'Busses'],
  },
];

export const ROMANIAN_HUB_CITIES = [
  'București',
  'Galați',
  'Cluj-Napoca',
  'Timișoara',
  'Brașov',
  'Constanța',
  'Iași',
  'Craiova',
  'Oradea',
  'Sibiu',
] as const;

export type RomanianHubCity = (typeof ROMANIAN_HUB_CITIES)[number];

export const CITY_ALIASES: Record<string, string[]> = {
  'București': ['bucuresti', 'bucharest', 'buc', 'capitala'],
  'Galați': ['galati', 'galatz'],
  'Cluj-Napoca': ['cluj', 'cluj napoca', 'kolozsvar'],
  'Timișoara': ['timisoara', 'temesvar'],
  'Brașov': ['brasov', 'kronstadt'],
  'Constanța': ['constanta', 'tomis'],
  'Iași': ['iasi', 'jassy'],
  'Craiova': ['craiova'],
  'Oradea': ['oradea', 'nagyvarad'],
  'Sibiu': ['sibiu', 'hermannstadt'],
};

/**
 * Common typo equivalences and phonetic stems for Romanian transit search.
 */
export const TOKEN_ALIASES: Record<string, string> = {
  unii: 'unirii',
  unir: 'unirii',
  bucharest: 'bucuresti',
  north: 'nord',
  train: 'gara',
  station: 'gara',
};

/**
 * Normalizes string for comparisons (removes diacritics, lowercase, trims whitespace).
 */
export const normalizeQuery = (text: string): string =>
  (text || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

export const normalizeSearchToken = (token: string): string => {
  const norm = normalizeQuery(token);
  return TOKEN_ALIASES[norm] || norm;
};

/**
 * Checks if a location matches a user query using tokenized, fuzzy, and alias matching.
 */
export const matchesLocationTokens = (loc: FeaturedLocation, rawQuery: string): boolean => {
  if (!loc) return false;
  const normalized = normalizeQuery(rawQuery);
  if (!normalized) return true;

  // Direct substring match
  if (
    normalizeQuery(loc.name).includes(normalized) ||
    normalizeQuery(loc.city).includes(normalized) ||
    (loc.description && normalizeQuery(loc.description).includes(normalized))
  ) {
    return true;
  }

  // Token-based matching: split query into distinct words (e.g. "piata unii bucharest" -> ["piata", "unii", "bucharest"])
  const tokens = normalized.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return true;

  const cityAliases = CITY_ALIASES[loc.city] || [];
  const corpus = [
    normalizeQuery(loc.name),
    normalizeQuery(loc.city),
    ...cityAliases.map(normalizeQuery),
    loc.description ? normalizeQuery(loc.description) : '',
  ].join(' ');

  // Check that every token in the query matches somewhere in the location's corpus
  return tokens.every((token) => {
    const normToken = normalizeSearchToken(token);
    // 1. Direct match in corpus
    if (corpus.includes(token) || corpus.includes(normToken)) {
      return true;
    }
    // 2. Prefix or fuzzy match (e.g. 'uni' -> 'unirii', 'micro' -> 'micro 19')
    if (token.length >= 3) {
      const words = corpus.split(/\s+/);
      if (
        words.some(
          (w) =>
            w.startsWith(token) ||
            token.startsWith(w) ||
            w.startsWith(normToken) ||
            normToken.startsWith(w)
        )
      ) {
        return true;
      }
    }
    return false;
  });
};

/**
 * Returns the primary train station for a given city.
 */
export const getMainRailStationForCity = (cityName: string): FeaturedLocation | undefined => {
  const normalizedCity = normalizeQuery(cityName);
  return FEATURED_LOCATIONS.find(
    (loc) =>
      loc.type === 'STATION' &&
      loc.isMainHub &&
      normalizeQuery(loc.city) === normalizedCity
  );
};

/**
 * Returns featured locations for a given city, with optional mode filtering and query search.
 */
export const getFeaturedLocationsForCity = (
  cityName: string,
  options?: {
    modes?: TransportMode[];
    query?: string;
    prioritizeInnercity?: boolean;
  }
): FeaturedLocation[] => {
  const normalizedCity = normalizeQuery(cityName);
  const normalizedSearch = options?.query ? normalizeQuery(options.query) : '';
  const modes = options?.modes;
  const prioritizeInnercity = options?.prioritizeInnercity ?? false;

  const cityMatches = FEATURED_LOCATIONS.filter((loc) => {
    // Check city match
    if (normalizeQuery(loc.city) !== normalizedCity) {
      return false;
    }

    // Check mode filtering if specified
    if (modes && modes.length > 0) {
      const hasMatchingMode = loc.modes.some((m) => modes.includes(m));
      if (!hasMatchingMode) {
        return false;
      }
    }

    // Check search query with token matching
    if (normalizedSearch) {
      return matchesLocationTokens(loc, options!.query!);
    }

    return true;
  });

  if (prioritizeInnercity) {
    // Sort inner-city (Metro, Bus/Tram) first, then Rail/Airport
    return [...cityMatches].sort((a, b) => {
      const isAInner = a.type === 'METRO' || a.type === 'BUS_TRAM';
      const isBInner = b.type === 'METRO' || b.type === 'BUS_TRAM';
      if (isAInner && !isBInner) return -1;
      if (!isAInner && isBInner) return 1;
      return 0;
    });
  }

  return cityMatches;
};

/**
 * Detects the city for a given station/hub location name.
 */
export const detectCityForLocation = (locationName: string): string | undefined => {
  if (!locationName) return undefined;
  const normalized = normalizeQuery(locationName);

  // 1. Direct name match in featured locations
  const match = FEATURED_LOCATIONS.find((loc) => normalizeQuery(loc.name) === normalized);
  if (match) return match.city;

  // 2. Token match in featured locations (e.g. "galati micro 19" -> Galați, "piata unii bucharest" -> București)
  const tokenMatch = FEATURED_LOCATIONS.find((loc) => matchesLocationTokens(loc, locationName));
  if (tokenMatch) return tokenMatch.city;

  // 3. City name or alias match directly in the location string
  for (const [cityName, aliases] of Object.entries(CITY_ALIASES)) {
    if (normalized.includes(normalizeQuery(cityName))) {
      return cityName;
    }
    for (const alias of aliases) {
      if (normalized.includes(normalizeQuery(alias))) {
        return cityName;
      }
    }
  }

  // 4. Hub cities direct match
  const cityMatch = ROMANIAN_HUB_CITIES.find((c) => normalizeQuery(c) === normalized);
  return cityMatch;
};

/**
 * Returns other major transit hubs outside of the specified city.
 */
export const getMajorRailHubsOutsideCity = (
  currentCityName: string,
  query?: string
): FeaturedLocation[] => {
  const normalizedCurrent = normalizeQuery(currentCityName);
  const normalizedSearch = query ? normalizeQuery(query) : '';

  return FEATURED_LOCATIONS.filter((loc) => {
    // Cannot be in current city
    if (normalizeQuery(loc.city) === normalizedCurrent) return false;

    // If a search query is provided, match ANY location outside current city that matches the tokens!
    if (normalizedSearch) {
      return matchesLocationTokens(loc, query!);
    }

    // Default outside recommendations (when no search query):
    // Include all train stations, airports, and major city transit hubs (isMainHub)
    return loc.type === 'STATION' || loc.type === 'AIRPORT' || Boolean(loc.isMainHub);
  });
};

/**
 * Looks up a featured location by exact name, normalized substring, or token matching.
 */
export const findFeaturedLocation = (nameOrQuery: string): FeaturedLocation | undefined => {
  if (!nameOrQuery) return undefined;
  const normalized = normalizeQuery(nameOrQuery);
  const direct = FEATURED_LOCATIONS.find((loc) => normalizeQuery(loc.name) === normalized);
  if (direct) return direct;
  return FEATURED_LOCATIONS.find((loc) => matchesLocationTokens(loc, nameOrQuery));
};

/**
 * Smart suggestion for Origin based on Destination, Current City, and Location State.
 *
 * Requirements:
 * - If user picks target to be another city:
 *   - If the user already has a valid customized origin in currentCity (e.g. "Micro 19" in Galați)
 *     and destination is a multi-modal non-rail hub (e.g. Metro "Piața Unirii" in București), DO NOT overwrite it!
 *   - If location is activated: starting location is user's current location (`📍 My Current Location (${currentCity})`)
 *   - If location is not active: current city's main train station (e.g. `București Nord` or `Gara Galați`)
 *   - If current city is not known: destination city's train station fallback.
 */
export const smartSuggestOrigin = (params: {
  destination: string;
  currentCity?: string;
  isLocationActive?: boolean;
  existingOrigin?: string;
}): string => {
  const {
    destination,
    currentCity = 'București',
    isLocationActive = false,
    existingOrigin,
  } = params;

  const destCity = detectCityForLocation(destination);
  const destLoc = findFeaturedLocation(destination);

  // If the user already has an existing origin specified:
  if (existingOrigin && existingOrigin.trim()) {
    const trimmed = existingOrigin.trim();
    // 1. Explicit GPS origin is always preserved
    if (trimmed.startsWith('📍')) {
      return trimmed;
    }

    const existingOriginCity = detectCityForLocation(trimmed);
    const isExistingOriginInCurrentCity =
      existingOriginCity && normalizeQuery(existingOriginCity) === normalizeQuery(currentCity);

    // 2. Door-to-door multi-modal edge case:
    // When traveling from a local/inner-city hub (e.g. "Micro 19" Galați) to a non-rail hub in another city
    // (e.g. Metro "Piața Unirii" in Bucharest), preserve the local origin for door-to-door transit!
    if (
      isExistingOriginInCurrentCity &&
      destLoc &&
      destLoc.type !== 'STATION' &&
      destLoc.type !== 'AIRPORT'
    ) {
      return trimmed;
    }

    // 3. Same-city journey preserves existing origin
    if (destCity && normalizeQuery(destCity) === normalizeQuery(currentCity)) {
      return trimmed;
    }
  }

  // If destination is in another city
  const isAnotherCity = destCity && normalizeQuery(destCity) !== normalizeQuery(currentCity);

  if (isAnotherCity) {
    if (isLocationActive) {
      return `📍 My Current Location (${currentCity})`;
    }

    const currentStation = getMainRailStationForCity(currentCity);
    if (currentStation) {
      return currentStation.name;
    }
  }

  // Fallback to current city main hub if available
  const hub = getMainRailStationForCity(currentCity);
  return hub ? hub.name : 'București Nord';
};
