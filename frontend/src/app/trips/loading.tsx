import React from 'react';
import TripsGhostSkeleton from '../../components/TripsGhostSkeleton';

export default function TripsLoading() {
  return (
    <div className="py-6 md:py-10 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
      <TripsGhostSkeleton fullPage />
    </div>
  );
}
