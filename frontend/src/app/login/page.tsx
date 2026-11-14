'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { 
  User, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  ShieldAlert, 
  ShieldCheck, 
  CheckCircle2, 
  AlertTriangle, 
  Sparkles, 
  ArrowRight,
  RefreshCw,
  KeyRound
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { checkPasswordBreach, checkEmailBreach, PasswordBreachStatus, EmailBreachStatus } from '../../services/breachCheckerService';
import BaseCard from '../../components/BaseCard';
import BaseButton from '../../components/BaseButton';
import BaseInput from '../../components/BaseInput';
import MascotBee from '../../components/MascotBee';

type AuthTab = 'login' | 'signup';

function AuthContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, login, signup, continueAsGuest, mfaChallenge, verifyMFA, cancelMFA } = useAuth();

  const initialTab = searchParams.get('tab') === 'signup' ? 'signup' : 'login';
  const [activeTab, setActiveTab] = useState<AuthTab>(initialTab);
  const prevTabParamRef = React.useRef(searchParams.get('tab'));

  // Sync tab with URL query param if it changes externally
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && tabParam !== prevTabParamRef.current) {
      prevTabParamRef.current = tabParam;
      if (tabParam === 'signup' || tabParam === 'login') {
        setActiveTab(tabParam);
      }
    }
  }, [searchParams]);

  // If already logged in and not a guest, redirect to home or intended page
  useEffect(() => {
    if (user && !user.is_guest) {
      const redirect = searchParams.get('redirect') || '/';
      router.push(redirect);
    }
  }, [user, router, searchParams]);

  // ==========================================
  // LOGIN FORM STATE
  // ==========================================
  const [loginIdentifier, setLoginIdentifier] = useState<string>('');
  const [loginPassword, setLoginPassword] = useState<string>('');
  const [showLoginPassword, setShowLoginPassword] = useState<boolean>(false);
  const [loginLoading, setLoginLoading] = useState<boolean>(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // MFA Challenge State
  const [mfaCode, setMfaCode] = useState<string>('');
  const [isBackupCode, setIsBackupCode] = useState<boolean>(false);
  const [mfaLoading, setMfaLoading] = useState<boolean>(false);
  const [mfaError, setMfaError] = useState<string | null>(null);

  // ==========================================
  // SIGNUP FORM STATE
  // ==========================================
  const [signupEmail, setSignupEmail] = useState<string>('');
  const [signupVerificationEmail, setSignupVerificationEmail] = useState<string>('');
  const [signupUsername, setSignupUsername] = useState<string>('');
  const [signupPassword, setSignupPassword] = useState<string>('');
  const [signupRetypePassword, setSignupRetypePassword] = useState<string>('');
  const [showSignupPassword, setShowSignupPassword] = useState<boolean>(false);
  const [showRetypePassword, setShowRetypePassword] = useState<boolean>(false);
  const [signupLoading, setSignupLoading] = useState<boolean>(false);
  const [signupError, setSignupError] = useState<string | null>(null);
  const [signupSuccess, setSignupSuccess] = useState<string | null>(null);

  // Breach checking state
  const [passwordBreach, setPasswordBreach] = useState<PasswordBreachStatus | null>(null);
  const [isCheckingPasswordBreach, setIsCheckingPasswordBreach] = useState<boolean>(false);
  const [emailBreach, setEmailBreach] = useState<EmailBreachStatus | null>(null);
  const [isCheckingEmailBreach, setIsCheckingEmailBreach] = useState<boolean>(false);

  // Auto breach check on password with debounce
  useEffect(() => {
    if (!signupPassword || signupPassword.length < 4) {
      setPasswordBreach(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsCheckingPasswordBreach(true);
      try {
        const result = await checkPasswordBreach(signupPassword);
        setPasswordBreach(result);
      } catch {
        // Silently preserve previous state
      } finally {
        setIsCheckingPasswordBreach(false);
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [signupPassword]);

  // Auto check email breaches with debounce
  useEffect(() => {
    if (!signupEmail || !signupEmail.includes('@') || signupEmail.length < 6) {
      setEmailBreach(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsCheckingEmailBreach(true);
      try {
        const result = await checkEmailBreach(signupEmail);
        setEmailBreach(result);
      } catch {
        // Silently preserve previous state
      } finally {
        setIsCheckingEmailBreach(false);
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [signupEmail]);

  // Password strength calculation
  const getPasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, label: '', color: 'bg-stone-200' };
    let score = 0;
    if (pass.length >= 8) score += 1;
    if (pass.length >= 12) score += 1;
    if (/[A-Z]/.test(pass) && /[a-z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;

    if (score <= 2) return { score: 1, label: 'Weak', color: 'bg-red-500' };
    if (score <= 4) return { score: 2, label: 'Moderate', color: 'bg-amber-500' };
    return { score: 3, label: 'Strong', color: 'bg-emerald-500' };
  };

  const strength = getPasswordStrength(signupPassword);

  // Validation Flags
  const isEmailMatching = 
    signupEmail.length > 0 && 
    signupVerificationEmail.length > 0 && 
    signupEmail.trim().toLowerCase() === signupVerificationEmail.trim().toLowerCase();

  const isPasswordMatching = 
    signupPassword.length > 0 && 
    signupRetypePassword.length > 0 && 
    signupPassword === signupRetypePassword;

  // Handle Login Submission
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    const identifier = loginIdentifier.trim();
    if (!identifier) {
      setLoginError('Please enter your username or email address.');
      return;
    }
    if (!loginPassword) {
      setLoginError('Please enter your password.');
      return;
    }

    setLoginLoading(true);
    try {
      const success = await login(identifier, loginPassword);
      if (success) {
        const redirect = searchParams.get('redirect') || '/';
        router.push(redirect);
      }
    } catch (err: any) {
      setLoginError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoginLoading(false);
    }
  };

  // Handle MFA Challenge Submission
  const handleMfaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMfaError(null);

    if (!mfaCode.trim()) {
      setMfaError('Please enter your verification code.');
      return;
    }

    setMfaLoading(true);
    try {
      await verifyMFA(mfaCode.trim(), isBackupCode);
      const redirect = searchParams.get('redirect') || '/';
      router.push(redirect);
    } catch (err: any) {
      setMfaError(err.message || 'Invalid verification code. Please try again.');
    } finally {
      setMfaLoading(false);
    }
  };

  // Handle Sign Up Submission
  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignupError(null);
    setSignupSuccess(null);

    const email = signupEmail.trim();
    const verificationEmail = signupVerificationEmail.trim();
    const username = signupUsername.trim();

    if (!email) {
      setSignupError('Email address is required.');
      return;
    }
    if (!verificationEmail) {
      setSignupError('Please confirm your verification email address.');
      return;
    }
    if (email.toLowerCase() !== verificationEmail.toLowerCase()) {
      setSignupError('Verification email address does not match your primary email.');
      return;
    }
    if (!username || username.length < 3) {
      setSignupError('Username must be at least 3 characters long.');
      return;
    }
    if (!signupPassword || signupPassword.length < 8) {
      setSignupError('Password must be at least 8 characters long.');
      return;
    }
    if (signupPassword !== signupRetypePassword) {
      setSignupError('Passwords do not match. Please retype your password carefully.');
      return;
    }

    // Critical block for compromised password
    if (passwordBreach?.isCompromised) {
      setSignupError(
        '⚠️ This password was found in known data breaches. For your security, you must choose an uncompromised password before creating your account.'
      );
      return;
    }

    setSignupLoading(true);
    try {
      await signup(email, signupPassword, username, username);
      setSignupSuccess('Account created successfully! Welcome to Beeline.');
      setTimeout(() => {
        const redirect = searchParams.get('redirect') || '/';
        router.push(redirect);
      }, 1000);
    } catch (err: any) {
      setSignupError(err.message || 'Registration failed. Please check your details.');
    } finally {
      setSignupLoading(false);
    }
  };

  // Handle Manual Breach Check Trigger
  const handleManualBreachScan = async () => {
    if (!signupPassword) return;
    setIsCheckingPasswordBreach(true);
    try {
      const result = await checkPasswordBreach(signupPassword);
      setPasswordBreach(result);
    } finally {
      setIsCheckingPasswordBreach(false);
    }
  };

  return (
    <div className="min-h-[calc(100dvh-4rem)] flex flex-col justify-center items-center py-8 px-4 sm:px-6 lg:px-8">
      {/* Background Ambience */}
      <div className="w-full max-w-md mx-auto">
        {/* Header Branding & Mascot */}
        <div className="flex flex-col items-center text-center mb-6">
          <Link href="/" className="inline-flex items-center gap-2 mb-2 group">
            <MascotBee 
              gear={passwordBreach?.isCompromised ? 'safe' : 'default'} 
              size="lg" 
              animated={true} 
            />
          </Link>
          <h1 className="text-3xl font-black text-stone-900 tracking-tight">
            Beeline Traveler Portal
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-1 max-w-xs">
            Synchronized Romanian rail, urban transit schedules, and breach-protected journeys.
          </p>
        </div>

        {/* Tab Selection */}
        {!mfaChallenge && (
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-stone-200/80 rounded-2xl mb-4 text-xs font-bold shadow-inner">
            <button
              type="button"
              onClick={() => {
                setActiveTab('login');
                setLoginError(null);
              }}
              className={`py-2.5 rounded-xl transition-all ${
                activeTab === 'login'
                  ? 'bg-white text-stone-900 shadow-sm'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('signup');
                setSignupError(null);
              }}
              className={`py-2.5 rounded-xl transition-all ${
                activeTab === 'signup'
                  ? 'bg-white text-stone-900 shadow-sm'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Create Account
            </button>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 1: SIGN IN / LOGIN FORM                              */}
        {/* ========================================================= */}
        {activeTab === 'login' && !mfaChallenge && (
          <BaseCard variant="elevated" className="p-6 border border-amber-200/90 bg-white shadow-xl">
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              {loginError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-700 animate-fade-in">
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <span>{loginError}</span>
                </div>
              )}

              {/* Username / Email Parameter */}
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                  Username or Email Address
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={loginIdentifier}
                    onChange={(e) => setLoginIdentifier(e.target.value)}
                    placeholder="e.g. alexandra or traveler@beeline.io"
                    autoComplete="username"
                    required
                    className="w-full pl-9 pr-3 py-2.5 text-sm bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none transition-all"
                  />
                  <User className="w-4 h-4 text-stone-400 absolute left-3 top-3 pointer-events-none" />
                </div>
              </div>

              {/* Password Parameter */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-stone-700 uppercase tracking-wider">
                    Password
                  </label>
                  <Link
                    href="/login?forgot=true"
                    onClick={(e) => {
                      e.preventDefault();
                      setLoginError('Password reset link has been dispatched to your email.');
                    }}
                    className="text-[11px] font-semibold text-amber-700 hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <input
                    type={showLoginPassword ? 'text' : 'password'}
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    required
                    className="w-full pl-9 pr-10 py-2.5 text-sm bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none transition-all"
                  />
                  <Lock className="w-4 h-4 text-stone-400 absolute left-3 top-3 pointer-events-none" />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    className="absolute right-3 top-2.5 text-stone-400 hover:text-stone-700"
                    aria-label={showLoginPassword ? 'Hide password' : 'Show password'}
                  >
                    {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <BaseButton
                type="submit"
                variant="primary"
                size="md"
                disabled={loginLoading}
                className="w-full justify-center text-stone-950 font-bold bg-amber-500 hover:bg-amber-400 shadow-md py-2.5 text-sm mt-2"
                rightIcon={!loginLoading && <ArrowRight className="w-4 h-4" />}
              >
                {loginLoading ? 'Authenticating...' : 'Sign In to Beeline'}
              </BaseButton>

              {/* Divider & Guest Option */}
              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-stone-200" />
                <span className="flex-shrink mx-3 text-[11px] font-semibold text-stone-400 uppercase">
                  or
                </span>
                <div className="flex-grow border-t border-stone-200" />
              </div>

              <BaseButton
                type="button"
                variant="outline"
                size="md"
                onClick={async () => {
                  setLoginLoading(true);
                  try {
                    await continueAsGuest();
                    router.push('/');
                  } finally {
                    setLoginLoading(false);
                  }
                }}
                className="w-full justify-center text-xs font-semibold py-2"
                leftIcon={<Sparkles className="w-3.5 h-3.5 text-amber-500" />}
              >
                Continue as Guest Traveler
              </BaseButton>
            </form>
          </BaseCard>
        )}

        {/* ========================================================= */}
        {/* MFA CHALLENGE FLOW (IF USER HAS 2FA ENABLED)              */}
        {/* ========================================================= */}
        {mfaChallenge && (
          <BaseCard variant="elevated" className="p-6 border border-blue-200 bg-white shadow-xl animate-fade-in">
            <div className="text-center mb-4">
              <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center mx-auto mb-2">
                <KeyRound className="w-5 h-5" />
              </div>
              <h2 className="text-base font-bold text-stone-900">
                Two-Factor Authentication
              </h2>
              <p className="text-xs text-stone-500 mt-1">
                {isBackupCode
                  ? 'Enter an emergency 64-character backup recovery code.'
                  : 'Enter the 6-digit TOTP code generated by your authenticator app.'}
              </p>
            </div>

            <form onSubmit={handleMfaSubmit} className="space-y-4">
              {mfaError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <span>{mfaError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                  {isBackupCode ? 'Recovery Backup Code' : '6-Digit TOTP Code'}
                </label>
                <input
                  type="text"
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value)}
                  placeholder={isBackupCode ? 'Enter backup code' : 'e.g. 123456'}
                  autoComplete="one-time-code"
                  maxLength={isBackupCode ? 64 : 6}
                  required
                  className="w-full px-3 py-2.5 text-center text-lg font-mono tracking-widest bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:border-blue-500 outline-none"
                />
              </div>

              <div className="flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => setIsBackupCode(!isBackupCode)}
                  className="text-blue-600 hover:underline font-medium"
                >
                  {isBackupCode ? 'Use Authenticator Code instead' : 'Use a backup recovery code'}
                </button>
                <button
                  type="button"
                  onClick={cancelMFA}
                  className="text-stone-500 hover:underline"
                >
                  Cancel
                </button>
              </div>

              <BaseButton
                type="submit"
                variant="primary"
                size="md"
                disabled={mfaLoading}
                className="w-full justify-center bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 text-sm"
              >
                {mfaLoading ? 'Verifying Code...' : 'Verify & Continue'}
              </BaseButton>
            </form>
          </BaseCard>
        )}

        {/* ========================================================= */}
        {/* TAB 2: SIGN UP WITH BREACH INSPECTOR                     */}
        {/* ========================================================= */}
        {activeTab === 'signup' && (
          <BaseCard variant="elevated" className="p-6 border border-amber-200/90 bg-white shadow-xl">
            <form onSubmit={handleSignupSubmit} className="space-y-3.5">
              {signupError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2 text-xs text-red-700 animate-fade-in">
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{signupError}</span>
                </div>
              )}

              {signupSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs text-emerald-800 animate-fade-in font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{signupSuccess}</span>
                </div>
              )}

              {/* Email Address */}
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    placeholder="traveler@example.com"
                    autoComplete="email"
                    required
                    className="w-full pl-9 pr-8 py-2.5 text-sm bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none transition-all"
                  />
                  <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-3 pointer-events-none" />
                  {isCheckingEmailBreach && (
                    <RefreshCw className="w-3.5 h-3.5 text-amber-500 absolute right-3 top-3.5 animate-spin" />
                  )}
                </div>
              </div>

              {/* Verification Email (Confirm Email Address) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-stone-700 uppercase tracking-wider">
                    Verification Email (Confirm Email)
                  </label>
                  {isEmailMatching && (
                    <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Emails Match
                    </span>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="email"
                    value={signupVerificationEmail}
                    onChange={(e) => setSignupVerificationEmail(e.target.value)}
                    placeholder="Retype your email address"
                    autoComplete="email"
                    required
                    className={`w-full pl-9 pr-3 py-2.5 text-sm bg-stone-50 border rounded-xl outline-none transition-all ${
                      signupVerificationEmail.length > 0 && !isEmailMatching
                        ? 'border-red-300 bg-red-50/40 focus:border-red-500'
                        : 'border-stone-200 focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-200'
                    }`}
                  />
                  <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-3 pointer-events-none" />
                </div>
              </div>

              {/* Email Historical Breach Warning (if flagged) */}
              {emailBreach?.isCompromised && (
                <div className="p-2.5 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900 flex items-start gap-2 animate-fade-in">
                  <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="text-[11px] leading-snug">
                    <span className="font-bold">Historical Email Breach Notice:</span> This email was found in {emailBreach.breachCount} public security incidents ({emailBreach.breaches.join(', ')}). Be sure to choose an entirely new, unshared password.
                  </div>
                </div>
              )}

              {/* Username Parameter */}
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                  Username
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={signupUsername}
                    onChange={(e) => setSignupUsername(e.target.value)}
                    placeholder="e.g. alexandra22"
                    autoComplete="username"
                    required
                    minLength={3}
                    maxLength={50}
                    className="w-full pl-9 pr-3 py-2.5 text-sm bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none transition-all"
                  />
                  <User className="w-4 h-4 text-stone-400 absolute left-3 top-3 pointer-events-none" />
                </div>
              </div>

              {/* Password Parameter */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-stone-700 uppercase tracking-wider">
                    Password
                  </label>
                  {signupPassword.length > 0 && (
                    <span className="text-[11px] font-semibold text-stone-500">
                      Strength: <span className="font-bold">{strength.label}</span>
                    </span>
                  )}
                </div>
                <div className="relative">
                  <input
                    type={showSignupPassword ? 'text' : 'password'}
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    placeholder="Create a strong password (min 8 chars)"
                    autoComplete="new-password"
                    required
                    minLength={8}
                    className="w-full pl-9 pr-10 py-2.5 text-sm bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none transition-all"
                  />
                  <Lock className="w-4 h-4 text-stone-400 absolute left-3 top-3 pointer-events-none" />
                  <button
                    type="button"
                    onClick={() => setShowSignupPassword(!showSignupPassword)}
                    className="absolute right-3 top-2.5 text-stone-400 hover:text-stone-700"
                    aria-label={showSignupPassword ? 'Hide password' : 'Show password'}
                  >
                    {showSignupPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Password Strength Meter */}
                {signupPassword.length > 0 && (
                  <div className="grid grid-cols-3 gap-1 mt-1.5">
                    <div className={`h-1 rounded-full ${strength.score >= 1 ? strength.color : 'bg-stone-200'}`} />
                    <div className={`h-1 rounded-full ${strength.score >= 2 ? strength.color : 'bg-stone-200'}`} />
                    <div className={`h-1 rounded-full ${strength.score >= 3 ? strength.color : 'bg-stone-200'}`} />
                  </div>
                )}
              </div>

              {/* ========================================================= */}
              {/* BREACH SECURITY INSPECTOR (COMPROMISED PASSWORD ALERT)   */}
              {/* ========================================================= */}
              {passwordBreach && (
                <div
                  className={`p-3 rounded-xl border text-xs animate-fade-in ${
                    passwordBreach.isCompromised
                      ? 'bg-red-50 border-red-300 text-red-900'
                      : 'bg-emerald-50 border-emerald-300 text-emerald-900'
                  }`}
                  data-testid="breach-inspector-alert"
                >
                  <div className="flex items-start gap-2">
                    {passwordBreach.isCompromised ? (
                      <ShieldAlert className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    ) : (
                      <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    )}
                    <div className="space-y-1">
                      <div className="font-bold flex items-center gap-1.5">
                        {passwordBreach.isCompromised ? (
                          <span className="text-red-700">🚨 Password Compromised in Data Breaches!</span>
                        ) : (
                          <span className="text-emerald-700">🛡️ Safe &amp; Unbreached Password</span>
                        )}
                        {isCheckingPasswordBreach && (
                          <RefreshCw className="w-3 h-3 text-stone-500 animate-spin" />
                        )}
                      </div>
                      <p className="text-[11px] leading-relaxed text-stone-700">
                        {passwordBreach.isCompromised ? (
                          <>
                            This password has appeared in{' '}
                            <span className="font-bold text-red-700">
                              {passwordBreach.breachCount.toLocaleString()}
                            </span>{' '}
                            known credential leaks. Attackers use these breach lists in automated dictionary attacks.{' '}
                            <span className="font-semibold text-red-800">
                              Please change this password immediately to something unique!
                            </span>
                          </>
                        ) : (
                          <>
                            No matches found in public breach records. Your password is safe and secure.
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Retype Password Parameter */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-stone-700 uppercase tracking-wider">
                    Retype Password (Confirm Password)
                  </label>
                  {isPasswordMatching && (
                    <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Passwords Match
                    </span>
                  )}
                </div>
                <div className="relative">
                  <input
                    type={showRetypePassword ? 'text' : 'password'}
                    value={signupRetypePassword}
                    onChange={(e) => setSignupRetypePassword(e.target.value)}
                    placeholder="Confirm your password"
                    autoComplete="new-password"
                    required
                    minLength={8}
                    className={`w-full pl-9 pr-10 py-2.5 text-sm bg-stone-50 border rounded-xl outline-none transition-all ${
                      signupRetypePassword.length > 0 && !isPasswordMatching
                        ? 'border-red-300 bg-red-50/40 focus:border-red-500'
                        : 'border-stone-200 focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-200'
                    }`}
                  />
                  <Lock className="w-4 h-4 text-stone-400 absolute left-3 top-3 pointer-events-none" />
                  <button
                    type="button"
                    onClick={() => setShowRetypePassword(!showRetypePassword)}
                    className="absolute right-3 top-2.5 text-stone-400 hover:text-stone-700"
                    aria-label={showRetypePassword ? 'Hide password' : 'Show password'}
                  >
                    {showRetypePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Submit Sign Up Button */}
              <BaseButton
                type="submit"
                variant="primary"
                size="md"
                disabled={signupLoading || passwordBreach?.isCompromised}
                className={`w-full justify-center text-stone-950 font-bold py-2.5 text-sm mt-3 ${
                  passwordBreach?.isCompromised
                    ? 'bg-stone-300 cursor-not-allowed text-stone-500'
                    : 'bg-amber-500 hover:bg-amber-400 shadow-md'
                }`}
                rightIcon={!signupLoading && <ArrowRight className="w-4 h-4" />}
              >
                {signupLoading
                  ? 'Creating Account...'
                  : passwordBreach?.isCompromised
                  ? 'Change Compromised Password to Continue'
                  : 'Create Beeline Account'}
              </BaseButton>
            </form>
          </BaseCard>
        )}

        {/* Footer Navigation */}
        <div className="mt-4 text-center">
          <Link
            href="/"
            className="text-xs text-stone-500 hover:text-stone-800 transition-colors font-medium"
          >
            ← Return to Beeline Homepage
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-[calc(100dvh-4rem)] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <AuthContent />
    </Suspense>
  );
}
