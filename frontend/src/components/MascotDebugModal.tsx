'use client';

import React, { useEffect, useCallback } from 'react';
import { X, Wrench, RotateCcw, Check } from 'lucide-react';
import MascotBee, { MascotGear, GEAR_CONFIG } from './MascotBee';
import BaseButton from './BaseButton';

export interface MascotDebugModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentGear: MascotGear;
  onSelectGear: (gear: MascotGear) => void;
  onResetAuto: () => void;
  isManualOverride: boolean;
}

export const MascotDebugModal: React.FC<MascotDebugModalProps> = ({
  isOpen,
  onClose,
  currentGear,
  onSelectGear,
  onResetAuto,
  isManualOverride,
}) => {
  const modalRef = React.useRef<HTMLDivElement>(null);
  const closeButtonRef = React.useRef<HTMLButtonElement>(null);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
        return;
      }

      if (e.key === 'Tab' && modalRef.current) {
        const focusable = modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
      // Auto-focus close button for accessible keyboard navigation
      setTimeout(() => {
        closeButtonRef.current?.focus();
      }, 50);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  const currentConfig = GEAR_CONFIG[currentGear];
  const gears: MascotGear[] = ['default', 'fast', 'safe', 'economy'];

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-stone-950/50 backdrop-blur-xs animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="debug-modal-title"
      onClick={onClose}
    >
      <div
        ref={modalRef}
        className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-stone-200 p-5 sm:p-6 overflow-hidden max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-stone-100">
          <div>
            <div className="flex items-center gap-1.5 mb-1 flex-wrap">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-stone-100 text-stone-700 border border-stone-200">
                <Wrench className="w-3 h-3 text-amber-500" />
                Testing & Debug Tools
              </span>
              {isManualOverride ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide bg-amber-100 text-amber-900 border border-amber-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  Manual Override
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide bg-emerald-100 text-emerald-900 border border-emerald-300">
                  Auto Route Sync
                </span>
              )}
            </div>
            <h3 id="debug-modal-title" className="text-lg font-black text-stone-900">
              Mascot Gear Override Panel
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">
              Force and preview any mascot gear, accessories, and flight dynamics.
            </p>
          </div>

          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Close Debug Tools"
            className="p-1.5 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Preview Section */}
        <div className="my-4 p-4 rounded-2xl bg-amber-50/60 border border-amber-100 flex flex-col sm:flex-row items-center gap-4">
          <div className="flex-shrink-0">
            <MascotBee
              gear={currentGear}
              size="xl"
              animated={true}
              showBadge={true}
            />
          </div>
          <div className="text-left flex-1 min-w-0">
            <div className="text-[11px] font-bold uppercase tracking-wider text-amber-800">
              Active Gear Preview
            </div>
            <div className="text-sm font-extrabold text-stone-900 truncate">
              {currentConfig.title}
            </div>
            <div className="text-xs font-semibold text-amber-700 mt-0.5">
              {currentConfig.gearName}
            </div>
            <div className="text-[11px] text-stone-600 mt-1 italic">
              &quot;{currentConfig.speechDefault}&quot;
            </div>
          </div>
        </div>

        {/* Gear Selection Chips / Buttons */}
        <div className="space-y-2">
          <div className="text-xs font-bold text-stone-700 uppercase tracking-wider">
            Choose Mascot Gear to Force:
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {gears.map((gear) => {
              const isSelected = currentGear === gear;
              const gConfig = GEAR_CONFIG[gear];
              return (
                <button
                  key={gear}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => onSelectGear(gear)}
                  className={`p-3 rounded-xl border-2 text-left transition-all flex items-center justify-between group cursor-pointer ${
                    isSelected
                      ? 'border-amber-500 bg-amber-50/80 shadow-xs scale-[1.01]'
                      : 'border-stone-200 hover:border-amber-300 bg-white hover:bg-stone-50'
                  }`}
                  style={
                    isSelected
                      ? {
                          borderColor: gConfig.color,
                        }
                      : {}
                  }
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-lg">{gConfig.accessoryIcon}</span>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-stone-900 group-hover:text-amber-800 transition-colors">
                        {gear.charAt(0).toUpperCase() + gear.slice(1)}
                      </div>
                      <div className="text-[10px] text-stone-500 truncate">
                        {gConfig.gearName}
                      </div>
                    </div>
                  </div>
                  {isSelected && (
                    <span
                      className="p-1 rounded-full text-white text-[10px]"
                      style={{ backgroundColor: gConfig.color }}
                    >
                      <Check className="w-3 h-3 stroke-[3]" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="mt-5 pt-4 border-t border-stone-100 flex items-center justify-between gap-2 flex-wrap">
          <button
            type="button"
            onClick={onResetAuto}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 px-3 py-1.5 rounded-xl transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 text-stone-500" />
            Reset to Automatic Route Mode
          </button>

          <BaseButton
            type="button"
            variant="primary"
            size="sm"
            onClick={onClose}
            className="bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold px-4 py-1.5"
          >
            Done
          </BaseButton>
        </div>
      </div>
    </div>
  );
};

export default MascotDebugModal;
