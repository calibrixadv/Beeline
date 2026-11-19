import {
  StationAutocompleteItem,
  WeeklyStationSyncMeta,
  StationAutocompleteCatalogResponse,
} from '../types/station';
import { apiClient } from './apiClient';

export const FALLBACK_STATION_HUBS: StationAutocompleteItem[] = [
  {
    code: 'BCT',
    name: 'București Nord',
    city: 'București',
    modes: ['TRAIN'],
    coordinates: { latitude: 44.4473, longitude: 26.0746, city: 'București' },
    dailyTrainCount: 509,
    operators: ['CFR Călători', 'Regio Călători', 'Transferoviar Călători', 'Astra Trans Carpatic', 'Softrans'],
    isMajorHub: true,
  },
  {
    code: 'GLT',
    name: 'Galați',
    city: 'Galați',
    modes: ['TRAIN'],
    coordinates: { latitude: 45.4382, longitude: 28.0561, city: 'Galați' },
    dailyTrainCount: 60,
    operators: ['CFR Călători', 'Transferoviar Călători'],
    isMajorHub: true,
  },
  {
    code: 'BSV',
    name: 'Brașov',
    city: 'Brașov',
    modes: ['TRAIN'],
    coordinates: { latitude: 45.6608, longitude: 25.6144, city: 'Brașov' },
    dailyTrainCount: 180,
    operators: ['CFR Călători', 'Regio Călători', 'Transferoviar Călători', 'Astra Trans Carpatic', 'Softrans'],
    isMajorHub: true,
  },
  {
    code: 'CTA',
    name: 'Constanța',
    city: 'Constanța',
    modes: ['TRAIN'],
    coordinates: { latitude: 44.1704, longitude: 28.6302, city: 'Constanța' },
    dailyTrainCount: 168,
    operators: ['CFR Călători', 'Transferoviar Călători', 'Astra Trans Carpatic', 'Softrans'],
    isMajorHub: true,
  },
  {
    code: 'CJN',
    name: 'Cluj-Napoca',
    city: 'Cluj-Napoca',
    modes: ['TRAIN'],
    coordinates: { latitude: 46.7842, longitude: 23.5872, city: 'Cluj-Napoca' },
    dailyTrainCount: 140,
    operators: ['CFR Călători', 'Interregional Călători', 'Regio Călători', 'Transferoviar Călători'],
    isMajorHub: true,
  },
  {
    code: 'TIM',
    name: 'Timișoara Nord',
    city: 'Timișoara',
    modes: ['TRAIN'],
    coordinates: { latitude: 45.7511, longitude: 21.2084, city: 'Timișoara' },
    dailyTrainCount: 132,
    operators: ['CFR Călători', 'Regio Călători', 'Astra Trans Carpatic'],
    isMajorHub: true,
  },
  {
    code: 'ARD',
    name: 'Arad',
    city: 'Arad',
    modes: ['TRAIN'],
    coordinates: { latitude: 46.1883, longitude: 21.3235, city: 'Arad' },
    dailyTrainCount: 125,
    operators: ['CFR Călători', 'Regio Călători', 'Astra Trans Carpatic'],
    isMajorHub: true,
  },
  {
    code: 'IAS',
    name: 'Iași',
    city: 'Iași',
    modes: ['TRAIN'],
    coordinates: { latitude: 47.1685, longitude: 27.5701, city: 'Iași' },
    dailyTrainCount: 110,
    operators: ['CFR Călători', 'Regio Călători'],
    isMajorHub: true,
  },
  {
    code: 'PLS',
    name: 'Ploiești Sud',
    city: 'Ploiești',
    modes: ['TRAIN'],
    coordinates: { latitude: 44.9272, longitude: 26.0354, city: 'Ploiești' },
    dailyTrainCount: 169,
    operators: ['CFR Călători', 'Transferoviar Călători'],
    isMajorHub: true,
  },
  {
    code: 'PLV',
    name: 'Ploiești Vest',
    city: 'Ploiești',
    modes: ['TRAIN'],
    coordinates: { latitude: 44.9331, longitude: 25.9992, city: 'Ploiești' },
    dailyTrainCount: 137,
    operators: ['CFR Călători', 'Regio Călători', 'Astra Trans Carpatic', 'Transferoviar Călători', 'Softrans'],
    isMajorHub: true,
  },
  {
    code: 'BRL',
    name: 'Brăila',
    city: 'Brăila',
    modes: ['TRAIN'],
    coordinates: { latitude: 45.2751, longitude: 27.9554, city: 'Brăila' },
    dailyTrainCount: 52,
    operators: ['CFR Călători', 'Transferoviar Călători'],
    isMajorHub: true,
  },
  {
    code: 'BUZ',
    name: 'Buzău',
    city: 'Buzău',
    modes: ['TRAIN'],
    coordinates: { latitude: 45.1432, longitude: 26.8306, city: 'Buzău' },
    dailyTrainCount: 115,
    operators: ['CFR Călători', 'Transferoviar Călători'],
    isMajorHub: true,
  },
  {
    code: 'IBZ',
    name: 'Întorsura Buzăului',
    city: 'Întorsura Buzăului',
    modes: ['TRAIN'],
    coordinates: { latitude: 45.6728, longitude: 26.0358, city: 'Întorsura Buzăului' },
    dailyTrainCount: 12,
    operators: ['Regio Călători'],
    isMajorHub: false,
  },
  {
    code: 'CRA',
    name: 'Craiova',
    city: 'Craiova',
    modes: ['TRAIN'],
    coordinates: { latitude: 44.3328, longitude: 23.8153, city: 'Craiova' },
    dailyTrainCount: 95,
    operators: ['CFR Călători', 'Softrans', 'Astra Trans Carpatic'],
    isMajorHub: true,
  },
  {
    code: 'SBZ',
    name: 'Sibiu',
    city: 'Sibiu',
    modes: ['TRAIN'],
    coordinates: { latitude: 45.7981, longitude: 24.1601, city: 'Sibiu' },
    dailyTrainCount: 80,
    operators: ['CFR Călători', 'Regio Călători', 'Interregional Călători'],
    isMajorHub: true,
  },
  {
    code: 'SNA',
    name: 'Sinaia',
    city: 'Sinaia',
    modes: ['TRAIN'],
    coordinates: { latitude: 45.3533, longitude: 25.5539, city: 'Sinaia' },
    dailyTrainCount: 75,
    operators: ['CFR Călători', 'Regio Călători', 'Astra Trans Carpatic', 'Transferoviar Călători', 'Softrans'],
    isMajorHub: true,
  },
];

