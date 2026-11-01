import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { UserProfile, MFALoginChallengeResponse, TokenResponse } from '../types/auth';
import { apiClient, tokenStorage } from '../services/apiClient';

interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isGuest: boolean;
  isLoading: boolean;
  mfaChallenge: MFALoginChallengeResponse | null;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (email: string, password: string, fullName?: string) => Promise<void>;
  continueAsGuest: () => Promise<void>;
  convertGuest: (email: string, password: string, fullName?: string) => Promise<void>;
  logout: () => Promise<void>;
  verifyMFA: (code: string, isBackupCode?: boolean) => Promise<void>;
  cancelMFA: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [mfaChallenge, setMfaChallenge] = useState<MFALoginChallengeResponse | null>(null);

  const refreshUser = async () => {
    try {
      const me = await apiClient.getMe();
      setUser(me);
    } catch {
      setUser(null);
    }
  };

  useEffect(() => {
    const initializeAuth = async () => {
      setIsLoading(true);
      const token = tokenStorage.getAccessToken();
      if (token) {
        await refreshUser();
      }
      setIsLoading(false);
    };

    initializeAuth();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const res = await apiClient.login({ email, password });
      if ('mfa_required' in res && res.mfa_required) {
        setMfaChallenge(res);
        setIsLoading(false);
        return false; // MFA pending
      } else {
        const tokenRes = res as TokenResponse;
        setUser(tokenRes.user);
        setMfaChallenge(null);
        setIsLoading(false);
        return true;
      }
    } catch (err) {
      setIsLoading(false);
      throw err;
    }
  };

  const signup = async (email: string, password: string, fullName?: string) => {
    setIsLoading(true);
    try {
      const res = await apiClient.signup({ email, password, full_name: fullName });
      setUser(res.user);
    } finally {
      setIsLoading(false);
    }
  };

  const continueAsGuest = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.loginAsGuest();
      setUser(res.user);
    } finally {
      setIsLoading(false);
    }
  };

  const convertGuest = async (email: string, password: string, fullName?: string) => {
    setIsLoading(true);
    try {
      const updated = await apiClient.convertGuest({ email, password, full_name: fullName });
      setUser(updated);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await apiClient.logout();
    } finally {
      setUser(null);
      setMfaChallenge(null);
      setIsLoading(false);
    }
  };

  const verifyMFA = async (code: string, isBackupCode: boolean = false) => {
    if (!mfaChallenge) throw new Error('No active MFA challenge');

    setIsLoading(true);
    try {
      const payload: { mfa_session_token: string; totp_code?: string; backup_code?: string } = {
        mfa_session_token: mfaChallenge.mfa_session_token,
      };
      if (isBackupCode) {
        payload.backup_code = code;
      } else {
        payload.totp_code = code;
      }

      const res = await apiClient.verifyMFAChallenge(payload);
      setUser(res.user);
      setMfaChallenge(null);
    } finally {
      setIsLoading(false);
    }
  };

  const cancelMFA = () => {
    setMfaChallenge(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user && !user.is_guest,
        isGuest: !!user && user.is_guest,
        isLoading,
        mfaChallenge,
        login,
        signup,
        continueAsGuest,
        convertGuest,
        logout,
        verifyMFA,
        cancelMFA,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
