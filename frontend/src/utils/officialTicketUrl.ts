export interface OfficialTicketUrlParams {
  origin?: string;
  destination?: string;
  travelDate?: string;
  operator?: string;
  trainNumber?: string;
}

export interface LegTrainLink {
  legIndex: number;
  trainCode: string;
  operator?: string;
  originName: string;
  destinationName: string;
  url: string;
}

/**
 * Formats a travelDate string into Romanian InfoFer format (DD.MM.YYYY).
 * Handles ISO timestamps (e.g. 2026-11-21T08:00:00Z) or YYYY-MM-DD (e.g. 2026-11-21).
 * If undefined or invalid, defaults to current date in DD.MM.YYYY.
 */
export function formatInfoferDate(dateStr?: string): string {
  if (!dateStr) {
    const now = new Date();
    const dd = String(now.getDate()).padStart(2, '0');
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const yyyy = now.getFullYear();
    return `${dd}.${mm}.${yyyy}`;
  }

  // Already DD.MM.YYYY
  if (/^\d{2}\.\d{2}\.\d{4}$/.test(dateStr)) {
    return dateStr;
  }

  // Match YYYY-MM-DD from start (handles YYYY-MM-DD and ISO strings)
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const [, yyyy, mm, dd] = match;
    return `${dd}.${mm}.${yyyy}`;
  }

  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) {
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}.${mm}.${yyyy}`;
  }

  return dateStr;
}

/**
 * Extracts numeric digits from train code/number (e.g. "IR 1572" -> "1572", "R-E 10061" -> "10061").
 */
export function extractTrainDigits(trainNumber?: string): string {
  if (!trainNumber) return '';
  return trainNumber.replace(/\D/g, '');
}

/**
 * Builds the direct Mersul Trenurilor (InfoFer) train page URL for a specific train and service date.
 * E.g. https://mersultrenurilor.infofer.ro/ro-RO/Tren/1572?Date=21.11.2026
 */
export function buildInfoferTrainUrl(
  trainNumberOrParams: string | { trainNumber?: string; travelDate?: string },
  travelDate?: string
): string {
  let trainNumber: string | undefined;
  let dateStr: string | undefined;

  if (typeof trainNumberOrParams === 'object' && trainNumberOrParams !== null) {
    trainNumber = trainNumberOrParams.trainNumber;
    dateStr = trainNumberOrParams.travelDate;
  } else {
    trainNumber = trainNumberOrParams;
    dateStr = travelDate;
  }

  const digits = extractTrainDigits(trainNumber);
  const ddMmYyyy = formatInfoferDate(dateStr);
  const trainSlug = digits || encodeURIComponent(trainNumber?.trim() || '');

  return `https://mersultrenurilor.infofer.ro/ro-RO/Tren/${trainSlug}?Date=${ddMmYyyy}`;
}

/**
 * Builds the official Mersul Trenurilor (InfoFer) ticket URL.
 * - If a trainNumber is provided (or direct journey), generates the direct train page URL (Tren/{digits}?Date=...).
 * - Otherwise falls back to route search (Itineraries?DepartureDate=...&DepartureStationName=...&ArrivalStationName=...).
 * Safe for new tab opening with target="_blank" rel="noopener noreferrer".
 */
export function buildOfficialTicketUrl(params: OfficialTicketUrlParams): string {
  if (params.trainNumber) {
    return buildInfoferTrainUrl(params.trainNumber, params.travelDate);
  }

  const ddMmYyyy = formatInfoferDate(params.travelDate);
  const origin = encodeURIComponent(params.origin?.trim() || '');
  const destination = encodeURIComponent(params.destination?.trim() || '');

  return `https://mersultrenurilor.infofer.ro/ro-RO/Itineraries?DepartureDate=${ddMmYyyy}&DepartureStationName=${origin}&ArrivalStationName=${destination}`;
}

/**
 * Builds direct carrier ticket purchase links where officially supported:
 * - CFR Călători (bilete.cfrcalatori.ro)
 * - Transferoviar Călători / TFC (bilete.tfc-online.ro)
 * Falls back cleanly to buildOfficialTicketUrl (InfoFer direct train or search) for other carriers or multi-operator journeys.
 */
