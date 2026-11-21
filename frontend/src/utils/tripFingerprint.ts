import { TrainJourney } from '../types/train';
import { TripItem } from '../types/trip';
import { TransitRoutePlan } from '../types/routePlan';

/**
 * Normalizes string: lowercase, trimmed, collapsed whitespace.
 */
export function normalizeTripString(str?: string | null): string {
  if (!str) return '';
  return String(str)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

/**
 * Extracts deterministic HH:MM (24-hour) from ISO timestamp or time string.
 */
export function extractDepartureHHMM(timeStr?: string | null): string {
  if (!timeStr) return '';
  const s = String(timeStr).trim();
  const tIndex = s.indexOf('T');
  const timePart = tIndex !== -1 ? s.slice(tIndex + 1) : s;
  const match = timePart.match(/^(\d{1,2}):(\d{2})/);
  if (match) {
    const hours = match[1].padStart(2, '0');
    const minutes = match[2];
    return `${hours}:${minutes}`;
  }
  return '';
}

/**
 * Extracts YYYY-MM-DD from an ISO string, date string, or datetime string.
 */
export function extractTravelDate(dateOrTimeStr?: string | null): string {
  if (!dateOrTimeStr) return '';
  const s = String(dateOrTimeStr).trim();
  const match = s.match(/^(\d{4}-\d{2}-\d{2})/);
  if (match) {
    return match[1];
  }
  return s;
}

/**
 * Builds canonical physical trip fingerprint:
 * `${normalize(trainNumber)}|${normalize(origin)}|${normalize(destination)}|${travelDate}|${departureHHMM}`
 */
export function computeTripFingerprint(params: {
  trainNumber?: string | null;
  origin?: string | null;
  destination?: string | null;
  travelDate?: string | null;
  departureHHMM?: string | null;
}): string {
  const normTrain = normalizeTripString(params.trainNumber);
  const normOrig = normalizeTripString(params.origin);
  const normDest = normalizeTripString(params.destination);
  const dateStr = extractTravelDate(params.travelDate);
  const timeStr = extractDepartureHHMM(params.departureHHMM);
  return `${normTrain}|${normOrig}|${normDest}|${dateStr}|${timeStr}`;
}

export function getJourneyFingerprint(journey: TrainJourney, travelDate?: string): string {
  const effectiveDate =
    travelDate || (journey.departureTime ? extractTravelDate(journey.departureTime) : '');
  const departureHHMM = extractDepartureHHMM(journey.departureTime);
  const origin = journey.origin?.name || journey.origin?.city || '';
  const destination = journey.destination?.name || journey.destination?.city || '';
  return computeTripFingerprint({
    trainNumber: journey.trainNumber,
    origin,
    destination,
    travelDate: effectiveDate,
    departureHHMM,
  });
}

export function getTripItemFingerprint(item: TripItem): string {
  return getJourneyFingerprint(item.journey, item.travelDate);
}

export function getRoutePlanFingerprint(plan: TransitRoutePlan): string {
  const trainLeg =
    plan.legs?.find((l) => String(l.transportType).toUpperCase() === 'TRAIN') || plan.legs?.[0];
  const trainNumber =
    trainLeg?.names?.lineCode ||
    trainLeg?.names?.lineName ||
    plan.summary?.slice(0, 24) ||
    '';
  const origin =
    plan.query?.origin?.name ||
    plan.query?.origin?.city ||
    trainLeg?.names?.originName ||
    '';
  const lastLeg = plan.legs?.[plan.legs.length - 1];
  const destination =
    plan.query?.destination?.name ||
    plan.query?.destination?.city ||
    lastLeg?.names?.destinationName ||
    '';
  const depTime = plan.departureTime || trainLeg?.timings?.scheduledDeparture || '';
  return computeTripFingerprint({
    trainNumber,
    origin,
    destination,
    travelDate: extractTravelDate(depTime) || plan.date,
    departureHHMM: extractDepartureHHMM(depTime),
  });
}
