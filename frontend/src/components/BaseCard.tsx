'use client';

import React from 'react';

export type CardVariant = 'elevated' | 'outlined' | 'flat';

export interface BaseCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  hoverEffect?: boolean;
}

const VARIANT_STYLES: Record<CardVariant, string> = {
  elevated: 'bg-white border border-amber-100 shadow-sm honey-glow',
  outlined: 'bg-white border border-amber-200/80',
  flat: 'bg-amber-50/50 border border-transparent',
};

export const BaseCard: React.FC<BaseCardProps> = ({
  children,
  variant = 'elevated',
  hoverEffect = false,
  className = '',
  ...props
}) => {
  return (
    <div
      className={`rounded-2xl transition-all duration-200 ${VARIANT_STYLES[variant]} ${
        hoverEffect ? 'hover:shadow-md hover:border-amber-300 transition-transform' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export default BaseCard;
