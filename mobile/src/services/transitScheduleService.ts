import {
  TransitLineSchedule,
  TransitProvider,
  ScheduleSection,
  ScheduleFilterParams,
} from '../types/schedule';
import {
  ROMANIAN_PROVIDERS,
  ROMANIAN_CITIES,
  ROMANIAN_TRANSIT_TEMPLATES,
} from '../data/romanianTransitTemplates';

/**
 * Calculates geographical distance in kilometers between two coordinates using Haversine formula.
 */
function getDistanceFromLatLonInKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Radius of the Earth in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export class TransitScheduleService {
  private templates: TransitLineSchedule[] = ROMANIAN_TRANSIT_TEMPLATES;
  private apiBaseUrl: string | null =
    (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_TRANSIT_API_URL) || null;

  /**
   * Fetches schedules matching filtering options.
   * Connects to backend API if EXPO_PUBLIC_TRANSIT_API_URL is configured,
   * otherwise queries the comprehensive Romanian transit templates.
   */
  async getSchedules(params: ScheduleFilterParams): Promise<TransitLineSchedule[]> {
    if (this.apiBaseUrl) {
      try {
        const query = new URLSearchParams();
        query.append('section', params.section);
        if (params.selectedCity && params.selectedCity !== 'ALL') {
          query.append('city', params.selectedCity);
        }
        if (params.providerId && params.providerId !== 'ALL') {
          query.append('provider', params.providerId);
        }
        if (params.searchQuery) {
          query.append('q', params.searchQuery);
        }
        if (params.modes && params.modes.length > 0) {
          query.append('modes', params.modes.join(','));
        }

        const res = await fetch(`${this.apiBaseUrl}/api/v1/transit/schedules?${query.toString()}`);
        if (res.ok) {
          return await res.json();
        }
      } catch (err) {
        // Fallback gracefully to template data
        console.warn('Backend transit server unavailable, falling back to local templates', err);
      }
    }

    // Filter local template data
    return this.getSchedulesSync(params);
  }

  /**
   * Synchronously filters the local template repository.
   */
  getSchedulesSync(params: ScheduleFilterParams): TransitLineSchedule[] {
    const { section, selectedCity, modes, providerId, searchQuery } = params;

    return this.templates.filter((item) => {
      // 1. Filter by section (Urban vs Train)
      if (section === 'URBAN') {
        if (item.mode === 'TRAIN') return false;
      } else if (section === 'TRAIN') {
        if (item.mode !== 'TRAIN') return false;
      }

      // 2. Filter by modes (if specific mode subset requested)
      if (modes && modes.length > 0) {
        if (!modes.includes(item.mode)) return false;
      }

      // 3. Filter by provider
      if (providerId && providerId !== 'ALL') {
        if (item.provider.id !== providerId) return false;
      }

      // 4. Filter by City
      if (selectedCity && selectedCity !== 'ALL') {
        const targetCity = selectedCity.trim().toLowerCase();
        if (section === 'URBAN') {
          if (item.city.toLowerCase() !== targetCity) return false;
        } else {
          // For trains: match city if originating, terminating, stopping in city, or city label
          const matchesOrigin = item.origin.toLowerCase().includes(targetCity);
          const matchesDest = item.destination.toLowerCase().includes(targetCity);
          const matchesCity = item.city.toLowerCase() === targetCity;
          const matchesStops = item.viaStops?.some((s) => s.toLowerCase().includes(targetCity));
          if (!matchesOrigin && !matchesDest && !matchesCity && !matchesStops) {
            return false;
          }
        }
      }

      // 5. Filter by Search Query
      if (searchQuery && searchQuery.trim().length > 0) {
        const q = searchQuery.trim().toLowerCase();
        const matchesCode = item.lineCode.toLowerCase().includes(q);
        const matchesName = item.lineName.toLowerCase().includes(q);
        const matchesOrigin = item.origin.toLowerCase().includes(q);
        const matchesDest = item.destination.toLowerCase().includes(q);
        const matchesProvider = item.provider.name.toLowerCase().includes(q) ||
          item.provider.shortName.toLowerCase().includes(q);
        const matchesCity = item.city.toLowerCase().includes(q);
        const matchesStops = item.viaStops?.some((s) => s.toLowerCase().includes(q));

        if (
          !matchesCode &&
          !matchesName &&
          !matchesOrigin &&
          !matchesDest &&
          !matchesProvider &&
          !matchesCity &&
          !matchesStops
        ) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      // Sort by earliest next departure
      const minA = a.nextDepartures[0]?.minutesUntil ?? 999;
      const minB = b.nextDepartures[0]?.minutesUntil ?? 999;
      return minA - minB;
    });
  }

  /**
   * Resolves the nearest Romanian city name from latitude & longitude coordinates.
   * If within 60 km radius of a known city, returns the city name.
   */
  detectNearestCity(lat: number, lon: number): string | null {
    let closestCity: string | null = null;
    let minDistance = Infinity;

    for (const city of ROMANIAN_CITIES) {
      const distance = getDistanceFromLatLonInKm(
        lat,
        lon,
        city.coords.latitude,
        city.coords.longitude
      );
      if (distance < minDistance) {
        minDistance = distance;
        closestCity = city.name;
      }
    }

    // Proximity threshold of 75km for metropolitan zones
    if (minDistance <= 75) {
      return closestCity;
    }

    return null;
  }

  /**
   * Returns list of all supported Romanian transit providers, optionally filtered by section.
   */
  getProviders(section?: ScheduleSection): TransitProvider[] {
    const list = Object.values(ROMANIAN_PROVIDERS);
    if (!section) return list;
    if (section === 'URBAN') {
      return list.filter((p) => p.modes.some((m) => m !== 'TRAIN'));
    }
    return list.filter((p) => p.modes.includes('TRAIN'));
  }

  /**
   * Returns list of available cities with transit coverage.
   */
  getAvailableCities(): string[] {
    return ROMANIAN_CITIES.map((c) => c.name);
  }
}

export const transitScheduleService = new TransitScheduleService();
