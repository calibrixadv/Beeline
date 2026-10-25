import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { AuthProvider, useAuth } from '../src/context/AuthContext';
import { apiClient } from '../src/services/apiClient';

jest.mock('../src/services/apiClient', () => {
  const actual = jest.requireActual('../src/services/apiClient');
  return {
    ...actual,
    apiClient: {
      getMe: jest.fn(),
      login: jest.fn(),
      signup: jest.fn(),
      loginAsGuest: jest.fn(),
      convertGuest: jest.fn(),
      logout: jest.fn(),
      verifyMFAChallenge: jest.fn(),
    },
  };
});

const AuthConsumer: React.FC = () => {
  const {
    user,
    isAuthenticated,
    isGuest,
    mfaChallenge,
    login,
    continueAsGuest,
    logout,
  } = useAuth();

  return (
    <>
      <Text testID="user-email">{user?.email || 'no-email'}</Text>
      <Text testID="is-auth">{String(isAuthenticated)}</Text>
      <Text testID="is-guest">{String(isGuest)}</Text>
      <Text testID="mfa-pending">{mfaChallenge ? 'true' : 'false'}</Text>

      <TouchableOpacity
        testID="login-btn"
        onPress={() => login('user@beeline.io', 'Password123!')}
      >
        <Text>Login</Text>
      </TouchableOpacity>

      <TouchableOpacity
        testID="guest-btn"
        onPress={() => continueAsGuest()}
      >
        <Text>Guest</Text>
      </TouchableOpacity>

      <TouchableOpacity
        testID="logout-btn"
        onPress={() => logout()}
      >
        <Text>Logout</Text>
      </TouchableOpacity>
    </>
  );
};

describe('AuthContext and AuthProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders initial unauthenticated state', async () => {
    (apiClient.getMe as jest.Mock).mockRejectedValue(new Error('No session'));

    const { getByTestId } = render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(getByTestId('is-auth').props.children).toBe('false');
      expect(getByTestId('is-guest').props.children).toBe('false');
    });
  });

  it('allows logging in as guest', async () => {
    const mockGuestUser = {
      id: 'guest-1',
      email: null,
      full_name: 'Guest Traveler',
      is_guest: true,
      is_active: true,
      mfa_enabled: false,
      created_at: '2026-10-21T00:00:00Z',
      updated_at: '2026-10-21T00:00:00Z',
    };

    (apiClient.loginAsGuest as jest.Mock).mockResolvedValue({
      access_token: 'acc',
      refresh_token: 'ref',
      user: mockGuestUser,
    });

    const { getByTestId } = render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>
    );

    fireEvent.press(getByTestId('guest-btn'));

    await waitFor(() => {
      expect(getByTestId('is-guest').props.children).toBe('true');
      expect(getByTestId('is-auth').props.children).toBe('false');
    });
  });

  it('allows logging in with standard email credentials', async () => {
    const mockUser = {
      id: 'usr-1',
      email: 'traveler@beeline.io',
      full_name: 'Traveler',
      is_guest: false,
      is_active: true,
      mfa_enabled: false,
      created_at: '2026-10-21T00:00:00Z',
      updated_at: '2026-10-21T00:00:00Z',
    };

    (apiClient.login as jest.Mock).mockResolvedValue({
      access_token: 'acc',
      refresh_token: 'ref',
      user: mockUser,
    });

    const { getByTestId } = render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>
    );

    fireEvent.press(getByTestId('login-btn'));

    await waitFor(() => {
      expect(getByTestId('user-email').props.children).toBe('traveler@beeline.io');
      expect(getByTestId('is-auth').props.children).toBe('true');
      expect(getByTestId('is-guest').props.children).toBe('false');
    });
  });

  it('handles MFA challenge when mfa_required is returned on login', async () => {
    (apiClient.login as jest.Mock).mockResolvedValue({
      mfa_required: true,
      mfa_session_token: 'challenge-session-token',
      message: 'MFA required',
    });

    const { getByTestId } = render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>
    );

    fireEvent.press(getByTestId('login-btn'));

    await waitFor(() => {
      expect(getByTestId('mfa-pending').props.children).toBe('true');
      expect(getByTestId('is-auth').props.children).toBe('false');
    });
  });
});
