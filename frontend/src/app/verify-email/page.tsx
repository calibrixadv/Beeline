'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { 
  CheckCircle2, 
  AlertTriangle, 
  ShieldCheck, 
  Copy, 
  Check, 
  ArrowRight, 
  RefreshCw,
  Mail,
  Home
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import BaseCard from '../../components/BaseCard';
import BaseButton from '../../components/BaseButton';
import MascotBee from '../../components/MascotBee';
import AuthGhostSkeleton from '../../components/AuthGhostSkeleton';

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const redirectPath = searchParams.get('redirect') || '/';

  const { verifyEmail, clearPendingRecoveryCodes } = useAuth();

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [verified, setVerified] = useState<boolean>(false);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [copiedCodeIndex, setCopiedCodeIndex] = useState<number | null>(null);
  const [copiedAll, setCopiedAll] = useState<boolean>(false);

  // Manual fallback input state if no token in query param
  const [manualEmail, setManualEmail] = useState<string>('');
  const [manualCode, setManualCode] = useState<string>('');
  const [manualSubmitting, setManualSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    let isMounted = true;
    const executeTokenVerification = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await verifyEmail({ token });
        if (isMounted) {
          setVerified(true);
          if (res.recovery_codes && res.recovery_codes.length > 0) {
            setRecoveryCodes(res.recovery_codes);
          }
        }
      } catch (err: any) {
        if (isMounted) {
          setError(
            err.message || 'This verification link is invalid, expired, or has already been used.'
          );
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    executeTokenVerification();

    return () => {
      isMounted = false;
    };
  }, [token, verifyEmail]);

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const email = manualEmail.trim();
    const code = manualCode.trim();

    if (!email || !code || code.length !== 6) {
      setError('Please provide a valid email and 6-digit verification code.');
      return;
    }

    setManualSubmitting(true);
    try {
      const res = await verifyEmail({ email, code });
      setVerified(true);
      if (res.recovery_codes && res.recovery_codes.length > 0) {
        setRecoveryCodes(res.recovery_codes);
      }
    } catch (err: any) {
      setError(err.message || 'Verification failed. Please check your code or request a new one.');
    } finally {
      setManualSubmitting(false);
    }
  };

  const handleCopyCode = async (code: string, idx: number) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCodeIndex(idx);
      setTimeout(() => setCopiedCodeIndex(null), 2000);
    } catch {}
  };

  const handleCopyAll = async () => {
    try {
      await navigator.clipboard.writeText(recoveryCodes.join('\n'));
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2000);
    } catch {}
  };

  const handleContinue = () => {
    clearPendingRecoveryCodes?.();
    router.push(redirectPath);
  };

  return (
    <div className="min-h-[calc(100dvh-4rem)] flex flex-col justify-center items-center py-8 px-4 sm:px-6 lg:px-8 animate-fade-in">
      <div className="w-full max-w-md mx-auto">
        {/* Header Branding & Mascot */}
        <div className="flex flex-col items-center text-center mb-6">
          <Link href="/" className="inline-flex items-center gap-2 mb-2 group">
            <MascotBee 
              gear={verified ? 'safe' : 'default'} 
              size="lg" 
              animated={true} 
            />
          </Link>
          <h1 className="text-3xl font-black text-stone-900 tracking-tight">
            Email Verification
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-1 max-w-xs">
            Confirming your traveler identity and activating account defense.
          </p>
        </div>

        {/* State 1: Automatic Magic Link Token Verifying */}
        {loading && (
          <BaseCard variant="elevated" className="p-8 border border-amber-200 bg-white shadow-xl text-center">
            <RefreshCw className="w-8 h-8 text-amber-500 animate-spin mx-auto mb-4" />
            <h2 className="text-base font-bold text-stone-900 mb-1">
              Verifying Your Email...
            </h2>
            <p className="text-xs text-stone-500">
              Validating your secure cryptographic verification token.
            </p>
          </BaseCard>
        )}

        {/* State 2: Verification Successful + Recovery Codes Display */}
        {!loading && verified && (
          <BaseCard variant="elevated" className="p-6 border border-emerald-300 bg-white shadow-xl animate-fade-in">
            <div className="text-center mb-5">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-2 shadow-sm">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-black text-stone-900 tracking-tight">
                Account Verified!
              </h2>
              <p className="text-xs text-stone-600 mt-1 max-w-sm mx-auto">
                Your email ownership has been confirmed. Below are your <strong>3 emergency recovery codes</strong>. Save them now — they are shown <strong>only once</strong> and never emailed.
              </p>
            </div>

            {recoveryCodes.length > 0 && (
              <>
                <div className="space-y-2.5 my-4">
                  {recoveryCodes.map((code, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 bg-amber-50/70 border border-amber-300 rounded-xl font-mono text-sm font-bold text-amber-950 tracking-wider shadow-sm"
                    >
                      <span>{code}</span>
                      <button
                        type="button"
                        onClick={() => handleCopyCode(code, idx)}
                        className="p-1.5 rounded-lg text-amber-800 hover:bg-amber-200/80 transition-colors flex items-center gap-1 text-xs"
                        aria-label={`Copy code ${code}`}
                      >
                        {copiedCodeIndex === idx ? (
                          <Check className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2 mb-4">
                  <BaseButton
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleCopyAll}
                    className="w-full justify-center text-xs font-semibold py-2"
                    leftIcon={copiedAll ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  >
                    {copiedAll ? 'All Codes Copied!' : 'Copy All Codes'}
                  </BaseButton>
                </div>
              </>
            )}

            <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl text-[11px] text-stone-600 mb-5 leading-relaxed">
              ⚠️ Store these codes offline in a password manager or secure vault. You can use them to recover account access if you ever lose your credentials or 2FA.
            </div>

            <BaseButton
              type="button"
              variant="primary"
              size="md"
              onClick={handleContinue}
              className="w-full justify-center text-stone-950 font-bold bg-amber-500 hover:bg-amber-400 shadow-md py-2.5 text-sm"
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              I Have Saved My Codes — Continue
            </BaseButton>
          </BaseCard>
        )}

        {/* State 3: Error / Expired Token */}
        {!loading && !verified && error && (
          <BaseCard variant="elevated" className="p-6 border border-red-200 bg-white shadow-xl animate-fade-in">
            <div className="text-center mb-4">
              <div className="w-12 h-12 rounded-full bg-red-100 text-red-700 flex items-center justify-center mx-auto mb-2">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-bold text-stone-900">
                Verification Failed
              </h2>
              <p className="text-xs text-red-600 mt-2 leading-relaxed">
                {error}
              </p>
            </div>

            <div className="space-y-3 pt-3">
              <Link href="/login" className="block w-full">
                <BaseButton
                  type="button"
                  variant="primary"
                  size="md"
                  className="w-full justify-center text-stone-950 font-bold bg-amber-500 hover:bg-amber-400 py-2.5 text-sm"
                >
                  Return to Sign In
                </BaseButton>
              </Link>
            </div>
          </BaseCard>
        )}

        {/* State 4: Direct Visit Without Token Parameter (Manual Input) */}
        {!loading && !verified && !error && !token && (
          <BaseCard variant="elevated" className="p-6 border border-amber-200/90 bg-white shadow-xl animate-fade-in">
            <div className="text-center mb-5">
              <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center mx-auto mb-2">
                <Mail className="w-6 h-6 text-amber-600" />
              </div>
              <h2 className="text-lg font-bold text-stone-900">
                Enter Verification Code
              </h2>
              <p className="text-xs text-stone-500 mt-1">
                Enter your registered email address and the 6-digit code sent to you.
              </p>
            </div>

            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={manualEmail}
                  onChange={(e) => setManualEmail(e.target.value)}
                  placeholder="traveler@example.com"
                  required
                  className="w-full px-3 py-2.5 text-sm bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:border-amber-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1 text-center">
                  6-Digit Verification Code
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="e.g. 123456"
                  required
                  className="w-full px-3 py-3 text-center text-2xl font-mono font-bold tracking-widest bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:border-amber-500 outline-none"
                />
              </div>

              <BaseButton
                type="submit"
                variant="primary"
                size="md"
                disabled={manualSubmitting || manualCode.length < 6}
                className="w-full justify-center text-stone-950 font-bold bg-amber-500 hover:bg-amber-400 py-2.5 text-sm"
              >
                {manualSubmitting ? 'Verifying...' : 'Verify Email'}
              </BaseButton>

              <div className="text-center pt-2">
                <Link href="/login" className="text-xs text-amber-700 hover:underline font-semibold">
                  Back to Sign In
                </Link>
              </div>
            </form>
          </BaseCard>
        )}

        {/* Footer Navigation */}
        <div className="mt-4 text-center">
          <Link
            href="/"
            className="text-xs text-stone-500 hover:text-stone-800 transition-colors font-medium inline-flex items-center gap-1"
          >
            <Home className="w-3.5 h-3.5" /> Return to Beeline Homepage
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<AuthGhostSkeleton />}>
      <VerifyEmailContent />
    </Suspense>
  );
}
