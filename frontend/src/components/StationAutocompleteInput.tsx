'use client';

import React, { useState, useEffect, useRef, useId } from 'react';
import { X, Train, Check } from 'lucide-react';
import { StationAutocompleteItem } from '../types/station';
import { stationAutocompleteService } from '../services/stationAutocompleteService';

export interface StationAutocompleteInputProps {
  id?: string;
  label?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement> | { target: { value: string } }) => void;
  onSelectStation?: (station: StationAutocompleteItem) => void;
  placeholder?: string;
  excludeStationName?: string;
  leftIcon?: React.ReactNode;
  onClear?: () => void;
  error?: string;
  dataTestId?: string;
  ariaLabel?: string;
  compact?: boolean;
  className?: string;
  disabled?: boolean;
  required?: boolean;
  autoComplete?: string;
}

export const StationAutocompleteInput: React.FC<StationAutocompleteInputProps> = ({
  id,
  label,
  value,
  onChange,
  onSelectStation,
  placeholder = 'Search railway station...',
  excludeStationName,
  leftIcon,
  onClear,
  error,
  dataTestId,
  ariaLabel,
  compact = false,
  className = '',
  disabled = false,
  required = false,
  autoComplete = 'off',
}) => {
  const generatedId = useId();
  const inputId = id || `station-input-${generatedId}`;
  const listboxId = `station-listbox-${generatedId}`;

  const [isOpen, setIsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<StationAutocompleteItem[]>([]);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const [isLoading, setIsLoading] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxRef = useRef<HTMLDivElement>(null);

  // Update suggestions when value or isOpen changes
  useEffect(() => {
    if (!isOpen) return;

    let isCancelled = false;
    setIsLoading(true);

    const debounceTimer = setTimeout(() => {
      stationAutocompleteService
        .filterStations(value, {
          limit: compact ? 6 : 8,
          excludeStationName,
        })
        .then((items) => {
          if (isCancelled) return;
          setSuggestions(items);
          setHighlightedIndex(-1);
          setIsLoading(false);
        })
        .catch(() => {
          if (isCancelled) return;
          setIsLoading(false);
        });
    }, 40);

    return () => {
      isCancelled = true;
      clearTimeout(debounceTimer);
    };
  }, [value, isOpen, excludeStationName, compact]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setHighlightedIndex(-1);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (station: StationAutocompleteItem) => {
    onChange({ target: { value: station.name } });
    if (onSelectStation) {
      onSelectStation(station);
    }
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) => (suggestions.length === 0 ? -1 : (prev + 1) % suggestions.length));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) =>
          suggestions.length === 0 ? -1 : (prev - 1 + suggestions.length) % suggestions.length
        );
        break;
      case 'Enter':
        if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
          e.preventDefault();
          handleSelect(suggestions[highlightedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setHighlightedIndex(-1);
        break;
      case 'Tab':
        setIsOpen(false);
        setHighlightedIndex(-1);
        break;
    }
  };

  const handleClearClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onClear) {
      onClear();
    } else {
      onChange({ target: { value: '' } });
    }
    setIsOpen(false);
    setHighlightedIndex(-1);
    inputRef.current?.focus();
  };

  return (
    <div ref={containerRef} className="w-full flex flex-col gap-1.5 text-left">
      {label && (
        <label htmlFor={inputId} className="text-xs font-semibold text-stone-700 tracking-wide">
          {label}
        </label>
      )}

      <div
        data-testid="station-autocomplete-input-anchor"
        className="relative w-full flex items-center"
        style={{ position: 'relative' }}
      >
        {leftIcon && (
          <div className="absolute left-3.5 flex items-center pointer-events-none text-stone-400 z-10">
            {leftIcon}
          </div>
        )}

        <input
          ref={inputRef}
          id={inputId}
          data-testid={dataTestId}
          type="text"
          role="combobox"
          aria-expanded={isOpen}
          aria-autocomplete="list"
          aria-controls={isOpen ? listboxId : undefined}
          aria-activedescendant={
            isOpen && highlightedIndex >= 0 ? `${listboxId}-option-${highlightedIndex}` : undefined
          }
          aria-label={ariaLabel || label || placeholder}
          placeholder={placeholder}
          value={value}
          disabled={disabled}
          required={required}
          autoComplete={autoComplete}
          onFocus={() => setIsOpen(true)}
          onClick={() => setIsOpen(true)}
          onChange={(e) => {
            onChange(e);
            if (!isOpen) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          className={`w-full bg-white border rounded-xl py-2.5 text-sm text-stone-900 placeholder:text-stone-400 outline-none focus:outline-none focus-visible:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-400/35 transition-all ${
            leftIcon ? 'pl-10' : 'pl-3.5'
          } ${onClear && value ? 'pr-10' : 'pr-3.5'} ${
            error ? 'border-red-400 focus:ring-red-400/20' : 'border-amber-200/90'
          } ${className}`}
        />

        {/* Clear Button */}
        {onClear && Boolean(value) && (
          <button
            type="button"
            onClick={handleClearClick}
            aria-label="Clear station input"
            className="absolute right-3 p-1 rounded-full text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-colors z-10"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* Floating elevated autocomplete dropdown card */}
        {isOpen && (
          <div
            ref={listboxRef}
            id={listboxId}
            role="listbox"
            aria-label="Station suggestions"
            data-testid="station-autocomplete-dropdown"
            className="absolute left-0 right-0 z-50 bg-white border border-amber-200 rounded-2xl shadow-xl overflow-hidden text-stone-900 animate-in fade-in zoom-in-95 duration-100 max-h-64 overflow-y-auto divide-y divide-amber-50/80 focus:outline-none py-1"
            style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 100 }}
          >
            {suggestions.length > 0 ? (
              suggestions.map((st, idx) => {
                const isSelected = value.trim().toLowerCase() === st.name.toLowerCase();
                const isHighlighted = idx === highlightedIndex;

                return (
                  <div
                    key={`${st.code}-${idx}`}
                    id={`${listboxId}-option-${idx}`}
                    role="option"
                    aria-selected={isHighlighted || isSelected}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    onClick={() => handleSelect(st)}
                    className={`px-3.5 py-2.5 cursor-pointer flex items-center justify-between transition-colors ${
                      isHighlighted ? 'bg-amber-50/90 text-stone-950' : 'hover:bg-amber-50/50 text-stone-800'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="p-1 rounded-lg bg-amber-100/70 text-amber-700 shrink-0">
                        <Train className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs sm:text-sm font-bold truncate">{st.name}</span>
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-100/80 text-amber-900 border border-amber-200/80">
                            {st.code}
                          </span>
                        </div>
                        {st.city && st.city !== st.name && (
                          <p className="text-[11px] text-stone-500 truncate">{st.city}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      {st.dailyTrainCount !== undefined && st.dailyTrainCount > 0 && (
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide ${
                            st.isMajorHub
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : 'bg-stone-100 text-stone-600'
                          }`}
                        >
                          {st.dailyTrainCount} trains/day
                        </span>
                      )}
                      {isSelected && <Check className="w-4 h-4 text-amber-600 shrink-0" />}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="px-4 py-3 text-xs text-stone-500 text-center">
                {isLoading ? 'Loading Romanian stations...' : 'No railway stations found.'}
              </div>
            )}
          </div>
        )}
      </div>

      {error && <span className="text-xs text-red-500 font-medium">{error}</span>}
    </div>
  );
};

export default StationAutocompleteInput;
