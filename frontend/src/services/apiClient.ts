import {
  UserProfile,
  TokenResponse,
  MFALoginChallengeResponse,
  MFASetupResponse,
  SessionResponse,
  ForgotPasswordResponse,
  SavedRouteResponse,
  BreachCheckResult,
  NotificationStatusResponse,
  TestDepartureAlertRequest,
  TestDepartureAlertResponse,
  UserPreferences,
} from '../types/auth';
import { TransitRoutePlan, TransitRouteQuery, BookingWindow, CuratedPillar, TrainItineraryResponse } from '../types/routePlan';
import { TrainJourney } from '../types/train';
import {
  StationAutocompleteCatalogResponse,
  StationSearchResponse,
} from '../types/station';

export interface RoutePlanResponse {
  plans: TransitRoutePlan[];
  recommendedPlanId: string;
  query: TransitRouteQuery;
  generatedAt: string;
  bookingWindow?: BookingWindow;
  allDayDepartures?: TrainJourney[];
  totalDayRoutes?: number;
}

export interface RailOperatorSummary {
  id: string;
  shortName: string;
  name: string;
  dailyTrains: number;
  routes: number;
}

export interface OperatorsSummaryResponse {
  totalDailyTrains: number;
  totalRoutes: number;
  operatorCount: number;
  updatedAt: string;
  source: string;
  operators: RailOperatorSummary[];
}

class TokenStorage {
  private inMemoryAccess: string | null = null;
  private inMemoryRefresh: string | null = null;

  getAccessToken(): string | null {
    if (this.inMemoryAccess) return this.inMemoryAccess;
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem('beeline_access_token');
      }
    } catch {}
    return null;
  }

  getRefreshToken(): string | null {
    if (this.inMemoryRefresh) return this.inMemoryRefresh;
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem('beeline_refresh_token');
      }
    } catch {}
    return null;
  }

  setTokens(accessToken: string, refreshToken: string) {
    this.inMemoryAccess = accessToken;
    this.inMemoryRefresh = refreshToken;
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem('beeline_access_token', accessToken);
        window.localStorage.setItem('beeline_refresh_token', refreshToken);
      }
    } catch {}
  }

  clear() {
    this.inMemoryAccess = null;
    this.inMemoryRefresh = null;
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem('beeline_access_token');
        window.localStorage.removeItem('beeline_refresh_token');
      }
    } catch {}
  }
}

export const tokenStorage = new TokenStorage();

