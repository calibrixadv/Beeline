'use client';

import { useState, useEffect } from 'react';

/**
 * Checks whether a train has already departed based on departureTime or travelDate.
 *
 * @param departureTime Optional ISO departure timestamp string (or HH:mm time string)
 * @param travelDate Optional YYYY-MM-DD date string
 * @param nowMs Optional current time in milliseconds (defaults to Date.now())
 * @returns true if train has already departed, false otherwise
 */
export function isTrainDeparted(
  departureTime?: string | null,
  travelDate?: string | null,
  nowMs?: number
): boolean {
  const currentNow = nowMs ?? Date.now();

  if (departureTime && typeof departureTime === 'string') {
    let toParse = departureTime.trim();
    // If departureTime is a time-only string (e.g. "07:30" or "07:30:00") and travelDate is provided, combine them
    if (/^\d{2}:\d{2}(:\d{2})?/.test(toParse) && !toParse.includes('T') && travelDate) {
      toParse = `${travelDate.trim().slice(0, 10)}T${toParse}`;
    }
    const departureMs = Date.parse(toParse);
    if (!isNaN(departureMs)) {
      return departureMs <= currentNow;
    }
  }

  if (travelDate && typeof travelDate === 'string') {
    // Check if travelDate (YYYY-MM-DD) is strictly before today's local date
    const dateMatch = travelDate.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (dateMatch) {
      const year = parseInt(dateMatch[1], 10);
      const month = parseInt(dateMatch[2], 10) - 1;
      const day = parseInt(dateMatch[3], 10);

      const targetDate = new Date(year, month, day);
      const nowDate = new Date(currentNow);
      const todayDate = new Date(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate());

      if (targetDate.getTime() < todayDate.getTime()) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Lightweight hook that ticks every `intervalMs` (default 30,000ms / 30s)
 * so open pages automatically re-evaluate departed status when a train departs in real-time.
 */
export function useNowTick(intervalMs: number = 30000): number {
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, intervalMs);

    return () => clearInterval(timer);
  }, [intervalMs]);

  return now;
}