/**
 * Normalizes Romanian text for diacritic-insensitive searching:
 * ă/â -> a, î -> i, ș/ş -> s, ț/ţ -> t.
 */
export function normalizeRomanianText(text: string): string {
  if (!text) return '';
  return text
    .replace(/ș|Ș|ş|Ş/g, 's')
    .replace(/ț|Ț|ţ|Ţ/g, 't')
    .replace(/ă|Ă|â|Â/g, 'a')
    .replace(/î|Î/g, 'i')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

class StationAutocompleteService {
  private inMemoryCatalog: StationAutocompleteItem[] | null = null;
  private weeklyMeta: WeeklyStationSyncMeta | null = null;
  private loadingPromise: Promise<StationAutocompleteItem[]> | null = null;

  private getStorageKey(isoWeek?: string): string {
    return isoWeek ? `beeline_stations_catalog_${isoWeek}` : 'beeline_stations_catalog';
  }

  /**
   * Loads the weekly synced station catalog from backend with local caching.
   */
  async loadCatalog(): Promise<StationAutocompleteItem[]> {
    if (this.inMemoryCatalog && this.inMemoryCatalog.length > 0) {
      return this.inMemoryCatalog;
    }

    if (this.loadingPromise) {
      return this.loadingPromise;
    }

    this.loadingPromise = (async () => {
      // 1. Try reading from browser localStorage first
      if (typeof window !== 'undefined' && window.localStorage) {
        try {
          const cachedMetaStr = window.localStorage.getItem('beeline_stations_weekly_meta');
          if (cachedMetaStr) {
            const cachedMeta: WeeklyStationSyncMeta = JSON.parse(cachedMetaStr);
            const cachedCatalogStr = window.localStorage.getItem(this.getStorageKey(cachedMeta.isoWeek));
            if (cachedCatalogStr) {
              const cachedStations: StationAutocompleteItem[] = JSON.parse(cachedCatalogStr);
              if (cachedStations && cachedStations.length > 0) {
                this.inMemoryCatalog = cachedStations;
                this.weeklyMeta = cachedMeta;
                // Kick off non-blocking background fetch to verify freshness
                this.refreshFromBackendInBackground().catch(() => {});
                return cachedStations;
              }
            }
          }
        } catch {
          // localStorage parse error fallback
        }
      }

      // 2. Fetch from backend API
      try {
        const res: StationAutocompleteCatalogResponse = await apiClient.fetchStationAutocompleteCatalog();
        if (res && res.stations && res.stations.length > 0) {
          this.inMemoryCatalog = res.stations;
          this.weeklyMeta = res.weeklySync;
          this.persistToLocalStorage(res.weeklySync, res.stations);
          return res.stations;
        }
      } catch (err) {
        // Fallback to hub list in offline or Jest test runs
      }

      this.inMemoryCatalog = FALLBACK_STATION_HUBS;
      this.weeklyMeta = {
        isoWeek: '2026-W47',
        lastSyncedAt: new Date().toISOString(),
        nextWeeklySyncAt: '2026-11-23T00:05:00+02:00',
        totalStations: FALLBACK_STATION_HUBS.length,
        source: 'OFFLINE_FALLBACK',
        schedule: 'WEEKLY_MONDAY_00_05_RO',
      };
      return this.inMemoryCatalog;
    })();

    const result = await this.loadingPromise;
    this.loadingPromise = null;
    return result;
  }

  private persistToLocalStorage(meta: WeeklyStationSyncMeta, stations: StationAutocompleteItem[]) {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      window.localStorage.setItem('beeline_stations_weekly_meta', JSON.stringify(meta));
      window.localStorage.setItem(this.getStorageKey(meta.isoWeek), JSON.stringify(stations));
    } catch {
      // Storage quota or private browsing mode
    }
  }

  private async refreshFromBackendInBackground() {
    try {
      const res = await apiClient.fetchStationAutocompleteCatalog();
      if (res && res.stations && res.stations.length > 0) {
        this.inMemoryCatalog = res.stations;
        this.weeklyMeta = res.weeklySync;
        this.persistToLocalStorage(res.weeklySync, res.stations);
      }
    } catch {
      // Background refresh silent fail
    }
  }

  getWeeklySyncMeta(): WeeklyStationSyncMeta | null {
    return this.weeklyMeta;
  }

  getCachedStations(): StationAutocompleteItem[] {
    return this.inMemoryCatalog || FALLBACK_STATION_HUBS;
  }

  /**
   * Filters and ranks stations using Romanian diacritic-insensitive ranking:
   * 1. Exact code match (score 100)
   * 2. Exact normalized name match (score 90)
   * 3. Name starts with query (score 80)
   * 4. Word in name starts with query (score 70)
   * 5. Substring match in name or code (score 60)
   * Tie-breaker: dailyTrainCount descending.
   */
  async filterStations(
    query: string = '',
    options: {
      limit?: number;
      excludeStationName?: string;
    } = {}
  ): Promise<StationAutocompleteItem[]> {
    const limit = options.limit || 8;
    const stations = await this.loadCatalog();

    const qn = normalizeRomanianText(query);
    const excludeNorm = options.excludeStationName
      ? normalizeRomanianText(options.excludeStationName)
      : null;

    if (!qn) {
      // Return top hubs
      return stations
        .filter((s) => !excludeNorm || normalizeRomanianText(s.name) !== excludeNorm)
        .slice(0, limit);
    }

    const scored: { score: number; trainCount: number; station: StationAutocompleteItem }[] = [];

    for (const station of stations) {
      const nameNorm = normalizeRomanianText(station.name);
      const codeNorm = normalizeRomanianText(station.code);

      let score = 0;
      if (codeNorm === qn) {
        score = 100;
      } else if (nameNorm === qn) {
        score = 90;
      } else if (nameNorm.startsWith(qn)) {
        score = 80;
      } else if (nameNorm.split(/\s+/).some((w) => w.startsWith(qn))) {
        score = 70;
      } else if (nameNorm.includes(qn) || codeNorm.includes(qn)) {
        score = 60;
      } else {
        continue;
      }

      // Slightly deprioritize excluded opposite endpoint if present
      if (excludeNorm && nameNorm === excludeNorm) {
        score -= 20;
      }

      scored.push({
        score,
        trainCount: station.dailyTrainCount || 0,
        station,
      });
    }

    scored.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return b.trainCount - a.trainCount;
    });

    return scored.slice(0, limit).map((item) => item.station);
  }

  getStationByCode(code: string): StationAutocompleteItem | undefined {
    const pool = this.getCachedStations();
    return pool.find((s) => s.code.toUpperCase() === code.trim().toUpperCase());
  }

  getStationByName(name: string): StationAutocompleteItem | undefined {
    const pool = this.getCachedStations();
    const norm = normalizeRomanianText(name);
    return pool.find((s) => normalizeRomanianText(s.name) === norm);
  }
}

export const stationAutocompleteService = new StationAutocompleteService();