export class ApiClient {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl =
      baseUrl ||
      (typeof process !== 'undefined' &&
        (process.env?.NEXT_PUBLIC_API_URL || process.env?.EXPO_PUBLIC_API_URL)) ||
      'http://localhost:8000/api/v1';
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }

  private async fetchWithAuth(
    endpoint: string,
    options: RequestInit = {},
    retryOnAuthFailure: boolean = true
  ): Promise<Response> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    const token = tokenStorage.getAccessToken();
    if (token && !headers['Authorization']) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    let response: Response;
    try {
      response = await fetch(url, { ...options, headers });
    } catch (err) {
      // In-browser fallback: if direct cross-origin fetch to localhost:8000 fails (e.g. CORS or network boundary),
      // retry via Next.js same-origin rewrite proxy (/api/v1/...)
      if (typeof window !== 'undefined' && url.startsWith('http://localhost:8000/api/v1')) {
        const proxyUrl = `/api/v1${endpoint}`;
        response = await fetch(proxyUrl, { ...options, headers });
      } else {
        throw err;
      }
    }

    if (response.status === 401 && retryOnAuthFailure) {
      const refreshToken = tokenStorage.getRefreshToken();
      if (refreshToken) {
        try {
          const refreshRes = await this.refreshToken(refreshToken);
          tokenStorage.setTokens(refreshRes.access_token, refreshRes.refresh_token);
          // Retry original request with fresh access token
          headers['Authorization'] = `Bearer ${refreshRes.access_token}`;
          return await fetch(url, { ...options, headers });
        } catch {
          tokenStorage.clear();
        }
      }
    }

    return response;
  }

  // ==========================================
  // AUTH METHODS
  // ==========================================

  async signup(data: { email: string; password: string; username?: string; full_name?: string }): Promise<TokenResponse> {
    const res = await this.fetchWithAuth('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(data),
    }, false);

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Registration failed' }));
      throw new Error(err.detail || 'Registration failed');
    }

    const json: TokenResponse = await res.json();
    tokenStorage.setTokens(json.access_token, json.refresh_token);
    return json;
  }

  async login(data: { email?: string; username?: string; password: string }): Promise<TokenResponse | MFALoginChallengeResponse> {
    const res = await this.fetchWithAuth('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    }, false);

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Invalid credentials' }));
      throw new Error(err.detail || 'Invalid credentials');
    }

    const json = await res.json();
    if (json.mfa_required) {
      return json as MFALoginChallengeResponse;
    }

    const tokenRes = json as TokenResponse;
    tokenStorage.setTokens(tokenRes.access_token, tokenRes.refresh_token);
    return tokenRes;
  }

  async checkBreach(data: { password?: string; email?: string }): Promise<BreachCheckResult> {
    const res = await this.fetchWithAuth('/auth/check-breach', {
      method: 'POST',
      body: JSON.stringify(data),
    }, false);

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Breach check unavailable' }));
      throw new Error(err.detail || 'Breach check unavailable');
    }

    return res.json();
  }

  async loginAsGuest(): Promise<TokenResponse> {
    const res = await this.fetchWithAuth('/auth/guest', {
      method: 'POST',
      body: JSON.stringify({ device_info: 'Web/Mobile Client' }),
    }, false);

    if (!res.ok) {
      throw new Error('Could not create guest session');
    }

    const json: TokenResponse = await res.json();
    tokenStorage.setTokens(json.access_token, json.refresh_token);
    return json;
  }

  async convertGuest(data: { email: string; password: string; full_name?: string }): Promise<UserProfile> {
    const res = await this.fetchWithAuth('/auth/guest/convert', {
      method: 'POST',
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to convert account' }));
      throw new Error(err.detail || 'Failed to convert account');
    }

    return res.json();
  }

  async refreshToken(refreshToken: string): Promise<TokenResponse> {
    const res = await fetch(`${this.baseUrl}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!res.ok) {
      throw new Error('Refresh token invalid or expired');
    }

    return res.json();
  }

  async logout(): Promise<void> {
    try {
      await this.fetchWithAuth('/auth/logout', { method: 'POST' }, false);
    } finally {
      tokenStorage.clear();
    }
  }

  async forgotPassword(email: string): Promise<ForgotPasswordResponse> {
    const res = await this.fetchWithAuth('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }, false);

    return res.json();
  }

  async resetPassword(data: { reset_token: string; new_password: string }): Promise<{ message: string }> {
    const res = await this.fetchWithAuth('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(data),
    }, false);

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Password reset failed' }));
      throw new Error(err.detail || 'Password reset failed');
    }

    return res.json();
  }

  // ==========================================
  // MFA METHODS
  // ==========================================

  async setupMFA(): Promise<MFASetupResponse> {
    const res = await this.fetchWithAuth('/auth/mfa/setup', { method: 'POST' });
    if (!res.ok) throw new Error('Failed to initiate MFA setup');
    return res.json();
  }

  async confirmMFA(code: string): Promise<{ message: string }> {
    const res = await this.fetchWithAuth('/auth/mfa/verify', {
      method: 'POST',
      body: JSON.stringify({ code }),
    });
    if (!res.ok) throw new Error('Invalid verification code');
    return res.json();
  }

  async verifyMFAChallenge(data: {
    mfa_session_token: string;
    totp_code?: string;
    backup_code?: string;
  }): Promise<TokenResponse> {
    const res = await this.fetchWithAuth('/auth/mfa/challenge', {
      method: 'POST',
      body: JSON.stringify(data),
    }, false);

    if (!res.ok) throw new Error('MFA challenge failed');
    const json: TokenResponse = await res.json();
    tokenStorage.setTokens(json.access_token, json.refresh_token);
    return json;
  }

  async disableMFA(password: string): Promise<{ message: string }> {
    const res = await this.fetchWithAuth('/auth/mfa/disable', {
      method: 'POST',
      body: JSON.stringify({ password }),
    });
    if (!res.ok) throw new Error('Failed to disable MFA');
    return res.json();
  }

  // ==========================================
  // USER & SESSION METHODS
  // ==========================================

  async getMe(): Promise<UserProfile> {
    const res = await this.fetchWithAuth('/users/me');
    if (!res.ok) throw new Error('Failed to fetch user profile');
    return res.json();
  }

  async getSessions(): Promise<SessionResponse[]> {
    const res = await this.fetchWithAuth('/users/me/sessions');
    if (!res.ok) throw new Error('Failed to fetch sessions');
    return res.json();
  }

  async revokeSession(sessionId: string): Promise<{ message: string }> {
    const res = await this.fetchWithAuth(`/users/me/sessions/${sessionId}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to revoke session');
    return res.json();
  }

  // ==========================================
  // USER PREFERENCES & NOTIFICATION METHODS
  // ==========================================

  async getPreferences(): Promise<UserPreferences> {
    const res = await this.fetchWithAuth('/users/me/preferences');
    if (!res.ok) throw new Error('Failed to fetch user preferences');
    return res.json();
  }

  async updatePreferences(preferences: Partial<UserPreferences>): Promise<UserPreferences> {
    const res = await this.fetchWithAuth('/users/me/preferences', {
      method: 'PATCH',
      body: JSON.stringify(preferences),
    });
    if (!res.ok) throw new Error('Failed to update user preferences');
    return res.json();
  }

  async getNotificationStatus(): Promise<NotificationStatusResponse> {
    const res = await this.fetchWithAuth('/notifications/status');
    if (!res.ok) throw new Error('Failed to fetch notification status');
    return res.json();
  }

  async sendTestDepartureAlert(
    payload?: TestDepartureAlertRequest
  ): Promise<TestDepartureAlertResponse> {
    const res = await this.fetchWithAuth('/notifications/test-departure-alert', {
      method: 'POST',
      body: JSON.stringify(payload || {}),
    });
    if (!res.ok) {
      let msg = 'Failed to send test departure email';
      try {
        const err = await res.json();
        if (err.detail) msg = typeof err.detail === 'string' ? err.detail : JSON.stringify(err.detail);
      } catch {}
      throw new Error(msg);
    }
    return res.json();
  }

  // ==========================================
  // ROUTING & SCHEDULE METHODS
  // ==========================================

  async planRoute(query: TransitRouteQuery): Promise<RoutePlanResponse> {
    const res = await this.fetchWithAuth('/routes/plan', {
      method: 'POST',
      body: JSON.stringify(query),
    });

    if (!res.ok) {
      let errorMsg = 'Failed to compute route plan';
      try {
        const err = await res.json();
        if (err.detail) errorMsg = typeof err.detail === 'string' ? err.detail : JSON.stringify(err.detail);
      } catch {}
      const error = new Error(errorMsg);
      (error as any).status = res.status;
      throw error;
    }
    const data: RoutePlanResponse = await res.json();

    if (data && Array.isArray(data.plans)) {
      data.plans = data.plans.map((plan) => {
        if (plan) {
          const rawPlan = plan as unknown as Record<string, unknown>;
          const rawPillars = rawPlan.curatedPillars || rawPlan.curated_pillars;
          if (Array.isArray(rawPillars)) {
            plan.curatedPillars = rawPillars as CuratedPillar[];
          } else if (plan.curatedPillar) {
            plan.curatedPillars = [plan.curatedPillar];
          } else {
            plan.curatedPillars = [];
          }

          if (plan.riskAnalysis) {
            const rawRisk = plan.riskAnalysis as unknown as Record<string, unknown>;
            plan.riskAnalysis = {
              ...plan.riskAnalysis,
              expectedDelayMinutes:
                typeof rawRisk.expectedDelayMinutes === 'number'
                  ? rawRisk.expectedDelayMinutes
                  : typeof rawRisk.expected_delay_minutes === 'number'
                  ? (rawRisk.expected_delay_minutes as number)
                  : 0,
              missedConnectionProbability:
                typeof rawRisk.missedConnectionProbability === 'number'
                  ? rawRisk.missedConnectionProbability
                  : typeof rawRisk.missed_connection_probability === 'number'
                  ? (rawRisk.missed_connection_probability as number)
                  : 0.0,
              riskFactors: Array.isArray(rawRisk.riskFactors)
                ? (rawRisk.riskFactors as string[])
                : Array.isArray(rawRisk.risk_factors)
                ? (rawRisk.risk_factors as string[])
                : Array.isArray(rawRisk.delayRiskFactors)
                ? (rawRisk.delayRiskFactors as string[])
                : [],
              isMlComputed:
                typeof rawRisk.isMlComputed === 'boolean'
                  ? rawRisk.isMlComputed
                  : typeof rawRisk.is_ml_computed === 'boolean'
                  ? (rawRisk.is_ml_computed as boolean)
                  : false,
            };
          }
        }
        return plan;
      });
    }

    return data;
  }

  async getTrains(params?: {
    origin?: string;
    destination?: string;
    date?: string;
    travel_date?: string;
    operator?: string;
    status?: string;
    page?: number;
    page_size?: number;
    pageSize?: number;
    searchQuery?: string;
    trainNumber?: string;
    trainCode?: string;
    q?: string;
  }): Promise<{ items: TrainJourney[]; data?: TrainJourney[]; total: number; bookingWindow?: BookingWindow; pagination?: any }> {
    const urlParams = new URLSearchParams();
    if (params?.origin) urlParams.append('origin', params.origin);
    if (params?.destination) urlParams.append('destination', params.destination);
    if (params?.travel_date) urlParams.append('travel_date', params.travel_date);
    else if (params?.date) urlParams.append('date', params.date);
    if (params?.operator) urlParams.append('operator', params.operator);
    if (params?.status) urlParams.append('status', params.status);

    const queryVal = params?.searchQuery || params?.trainNumber || params?.trainCode || params?.q;
    if (queryVal) {
      urlParams.append('searchQuery', queryVal);
    }
    const pageVal = params?.page;
    if (pageVal) urlParams.append('page', String(pageVal));
    const pageSizeVal = params?.pageSize || params?.page_size;
    if (pageSizeVal) urlParams.append('pageSize', String(pageSizeVal));

    const qs = urlParams.toString();
    const endpoint = `/trains${qs ? `?${qs}` : ''}`;
    const res = await this.fetchWithAuth(endpoint);

    if (!res.ok) {
      let errorMsg = 'Failed to fetch trains';
      try {
        const err = await res.json();
        if (err.detail) errorMsg = typeof err.detail === 'string' ? err.detail : JSON.stringify(err.detail);
      } catch {}
      const e = new Error(errorMsg);
      (e as any).status = res.status;
      throw e;
    }

    const raw = await res.json();
    const items: TrainJourney[] = Array.isArray(raw?.data)
      ? raw.data
      : Array.isArray(raw?.items)
      ? raw.items
      : [];
    const total: number =
      typeof raw?.pagination?.totalItems === 'number'
        ? raw.pagination.totalItems
        : typeof raw?.total === 'number'
        ? raw.total
        : items.length;

    return {
      items,
      data: items,
      total,
      pagination: raw?.pagination,
      bookingWindow: raw?.bookingWindow,
    };
  }

  async fetchTrainItinerary(
    trainNumber: string,
    date?: string
  ): Promise<TrainItineraryResponse> {
    const encodedNumber = encodeURIComponent(trainNumber.trim());
    const dateParam = date ? `?date=${encodeURIComponent(date.slice(0, 10))}` : '';
    const res = await this.fetchWithAuth(`/trains/${encodedNumber}/itinerary${dateParam}`);

    if (!res.ok) {
      let errorMsg = `Failed to fetch itinerary for train ${trainNumber}`;
      try {
        const err = await res.json();
        if (err.detail) errorMsg = typeof err.detail === 'string' ? err.detail : JSON.stringify(err.detail);
      } catch {}
      const e = new Error(errorMsg);
      (e as any).status = res.status;
      throw e;
    }
    return res.json();
  }

  async getTimetableStatus(): Promise<{
    activeTimetable: string;
    totalDailyTrains: number;
    totalRoutes: number;
    operators: Record<string, number>;
    bookingWindow: BookingWindow;
  }> {
    const res = await this.fetchWithAuth('/trains/timetable-status');
    if (!res.ok) throw new Error('Failed to fetch timetable status');
    return res.json();
  }

  async saveRoute(plan: TransitRoutePlan): Promise<SavedRouteResponse> {
    const res = await this.fetchWithAuth('/routes/saved', {
      method: 'POST',
      body: JSON.stringify({ plan }),
    });

    if (!res.ok) throw new Error('Failed to save route');
    return res.json();
  }

  async getSavedRoutes(): Promise<SavedRouteResponse[]> {
    const res = await this.fetchWithAuth('/routes/saved');
    if (!res.ok) throw new Error('Failed to retrieve saved routes');
    return res.json();
  }

  async deleteSavedRoute(routeId: string): Promise<{ message: string }> {
    const res = await this.fetchWithAuth(`/routes/saved/${routeId}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete saved route');
    return res.json();
  }

  async fetchStationAutocompleteCatalog(): Promise<StationAutocompleteCatalogResponse> {
    const res = await this.fetchWithAuth('/stations/autocomplete-catalog');
    if (!res.ok) throw new Error('Failed to fetch station autocomplete catalog');
    return res.json();
  }

  async searchStations(query: string, limit: number = 10): Promise<StationSearchResponse> {
    const params = new URLSearchParams();
    if (query !== undefined) params.append('query', query);
    params.append('limit', String(limit));
    params.append('min_length', '1');
    const res = await this.fetchWithAuth(`/stations/search?${params.toString()}`);
    if (!res.ok) throw new Error('Failed to search stations');
    return res.json();
  }

  async getOperatorsSummary(): Promise<OperatorsSummaryResponse> {
    const res = await this.fetchWithAuth('/trains/operators-summary');
    if (!res.ok) throw new Error('Failed to fetch operators summary');
    return res.json();
  }
}

export const apiClient = new ApiClient();

export async function getOperatorsSummary(): Promise<OperatorsSummaryResponse> {
  return apiClient.getOperatorsSummary();
}

export async function fetchStationAutocompleteCatalog(): Promise<StationAutocompleteCatalogResponse> {
  return apiClient.fetchStationAutocompleteCatalog();
}

export async function searchStations(query: string, limit?: number): Promise<StationSearchResponse> {
  return apiClient.searchStations(query, limit);
}

/**
 * Formats expected delay minutes into human-readable label.
 * e.g. 0 -> "On Time", 5 -> "+5m expected"
 */
export function formatExpectedDelay(minutes?: number): string {
  if (minutes === undefined || minutes === null || minutes <= 0) {
    return 'On Time';
  }
  return `+${minutes}m expected`;
}

/**
 * Formats connection guarantee percentage from missed connection probability.
 * e.g. 0.04 -> "96% connection safety", 0.03 -> "97% connection safety"
 */
export function formatConnectionGuarantee(
  missedProb?: number,
  label: string = 'connection safety'
): string {
  if (missedProb === undefined || missedProb === null) {
    return `100% ${label}`;
  }
  const pct = Math.max(0, Math.min(100, Math.round((1 - missedProb) * 100)));
  return `${pct}% ${label}`;
}

/**
 * Formats expected delay into pill badge text with icon.
 */
export function formatExpectedDelayBadge(minutes?: number): string {
  if (minutes === undefined || minutes === null || minutes <= 0) {
    return '✅ On Time';
  }
  return `⏱️ +${minutes}m expected delay`;
}

/**
 * Formats connection guarantee into shield badge text with icon.
 */
export function formatConnectionGuaranteeBadge(
  missedProb?: number,
  label: string = 'connection guarantee'
): string {
  if (missedProb === undefined || missedProb === null) {
    return `🛡️ 100% ${label}`;
  }
  const pct = Math.max(0, Math.min(100, Math.round((1 - missedProb) * 100)));
  return `🛡️ ${pct}% ${label}`;
}

export async function fetchTrainItinerary(
  trainNumber: string,
  date?: string
): Promise<TrainItineraryResponse> {
  return apiClient.fetchTrainItinerary(trainNumber, date);
}

export async function getNotificationStatus(): Promise<NotificationStatusResponse> {
  return apiClient.getNotificationStatus();
}

export async function sendTestDepartureAlert(
  payload?: TestDepartureAlertRequest
): Promise<TestDepartureAlertResponse> {
  return apiClient.sendTestDepartureAlert(payload);
}

export async function updatePreferences(
  preferences: Partial<UserPreferences>
): Promise<UserPreferences> {
  return apiClient.updatePreferences(preferences);
}

export async function getPreferences(): Promise<UserPreferences> {
  return apiClient.getPreferences();
}
