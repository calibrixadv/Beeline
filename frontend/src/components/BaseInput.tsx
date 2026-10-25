'use client';

import React from 'react';
import { X } from 'lucide-react';

export interface BaseInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  onClear?: () => void;
}

export const BaseInput: React.FC<BaseInputProps> = ({
  label,
  error,
  leftIcon,
  onClear,
  value,
  className = '',
  ...props
}) => {
  return (
    <div className="w-full flex flex-col gap-1.5">
      {label && <label className="text-xs font-semibold text-stone-700 tracking-wide">{label}</label>}
      <div className="relative flex items-center">
        {leftIcon && (
          <div className="absolute left-3.5 flex items-center pointer-events-none text-stone-400">
            {leftIcon}
          </div>
        )}
        <input
          value={value}
          className={`w-full bg-white border rounded-xl py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-all ${
            leftIcon ? 'pl-10' : 'pl-3.5'
          } ${onClear && value ? 'pr-10' : 'pr-3.5'} ${
            error ? 'border-red-400 focus:ring-red-400/20' : 'border-stone-200'
          } ${className}`}
          {...props}
        />
        {onClear && Boolean(value) && (
          <button
            type="button"
            onClick={onClear}
            className="absolute right-3 p-1 rounded-full text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      {error && <span className="text-xs text-red-500 font-medium">{error}</span>}
    </div>
  );
};

export default BaseInput;
