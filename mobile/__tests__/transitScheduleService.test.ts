import { transitScheduleService } from '../src/services/transitScheduleService';

describe('transitScheduleService', () => {
  it('filters by URBAN section returning only Metro, Tram, and Bus lines', async () => {
    const schedules = await transitScheduleService.getSchedules({ section: 'URBAN' });
    expect(schedules.length).toBeGreaterThan(0);
    schedules.forEach((line) => {
      expect(['METRO', 'TRAM', 'BUS']).toContain(line.mode);
      expect(line.mode).not.toBe('TRAIN');
    });
  });

  it('filters by TRAIN section returning only Romanian rail operators', async () => {
    const schedules = await transitScheduleService.getSchedules({ section: 'TRAIN' });
    expect(schedules.length).toBeGreaterThan(0);
    schedules.forEach((line) => {
      expect(line.mode).toBe('TRAIN');
    });

    const providers = new Set(schedules.map((s) => s.provider.shortName));
    expect(providers.has('CFR Călători')).toBe(true);
    expect(providers.has('Astra Trans Carpatic')).toBe(true);
    expect(providers.has('TFC')).toBe(true);
    expect(providers.has('Softrans')).toBe(true);
  });

  it('filters urban transit by city Galați returning Transurb lines', async () => {
    const schedules = await transitScheduleService.getSchedules({
      section: 'URBAN',
      selectedCity: 'Galați',
    });
    expect(schedules.length).toBeGreaterThan(0);
    schedules.forEach((line) => {
      expect(line.city).toBe('Galați');
      expect(line.provider.shortName).toBe('Transurb Galați');
    });

    const lineCodes = schedules.map((s) => s.lineCode);
    expect(lineCodes).toContain('Tram 39');
    expect(lineCodes).toContain('Bus 102');
  });

  it('filters urban transit by city București returning Metrorex and STB lines', async () => {
    const schedules = await transitScheduleService.getSchedules({
      section: 'URBAN',
      selectedCity: 'București',
    });
    expect(schedules.length).toBeGreaterThan(0);
    schedules.forEach((line) => {
      expect(line.city).toBe('București');
    });

    const providers = new Set(schedules.map((s) => s.provider.shortName));
    expect(providers.has('Metrorex')).toBe(true);
    expect(providers.has('STB')).toBe(true);
  });

  it('filters by specific mode subset (TRAM)', async () => {
    const schedules = await transitScheduleService.getSchedules({
      section: 'URBAN',
      modes: ['TRAM'],
    });
    expect(schedules.length).toBeGreaterThan(0);
    schedules.forEach((line) => {
      expect(line.mode).toBe('TRAM');
    });
  });

  it('filters by search query matching line code or station', async () => {
    const m2Schedules = await transitScheduleService.getSchedules({
      section: 'URBAN',
      searchQuery: 'M2',
    });
    expect(m2Schedules.length).toBeGreaterThanOrEqual(1);
    expect(m2Schedules[0].lineCode).toBe('M2');

    const poianaSchedules = await transitScheduleService.getSchedules({
      section: 'URBAN',
      searchQuery: 'Poiana Brașov',
    });
    expect(poianaSchedules.length).toBeGreaterThanOrEqual(1);
    expect(poianaSchedules[0].destination).toContain('Poiana Brașov');
  });

  it('detects nearest Romanian city from coordinates', () => {
    // Galați coordinates
    expect(transitScheduleService.detectNearestCity(45.435, 28.007)).toBe('Galați');

    // Bucharest coordinates
    expect(transitScheduleService.detectNearestCity(44.432, 26.103)).toBe('București');

    // Cluj coordinates
    expect(transitScheduleService.detectNearestCity(46.77, 23.60)).toBe('Cluj-Napoca');

    // Coordinates far outside Romania (e.g. North Atlantic)
    expect(transitScheduleService.detectNearestCity(10.0, -30.0)).toBeNull();
  });

  it('returns providers grouped by section', () => {
    const urbanProviders = transitScheduleService.getProviders('URBAN');
    const trainProviders = transitScheduleService.getProviders('TRAIN');

    expect(urbanProviders.some((p) => p.shortName.includes('Metrorex'))).toBe(true);
    expect(urbanProviders.some((p) => p.shortName.includes('Transurb'))).toBe(true);
    expect(urbanProviders.some((p) => p.shortName.includes('STB'))).toBe(true);

    expect(trainProviders.some((p) => p.shortName.includes('CFR'))).toBe(true);
    expect(trainProviders.some((p) => p.shortName.includes('Astra'))).toBe(true);
    expect(trainProviders.some((p) => p.shortName.includes('TFC'))).toBe(true);
  });
});
