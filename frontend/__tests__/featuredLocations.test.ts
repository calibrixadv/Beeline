import {
  FEATURED_LOCATIONS,
  ROMANIAN_HUB_CITIES,
  getFeaturedLocationsForCity,
  getMainRailStationForCity,
  detectCityForLocation,
  smartSuggestOrigin,
  getMajorRailHubsOutsideCity,
  normalizeQuery,
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
  });
});
