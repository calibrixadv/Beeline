'use client';

import React, { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  User as UserIcon,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  TrendingUp,
  Clock,
  Compass,
  Briefcase,
  ShieldCheck,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { apiClient } from '../../services/apiClient';
import { UserTravelStats, RouteCorridorSummary } from '../../types/auth';
import { formatCurrency } from '../../utils/formatters';

function formatMinutesSaved(minutes: number): string {
  if (minutes <= 0) return '0 min';
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export default function ProfilePage() {
  const router = useRouter();
  const { user, isLoading: authLoading, refreshUser } = useAuth();

  const [stats, setStats] = useState<UserTravelStats | null>(null);
  const [statsLoading, setStatsLoading] = useState<boolean>(true);
  const [statsError, setStatsError] = useState<string | null>(null);

  // Profile Form state
  const [username, setUsername] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Sync user state into form fields
  useEffect(() => {
    if (user) {
      setUsername(user.username || '');
    }
  }, [user]);

  // Fetch travel stats
  useEffect(() => {
    let isCancelled = false;

    if (!user) {
      setStats(null);
      setStatsLoading(false);
      return;
    }

    setStatsLoading(true);
    setStatsError(null);

    apiClient
      .getTravelStats()
      .then((data) => {
        if (isCancelled) return;
        setStats(data);
      })
      .catch((err) => {
        if (isCancelled) return;
        setStatsError(err?.message || 'Could not load travel statistics');
        // Fallback default clean zero stats to prevent page breakage
        setStats({
          totalTrips: 0,
          moneySavedLei: 0.0,
          minutesSaved: 0,
          totalDistanceKm: 0.0,
          co2SavedKg: 0.0,
          comparisonBaseline: 'CAR',
          favoriteRoute: null,
          topRoutes: [],
        });
      })
      .finally(() => {
        if (!isCancelled) {
          setStatsLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [user?.id]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setFeedback(null);

    const trimmedUsername = username.trim();
    if (!trimmedUsername) {
      setFeedback({ type: 'error', message: 'Username cannot be empty.' });
      setIsSaving(false);
      return;
    }

    try {
      await apiClient.updateProfile({
        username: trimmedUsername,
      });
      await refreshUser();
      setFeedback({ type: 'success', message: 'Profile details updated successfully.' });
    } catch (err: any) {
      const isConflict =
        err?.status === 409 ||
        err?.message?.toLowerCase().includes('already taken') ||
        err?.message?.toLowerCase().includes('in use');
      setFeedback({
        type: 'error',
        message: isConflict
          ? 'Username is already taken. Please choose another.'
          : err?.message || 'Failed to update profile. Please try again.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // 1. Loading State
  if (authLoading) {
    return (
      <div className="py-10 px-4 max-w-4xl mx-auto space-y-6 animate-pulse" aria-busy="true">
        <div className="h-20 bg-[#FAF4E8] rounded-2xl border border-[#F3E8D2]" />
        <div className="h-28 bg-[#FAF4E8] rounded-2xl border border-[#F3E8D2]" />
        <div className="h-64 bg-[#FAF4E8] rounded-2xl border border-[#F3E8D2]" />
      </div>
    );
  }

  // 2. Logged Out State
  if (!user) {
    return (
      <div className="py-12 px-4 max-w-lg mx-auto text-center">
        <div className="p-8 rounded-3xl bg-[#FAF4E8]/90 border border-[#F3E8D2] shadow-xs">
          <div className="w-14 h-14 mx-auto rounded-full bg-amber-500/20 text-amber-700 flex items-center justify-center mb-4">
            <UserIcon className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-stone-900">Sign in to view your profile</h2>
          <p className="text-sm text-stone-600 mt-2">
            Access your trip history, transit savings vs driving, and manage your account details.
          </p>
          <div className="mt-6 flex justify-center">
            <Link
              href="/login"
              className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-sm transition-all shadow-xs"
            >
              Sign In
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isGuest = Boolean(user.is_guest);
  const initials = user.full_name
    ? user.full_name
        .split(' ')
        .map((p) => p[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : (user.email ? user.email[0].toUpperCase() : 'U');

  const moneySaved = stats ? stats.moneySavedLei : 0.0;
  const minutesSaved = stats ? stats.minutesSaved : 0;
  const totalTrips = stats ? stats.totalTrips : 0;
  const totalDistance = stats ? stats.totalDistanceKm : 0.0;
  const co2Saved = stats ? stats.co2SavedKg : 0.0;
  const favoriteRoute = stats?.favoriteRoute || null;
  const topRoutes = stats?.topRoutes || [];

  const maxCorridorTrips = topRoutes.length > 0 ? Math.max(...topRoutes.map((r) => r.tripCount), 1) : 1;

  return (
    <div className="py-8 md:py-12 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto space-y-8 animate-fade-in">
      {/* Guest Status Banner */}
      {isGuest && (
        <div
          data-testid="guest-warning-banner"
          className="p-4 rounded-2xl bg-amber-50 border border-amber-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
        >
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
            <span className="text-stone-800">
              You are exploring on a <strong>Guest Pass</strong>. Sign up or verify your account to permanently persist trips across all devices.
            </span>
          </div>
          <Link
            href="/login"
            className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold self-start sm:self-auto transition-colors"
          >
            Create Permanent Account
          </Link>
        </div>
      )}

      {/* Profile Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#F3E8D2]">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-amber-500 text-stone-950 font-black text-lg flex items-center justify-center shrink-0 shadow-xs">
            {initials}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-black text-stone-900 tracking-tight">
                {user.full_name || 'Traveler'}
              </h1>
              {user.email_verified ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" /> Verified
                </span>
              ) : isGuest ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full">
                  Guest
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                  Unverified
                </span>
              )}
            </div>
            <p className="text-xs text-stone-500 mt-0.5">{user.email || 'No email registered'}</p>
          </div>
        </div>

        <Link
          href="/my-trip"
          data-testid="profile-my-trip-link"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-stone-700 hover:text-stone-950 bg-[#FAF4E8] hover:bg-[#FAF4E8]/80 border border-[#F3E8D2] transition-colors self-start sm:self-auto"
        >
          <Briefcase className="w-4 h-4 text-amber-600" />
          <span>View Trip Wallet</span>
        </Link>
      </div>

      {/* Travel Savings Strip (vs. Car) */}
      <section aria-labelledby="savings-strip-heading" className="space-y-2">
        <h2 id="savings-strip-heading" className="sr-only">
          Travel Savings vs. Driving by Car
        </h2>

        <div
          data-testid="profile-savings-strip"
          className="rounded-2xl bg-[#FAF4E8] border border-[#F3E8D2] p-5 sm:p-6"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-[#F3E8D2]">
            {/* 1. Money Saved */}
            <div className="py-3 md:py-0 md:px-4 first:md:pl-0">
              <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">
                Money Saved <span className="text-stone-400 font-normal lowercase">(vs. car)</span>
              </span>
              <span
                data-testid="stat-money-saved"
                className="text-2xl sm:text-3xl font-black text-amber-700 tracking-tight mt-1 block"
              >
                {formatCurrency(moneySaved)} RON
              </span>
            </div>

            {/* 2. Minutes Saved */}
            <div className="py-3 md:py-0 md:px-4">
              <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">
                Minutes Saved <span className="text-stone-400 font-normal lowercase">(vs. car)</span>
              </span>
              <span
                data-testid="stat-minutes-saved"
                className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight mt-1 block"
              >
                {formatMinutesSaved(minutesSaved)}
              </span>
            </div>

            {/* 3. Favorite Route */}
            <div className="py-3 md:py-0 md:px-4 last:md:pr-0">
              <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">
                Favorite Route
              </span>
              <div
                data-testid="stat-favorite-route"
                className="text-sm sm:text-base font-bold text-stone-900 mt-1.5 truncate"
              >
                {favoriteRoute ? (
                  <span>
                    {favoriteRoute.origin} ➔ {favoriteRoute.destination}{' '}
                    <span className="text-xs font-semibold text-stone-500">
                      • {favoriteRoute.tripCount} {favoriteRoute.tripCount === 1 ? 'trip' : 'trips'}
                    </span>
                  </span>
                ) : (
                  <span className="text-stone-500 font-normal">No trips yet</span>
                )}
              </div>
            </div>
          </div>

          {/* Factual Sub-Line Underneath */}
          <div className="mt-4 pt-3 border-t border-[#F3E8D2] text-[11px] font-medium text-stone-600 flex items-center justify-between flex-wrap gap-2">
            <span>
              {totalTrips} {totalTrips === 1 ? 'trip' : 'trips'} | {totalDistance.toFixed(1)} km | {co2Saved.toFixed(1)} kg CO2 saved
            </span>
            <span className="text-stone-400 text-[10px]">
              Baseline: Romanian highway/DN driving (~0.65 RON/km, 62 km/h avg)
            </span>
          </div>
        </div>
      </section>

      {/* Your Routes Ledger */}
      <section data-testid="profile-top-routes" aria-labelledby="routes-ledger-heading" className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 id="routes-ledger-heading" className="text-base font-bold text-stone-900">
            Your Corridors Ledger
          </h2>
          {topRoutes.length > 0 && (
            <span className="text-xs text-stone-500">
              Top {topRoutes.length} frequent {topRoutes.length === 1 ? 'route' : 'routes'}
            </span>
          )}
        </div>

        {topRoutes.length === 0 ? (
          <div className="rounded-2xl bg-[#FAF4E8] border border-[#F3E8D2] p-8 text-center">
            <Compass className="w-8 h-8 text-amber-600 mx-auto mb-2 opacity-80" />
            <p className="text-sm font-semibold text-stone-800">No journeys recorded yet</p>
            <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
              Plan and save journeys or confirm reservations to unlock your personalized corridor ledger and car comparison.
            </p>
            <div className="mt-4">
              <Link
                href="/trips"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs transition-colors shadow-xs"
              >
                <span>Plan your first trip</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl bg-[#FAF4E8] border border-[#F3E8D2] divide-y divide-[#F3E8D2] overflow-hidden">
            {topRoutes.map((r, index) => {
              const widthPct = Math.max(8, Math.round((r.tripCount / maxCorridorTrips) * 100));
              return (
                <Link
                  key={`${r.origin}-${r.destination}-${index}`}
                  href={`/trips?origin=${encodeURIComponent(r.origin)}&destination=${encodeURIComponent(r.destination)}`}
                  className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#FAF4E8]/60 transition-colors group block"
                  title={`Search ${r.origin} to ${r.destination}`}
                >
                  <div className="space-y-1.5 flex-1 min-w-0 pr-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-stone-900 group-hover:text-amber-700 transition-colors truncate">
                        {r.origin} ➔ {r.destination}
                      </span>
                      <span className="text-[10px] font-semibold text-stone-500 bg-[#F3E8D2] px-2 py-0.5 rounded-md shrink-0">
                        {r.topOperator}
                      </span>
                    </div>

                    {/* Golden proportional bar */}
                    <div className="w-full max-w-xs h-1.5 bg-[#F3E8D2] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-500 rounded-full transition-all duration-300"
                        style={{ width: `${widthPct}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 text-xs">
                    <div className="text-left sm:text-right">
                      <span className="font-extrabold text-stone-900 block">
                        {r.tripCount} {r.tripCount === 1 ? 'trip' : 'trips'}
                      </span>
                      <span className="text-[11px] text-amber-700 font-semibold block">
                        +{formatCurrency(r.moneySavedLei)} RON saved
                      </span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-stone-400 group-hover:text-stone-700 group-hover:translate-x-0.5 transition-all" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* Account Details Form */}
      <section aria-labelledby="account-details-heading" className="space-y-4 pt-4 border-t border-[#F3E8D2]">
        <div>
          <h2 id="account-details-heading" className="text-base font-bold text-stone-900">
            Account Details
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Update your username.
          </p>
        </div>

        {feedback && (
          <div
            data-testid="profile-form-feedback"
            role="alert"
            className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 border max-w-xl ${
              feedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-red-50 text-red-800 border-red-200'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}

        <form onSubmit={handleUpdateProfile}>
          <div className="flex flex-col sm:flex-row sm:items-end gap-3 max-w-xl">
            <div className="flex-1">
              <label htmlFor="profile-username-input" className="block text-xs font-bold text-stone-700 mb-1">
                Username
              </label>
              <input
                id="profile-username-input"
                data-testid="profile-input-username"
                aria-label="Username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. traveler_bee"
                className="w-full px-3.5 py-2 text-xs rounded-xl bg-white border border-[#F3E8D2] text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
              />
            </div>
            <button
              type="submit"
              data-testid="profile-save-button"
              disabled={isSaving}
              className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs transition-all shadow-xs disabled:opacity-50 disabled:cursor-not-allowed shrink-0 h-[34px] sm:self-end"
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
