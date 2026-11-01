import { apiClient, tokenStorage } from '../src/services/apiClient';

describe('ApiClient and TokenStorage', () => {
  beforeEach(() => {
    tokenStorage.clear();
    jest.restoreAllMocks();
  });

  it('stores and retrieves access and refresh tokens', () => {
    tokenStorage.setTokens('access-123', 'refresh-456');
    expect(tokenStorage.getAccessToken()).toBe('access-123');
    expect(tokenStorage.getRefreshToken()).toBe('refresh-456');

    tokenStorage.clear();
    expect(tokenStorage.getAccessToken()).toBeNull();
    expect(tokenStorage.getRefreshToken()).toBeNull();
  });

  it('performs signup successfully and persists tokens', async () => {
    const mockResponse = {
      access_token: 'new-acc',
      refresh_token: 'new-ref',
      token_type: 'bearer',
      expires_in: 900,
      user: {
        id: 'usr-1',
        email: 'test@beeline.io',
        full_name: 'Test User',
        is_guest: false,
        is_active: true,
        mfa_enabled: false,
        created_at: '2026-10-21T00:00:00Z',
        updated_at: '2026-10-21T00:00:00Z',
      },
    };

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: jest.fn().mockResolvedValue(mockResponse),
    } as any);

    const result = await apiClient.signup({
      email: 'test@beeline.io',
      password: 'Password123!',
      full_name: 'Test User',
    });

    expect(result.access_token).toBe('new-acc');
    expect(tokenStorage.getAccessToken()).toBe('new-acc');
    expect(tokenStorage.getRefreshToken()).toBe('new-ref');
  });

  it('handles MFA challenge response upon login', async () => {
    const mockMFA = {
      mfa_required: true,
      mfa_session_token: 'mfa-temp-token',
      message: 'MFA required',
    };

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue(mockMFA),
    } as any);

    const res = await apiClient.login({
      email: 'mfa@beeline.io',
      password: 'Password123!',
    });

    expect('mfa_required' in res && res.mfa_required).toBe(true);
    expect((res as any).mfa_session_token).toBe('mfa-temp-token');
  });

  it('handles guest login and sets tokens', async () => {
    const mockGuest = {
      access_token: 'guest-acc',
      refresh_token: 'guest-ref',
      token_type: 'bearer',
      expires_in: 900,
      user: {
        id: 'guest-1',
        email: null,
        full_name: 'Guest Traveler',
        is_guest: true,
        is_active: true,
        mfa_enabled: false,
        created_at: '2026-10-21T00:00:00Z',
        updated_at: '2026-10-21T00:00:00Z',
      },
    };

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: jest.fn().mockResolvedValue(mockGuest),
    } as any);

    const res = await apiClient.loginAsGuest();
    expect(res.user.is_guest).toBe(true);
    expect(tokenStorage.getAccessToken()).toBe('guest-acc');
  });

  it('retries request on 401 when refresh token is available', async () => {
    tokenStorage.setTokens('expired-acc', 'valid-ref');

    const refreshResponse = {
      access_token: 'fresh-acc',
      refresh_token: 'fresh-ref',
      token_type: 'bearer',
      expires_in: 900,
      user: { id: 'usr-1' },
    };

    const meResponse = {
      id: 'usr-1',
      email: 'user@beeline.io',
      is_guest: false,
    };

    let callCount = 0;
    global.fetch = jest.fn().mockImplementation((url: string) => {
      callCount++;
      if (url.includes('/users/me') && callCount === 1) {
        return Promise.resolve({ ok: false, status: 401 });
      }
      if (url.includes('/auth/refresh')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(refreshResponse),
        });
      }
      if (url.includes('/users/me') && callCount === 3) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(meResponse),
        });
      }
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({}) });
    });

    const profile = await apiClient.getMe();
    expect(profile.id).toBe('usr-1');
    expect(tokenStorage.getAccessToken()).toBe('fresh-acc');
  });
});