export function buildCarrierTicketUrl(params: OfficialTicketUrlParams): string {
  const op = params.operator?.trim().toLowerCase() || '';
  const ddMmYyyy = formatInfoferDate(params.travelDate);
  const origin = encodeURIComponent(params.origin?.trim() || '');
  const destination = encodeURIComponent(params.destination?.trim() || '');

  // 1. Transferoviar Călători / TFC
  const isTfc = op.includes('transferoviar') || op === 'tfc';
  if (isTfc) {
    return `https://bilete.tfc-online.ro/ro-RO/Itineraries/?DepartureStationName=${origin}&ArrivalStationName=${destination}&DepartureDate=${ddMmYyyy}&TimeSelectionId=0&MinutesInDay=0&OrderingTypeId=0&ConnectionsTypeId=1`;
  }

  // 2. CFR Călători
  const isCfr =
    (op.includes('cfr') || op === 'cfr călători' || op === 'cfr calatori') &&
    !op.includes('transferoviar') &&
    !op.includes('regio');
  if (isCfr) {
    return `https://bilete.cfrcalatori.ro/ro-RO/Itineraries/?DepartureStationName=${origin}&ArrivalStationName=${destination}&DepartureDate=${ddMmYyyy}&TimeSelectionId=0&MinutesInDay=0&OrderingTypeId=0&ConnectionsTypeId=1`;
  }

  // 3. Fallback to Mersul Trenurilor (InfoFer)
  return buildOfficialTicketUrl(params);
}

/**
 * Builds per-leg train links for multi-leg or direct journeys.
 * Filters for train legs (skips pedestrian/bus transfers) and generates direct InfoFer train URLs.
 * Returns: [{ legIndex, trainCode, operator, originName, destinationName, url }]
 */
export function buildLegTrainLinks(
  itineraryOrLegs: any,
  fallbackDate?: string
): LegTrainLink[] {
  if (!itineraryOrLegs) return [];

  const legs: any[] = Array.isArray(itineraryOrLegs)
    ? itineraryOrLegs
    : Array.isArray(itineraryOrLegs.legs)
    ? itineraryOrLegs.legs
    : [];

  const dateStr =
    fallbackDate ||
    itineraryOrLegs.travelDate ||
    itineraryOrLegs.date ||
    (itineraryOrLegs.departureTime ? String(itineraryOrLegs.departureTime).slice(0, 10) : undefined);

  if (legs.length === 0) {
    // If no legs array, check if a single train journey object was passed
    const trainNumber = itineraryOrLegs.trainNumber || itineraryOrLegs.names?.lineCode;
    if (trainNumber) {
      return [
        {
          legIndex: 0,
          trainCode: trainNumber,
          operator: itineraryOrLegs.operator || itineraryOrLegs.names?.operatorName,
          originName: itineraryOrLegs.origin?.name || itineraryOrLegs.names?.originName || '',
          destinationName: itineraryOrLegs.destination?.name || itineraryOrLegs.names?.destinationName || '',
          url: buildInfoferTrainUrl(trainNumber, dateStr),
        },
      ];
    }
    return [];
  }

  const results: LegTrainLink[] = [];

  legs.forEach((leg, idx) => {
    // Skip pedestrian transfer or pure urban transit without rail train code
    const transportType = (leg.transportType || '').toUpperCase();
    if (transportType === 'WALK' || transportType === 'METRO') {
      return;
    }

    const trainCode =
      leg.names?.lineCode ||
      leg.trainNumber ||
      leg.names?.lineName ||
      leg.lineCode ||
      '';

    // Must have train code or digits
    const digits = extractTrainDigits(trainCode);
    if (!digits && transportType !== 'TRAIN') {
      return;
    }

    const legIndex = typeof leg.legIndex === 'number' ? leg.legIndex : idx;
    const operator =
      leg.names?.operatorShortName ||
      leg.names?.operatorName ||
      leg.operator ||
      '';
    const originName =
      leg.names?.originName ||
      leg.origin?.name ||
      leg.origin?.city ||
      '';
    const destinationName =
      leg.names?.destinationName ||
      leg.destination?.name ||
      leg.destination?.city ||
      '';

    const legDate =
      leg.timings?.scheduledDeparture?.slice(0, 10) ||
      leg.departureTime?.slice(0, 10) ||
      dateStr;

    results.push({
      legIndex,
      trainCode: trainCode || `Train ${digits}`,
      operator: operator || undefined,
      originName,
      destinationName,
      url: buildInfoferTrainUrl(trainCode || digits, legDate),
    });
  });

  return results;
}

export const SAFE_EXTERNAL_LINK_ATTRS = {
  target: '_blank',
  rel: 'noopener noreferrer',
} as const;
