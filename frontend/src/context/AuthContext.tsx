'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
  UserProfile,
  MFALoginChallengeResponse,
  TokenResponse,
  SignUpResponse,
  VerifyEmailRequest,
  ResendVerificationResponse,
} from '../types/auth';
import { apiClient, tokenStorage } from '../services/apiClient';

interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isGuest: boolean;
  isLoading: boolean;
  mfaChallenge: MFALoginChallengeResponse | null;
  pendingRecoveryCodes?: string[] | null;
  clearPendingRecoveryCodes?: () => void;
  login: (identifier: string, password: string) => Promise<boolean>;
  signup: (email: string, password: string, username?: string, fullName?: string) => Promise<SignUpResponse>;
  verifyEmail: (data: VerifyEmailRequest) => Promise<TokenResponse>;
  resendVerification: (email: string) => Promise<ResendVerificationResponse>;
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
  const [pendingRecoveryCodes, setPendingRecoveryCodes] = useState<string[] | null>(null);

  const clearPendingRecoveryCodes = () => {
    setPendingRecoveryCodes(null);
  };

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

  const login = async (identifier: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    setPendingRecoveryCodes(null);
    try {
      const isEmail = identifier.includes('@');
      const res = await apiClient.login({
        email: isEmail ? identifier : undefined,
        username: isEmail ? undefined : identifier,
        password,
      });
      if ('mfa_required' in res && res.mfa_required) {
        setMfaChallenge(res);
        setIsLoading(false);
        return false; // MFA pending
      } else {
        const tokenRes = res as TokenResponse;
        setUser(tokenRes.user);
        setIsLoading(false);
        return true;
      }
    } catch (err) {
      setIsLoading(false);
      throw err;
    }
  };

  const signup = async (
    email: string,
    password: string,
    usernameOrFullName?: string,
    fullName?: string
  ): Promise<SignUpResponse> => {
    setIsLoading(true);
    try {
      const username = fullName !== undefined ? usernameOrFullName : undefined;
      const name = fullName !== undefined ? fullName : usernameOrFullName;
      const res = await apiClient.signup({
        email,
        password,
        username: username || (usernameOrFullName && !fullName && !usernameOrFullName.includes(' ') ? usernameOrFullName : undefined),
        full_name: name || usernameOrFullName,
      });
      // Email verification required before session creation
      return res;
    } finally {
      setIsLoading(false);
    }
  };

  const verifyEmail = async (data: VerifyEmailRequest): Promise<TokenResponse> => {
    setIsLoading(true);
    try {
      const res = await apiClient.verifyEmail(data);
      if (res.recovery_codes && res.recovery_codes.length > 0) {
        setPendingRecoveryCodes(res.recovery_codes);
      }
      setUser(res.user);
      return res;
    } finally {
      setIsLoading(false);
    }
  };

  const resendVerification = async (email: string): Promise<ResendVerificationResponse> => {
    return await apiClient.resendVerification(email);
  };

  const continueAsGuest = async (): Promise<void> => {
    setIsLoading(true);
    try {
      const res = await apiClient.loginAsGuest();
      setUser(res.user);
    } finally {
      setIsLoading(false);
    }
  };

  const convertGuest = async (email: string, password: string, fullName?: string): Promise<void> => {
    setIsLoading(true);
    try {
      const updatedUser = await apiClient.convertGuest({ email, password, full_name: fullName });
      setUser(updatedUser);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    setIsLoading(true);
    try {
      await apiClient.logout();
    } catch {
      tokenStorage.clear();
    } finally {
      setUser(null);
      setMfaChallenge(null);
      setPendingRecoveryCodes(null);
      setIsLoading(false);
    }
  };

  const verifyMFA = async (code: string, isBackupCode: boolean = false): Promise<void> => {
    if (!mfaChallenge) throw new Error('No active MFA challenge');
    setIsLoading(true);
    try {
      const res = await apiClient.verifyMFAChallenge({
        mfa_session_token: mfaChallenge.mfa_session_token,
        ...(isBackupCode ? { backup_code: code } : { totp_code: code }),
      });
      setUser(res.user);
      setMfaChallenge(null);
    } finally {
      setIsLoading(false);
    }
  };

  const cancelMFA = () => {
    setMfaChallenge(null);
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user && !user.is_guest,
    isGuest: !!user?.is_guest,
    isLoading,
    mfaChallenge,
    pendingRecoveryCodes,
    clearPendingRecoveryCodes,
    login,
    signup,
    verifyEmail,
    resendVerification,
    continueAsGuest,
    convertGuest,
    logout,
    verifyMFA,
    cancelMFA,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
