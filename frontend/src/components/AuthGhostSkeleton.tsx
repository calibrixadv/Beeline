'use client';

import React from 'react';

export interface AuthGhostSkeletonProps {
  className?: string;
}

export const AuthGhostSkeleton: React.FC<AuthGhostSkeletonProps> = ({
  className = '',
}) => {
  return (
    <div
      data-testid="auth-ghost-skeleton"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="Loading authentication"
      className={`min-h-[calc(100dvh-4rem)] flex flex-col justify-center items-center py-8 px-4 sm:px-6 lg:px-8 ${className}`}
    >
      <div className="w-full max-w-md mx-auto space-y-4">
        {/* Header Branding Skeleton */}
        <div className="flex flex-col items-center text-center space-y-2 mb-2">
          <div className="w-14 h-14 rounded-2xl glass-ghost-bar mx-auto" />
          <div className="h-7 w-44 rounded-lg glass-ghost-bar mx-auto" />
          <div className="h-3.5 w-60 rounded-full glass-ghost-bar mx-auto" />
        </div>

        {/* 2-tab Sign In / Create Account segmented toggle skeleton */}
        <div className="grid grid-cols-2 gap-2 p-1.5 rounded-2xl glass-ghost-card">
          <div className="h-10 rounded-xl glass-ghost-bar" />
          <div className="h-10 rounded-xl glass-ghost-bar" />
          <div className="glass-shimmer-overlay" aria-hidden="true" />
        </div>

        {/* Centered Auth Card Skeleton */}
        <div className="glass-ghost-card rounded-3xl p-6 sm:p-8 space-y-5">
          {/* Form field 1: Username / Email */}
          <div className="space-y-1.5">
            <div className="h-3 w-20 rounded-full glass-ghost-bar" />
            <div className="h-12 w-full rounded-2xl glass-ghost-bar" />
          </div>

          {/* Form field 2: Password */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="h-3 w-20 rounded-full glass-ghost-bar" />
              <div className="h-3 w-24 rounded-full glass-ghost-bar" />
            </div>
            <div className="h-12 w-full rounded-2xl glass-ghost-bar" />
          </div>

          {/* Primary submit button bar */}
          <div className="h-12 w-full rounded-2xl glass-ghost-bar mt-2" />

          {/* Full-bleed shimmer overlay */}
          <div className="glass-shimmer-overlay" aria-hidden="true" />
        </div>

        {/* Footer link skeleton */}
        <div className="flex justify-center pt-2">
          <div className="h-3 w-40 rounded-full glass-ghost-bar" />
        </div>
      </div>
    </div>
  );
};

export default AuthGhostSkeleton;
