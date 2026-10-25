'use client';

import React from 'react';

interface CozyHoneyBackgroundProps {
  children?: React.ReactNode;
  showTexture?: boolean;
  showPollen?: boolean;
}

export const CozyHoneyBackground: React.FC<CozyHoneyBackgroundProps> = ({
  children,
  showTexture = true,
  showPollen = true,
}) => {
  return (
    <div className={`relative min-h-screen w-full ${showTexture ? 'honeycomb-pattern' : 'bg-[#FFFDF9]'}`}>
      {/* Floating golden pollen ambient particles */}
      {showPollen && (
        <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
          <div className="absolute top-[15%] left-[10%] w-3 h-3 rounded-full bg-amber-400/40 blur-[1px] animate-pollen-1" />
          <div className="absolute top-[35%] right-[15%] w-4 h-4 rounded-full bg-amber-300/50 blur-[2px] animate-pollen-2" />
          <div className="absolute top-[65%] left-[20%] w-2.5 h-2.5 rounded-full bg-yellow-400/40 blur-[1px] animate-pollen-3" />
          <div className="absolute top-[80%] right-[25%] w-3.5 h-3.5 rounded-full bg-amber-500/30 blur-[1.5px] animate-pollen-1" />
          <div className="absolute top-[25%] left-[75%] w-2 h-2 rounded-full bg-yellow-300/60 blur-[0.5px] animate-pollen-2" />
        </div>
      )}

      {/* Main app content */}
      <div className="relative z-10">{children}</div>
    </div>
  );
};

export default CozyHoneyBackground;
