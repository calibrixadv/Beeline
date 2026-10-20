import {
  UserProfile,
  TokenResponse,
  MFALoginChallengeResponse,
  MFASetupResponse,
  SessionResponse,
  ForgotPasswordResponse,
  SavedRouteResponse,
} from '../types/auth';
import { TransitRoutePlan, TransitRouteQuery } from '../types/routePlan';
import { TransitLineSchedule, ScheduleFilterParams } from '../types/schedule';

export interface RoutePlanResponse {
  plans: TransitRoutePlan[];
  recommendedPlanId: string;
  query: TransitRouteQuery;
  generatedAt: string;
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
      (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_API_URL) ||
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

    const response = await fetch(url, { ...options, headers });

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

  async signup(data: { email: string; password: string; full_name?: string }): Promise<TokenResponse> {
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

  async login(data: { email: string; password: string }): Promise<TokenResponse | MFALoginChallengeResponse> {
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
  // ROUTING & SCHEDULE METHODS
  // ==========================================

  async planRoute(query: TransitRouteQuery): Promise<RoutePlanResponse> {
    const res = await this.fetchWithAuth('/routes/plan', {
      method: 'POST',
      body: JSON.stringify(query),
    });

    if (!res.ok) throw new Error('Failed to compute route plan');
    return res.json();
  }

  async getSchedules(params?: ScheduleFilterParams): Promise<TransitLineSchedule[]> {
    const urlParams = new URLSearchParams();
    if (params?.section) urlParams.append('section', params.section);
    if (params?.selectedCity) urlParams.append('city', params.selectedCity);
    if (params?.searchQuery) urlParams.append('search', params.searchQuery);

    const qs = urlParams.toString();
    const endpoint = `/schedules${qs ? `?${qs}` : ''}`;
    const res = await this.fetchWithAuth(endpoint);

    if (!res.ok) throw new Error('Failed to fetch schedules');
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
}

export const apiClient = new ApiClient();
