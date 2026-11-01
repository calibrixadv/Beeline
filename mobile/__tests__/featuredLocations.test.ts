import {
  FEATURED_LOCATIONS,
  ROMANIAN_HUB_CITIES,
  getFeaturedLocationsForCity,
  getMainRailStationForCity,
  detectCityForLocation,
  smartSuggestOrigin,
  getMajorRailHubsOutsideCity,
  normalizeQuery,
  matchesLocationTokens,
  findFeaturedLocation,
} from '../src/data/featuredLocations';

describe('featuredLocations data and heuristic helpers', () => {
  it('contains comprehensive Romanian featured transit locations', () => {
    expect(FEATURED_LOCATIONS.length).toBeGreaterThanOrEqual(25);
    expect(ROMANIAN_HUB_CITIES).toContain('București');
    expect(ROMANIAN_HUB_CITIES).toContain('Galați');
    expect(ROMANIAN_HUB_CITIES).toContain('Cluj-Napoca');
  });

  describe('normalizeQuery', () => {
    it('normalizes diacritics and case', () => {
      expect(normalizeQuery('București')).toBe('bucuresti');
      expect(normalizeQuery('GALAȚI  ')).toBe('galati');
      expect(normalizeQuery('Piața Unirii')).toBe('piata unirii');
    });
  });

  describe('getFeaturedLocationsForCity', () => {
    it('returns featured locations for București', () => {
      const bucLocations = getFeaturedLocationsForCity('București');
      expect(bucLocations.length).toBeGreaterThanOrEqual(5);

      const names = bucLocations.map((l) => l.name);
      expect(names).toContain('București Nord');
      expect(names).toContain('Piața Unirii');
      expect(names).toContain('Aeroport Otopeni (Henri Coandă)');
    });

    it('returns featured locations for Galați including Transurb hubs', () => {
      const galatiLocations = getFeaturedLocationsForCity('Galați');
      expect(galatiLocations.length).toBeGreaterThanOrEqual(4);

      const names = galatiLocations.map((l) => l.name);
      expect(names).toContain('Gara Galați');
      expect(names).toContain('Micro 19');
      expect(names).toContain('Bariera Traian');
    });

    it('filters by search query', () => {
      const results = getFeaturedLocationsForCity('București', { query: 'unirii' });
      expect(results.length).toBe(1);
      expect(results[0].name).toBe('Piața Unirii');
    });

    it('filters by transport modes', () => {
      const metroOnly = getFeaturedLocationsForCity('București', { modes: ['Metro'] });
      expect(metroOnly.every((l) => l.modes.includes('Metro'))).toBe(true);
    });

    it('prioritizes inner-city transit locations when flag is set', () => {
      const sorted = getFeaturedLocationsForCity('București', { prioritizeInnercity: true });
      const firstType = sorted[0].type;
      expect(['METRO', 'BUS_TRAM']).toContain(firstType);
    });
  });

  describe('getMainRailStationForCity', () => {
    it('returns main rail station for Bucharest and Galati', () => {
      const bucStation = getMainRailStationForCity('București');
      expect(bucStation?.name).toBe('București Nord');

      const galatiStation = getMainRailStationForCity('Galați');
      expect(galatiStation?.name).toBe('Gara Galați');

      const clujStation = getMainRailStationForCity('Cluj-Napoca');
      expect(clujStation?.name).toBe('Gara Cluj-Napoca');
    });
  });

  describe('detectCityForLocation', () => {
    it('detects city from location name', () => {
      expect(detectCityForLocation('București Nord')).toBe('București');
      expect(detectCityForLocation('Micro 19')).toBe('Galați');
      expect(detectCityForLocation('Gara Brașov')).toBe('Brașov');
      expect(detectCityForLocation('Cluj-Napoca')).toBe('Cluj-Napoca');
    });
  });

  describe('getMajorRailHubsOutsideCity', () => {
    it('returns major rail stations outside current city', () => {
      const outsideBuc = getMajorRailHubsOutsideCity('București');
      expect(outsideBuc.every((l) => l.city !== 'București')).toBe(true);

      const names = outsideBuc.map((l) => l.name);
      expect(names).toContain('Gara Brașov');
      expect(names).toContain('Gara Cluj-Napoca');
      expect(names).toContain('Gara Galați');
    });
  });

  describe('smartSuggestOrigin heuristic', () => {
    it('suggests Current Location when destination is in another city and location is active', () => {
      const origin = smartSuggestOrigin({
        destination: 'Gara Brașov',
        currentCity: 'Galați',
        isLocationActive: true,
      });

      expect(origin).toBe('📍 My Current Location (Galați)');
    });

    it('suggests current city main train station when destination is in another city and location is inactive', () => {
      const origin = smartSuggestOrigin({
        destination: 'Gara Brașov',
        currentCity: 'Galați',
        isLocationActive: false,
      });

      expect(origin).toBe('Gara Galați');
    });

    it('suggests București Nord when destination is in another city and current city is București', () => {
      const origin = smartSuggestOrigin({
        destination: 'Gara Constanța',
        currentCity: 'București',
        isLocationActive: false,
      });

      expect(origin).toBe('București Nord');
    });

    it('preserves inner-city origin (e.g. Micro 19 Galați) when destination is an urban transit hub (Piața Unirii)', () => {
      const origin = smartSuggestOrigin({
        destination: 'Piața Unirii',
        currentCity: 'Galați',
        isLocationActive: false,
        existingOrigin: 'Micro 19',
      });

      expect(origin).toBe('Micro 19');
    });

    it('pairs inner-city origin to train station when destination is a railway hub (Gara Brașov)', () => {
      const origin = smartSuggestOrigin({
        destination: 'Gara Brașov',
        currentCity: 'Galați',
        isLocationActive: false,
        existingOrigin: 'Micro 19',
      });

      expect(origin).toBe('Gara Galați');
    });
  });

  describe('matchesLocationTokens and findFeaturedLocation', () => {
    it('matches "piata unii bucharest" to Piața Unirii București handling typos and aliases', () => {
      const piataUnirii = FEATURED_LOCATIONS.find((l) => l.id === 'buc-piata-unirii')!;
      expect(matchesLocationTokens(piataUnirii, 'piata unii bucharest')).toBe(true);

      const found = findFeaturedLocation('piata unii bucharest');
      expect(found?.id).toBe('buc-piata-unirii');
      expect(found?.name).toBe('Piața Unirii');
    });

    it('matches "galati micro 19" to Micro 19 in Galați', () => {
      const micro19 = FEATURED_LOCATIONS.find((l) => l.id === 'galati-micro-19')!;
      expect(matchesLocationTokens(micro19, 'galati micro 19')).toBe(true);

      const found = findFeaturedLocation('galati micro 19');
      expect(found?.id).toBe('galati-micro-19');
      expect(found?.name).toBe('Micro 19');
    });

    it('finds Piața Unirii when searching outside hubs from Galați with typo query', () => {
      const outsideHubs = getMajorRailHubsOutsideCity('Galați', 'piata unii bucharest');
      expect(outsideHubs.length).toBeGreaterThanOrEqual(1);
      expect(outsideHubs[0].name).toBe('Piața Unirii');
      expect(outsideHubs[0].city).toBe('București');
    });
  });
});
