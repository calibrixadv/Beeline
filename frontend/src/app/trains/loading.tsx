import React from 'react';
import TrainsGhostSkeleton from '../../components/TrainsGhostSkeleton';

export default function TrainsLoading() {
  return (
    <div className="py-6 md:py-10 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
      <TrainsGhostSkeleton fullPage />
    </div>
  );
}
