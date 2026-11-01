import {
  TransitLeg,
  RouteRiskAnalysis,
  RiskLevel,
  BufferAdequacy,
  RouteRiskFactor,
} from '../types/routePlan';

export interface RiskCalculationParams {
  legs: Pick<TransitLeg, 'transportType' | 'names' | 'risk'>[];
  customMinBufferMinutes?: number;
}

/**
 * Standard thresholds for the Romanian Transfer Shield.
 */
export const ROMANIAN_TRANSFER_SHIELD = {
  RECOMMENDED_BUFFER_MINUTES: 20,
  GENEROUS_BUFFER_MINUTES: 35,
  TIGHT_BUFFER_MINUTES: 15,
};

/**
 * Historical punctuality benchmark defaults for major Romanian operators (0.0 to 1.0).
 */
export const OPERATOR_PUNCTUALITY_BENCHMARKS: Record<string, number> = {
  'metrorex': 0.98,
  'transurb': 0.93,
  'stb': 0.88,
  'cfr': 0.82,
  'cfr calatori': 0.82,
  'astra trans carpatic': 0.90,
  'transferoviar': 0.89,
  'softrans': 0.92,
  'regio calatori': 0.86,
};

/**
 * Resolves default historical punctuality for an operator name.
 */
export const getCarrierPunctualityDefault = (operatorName?: string): number => {
  if (!operatorName) return 0.88;
  const normalized = operatorName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  for (const [key, score] of Object.entries(OPERATOR_PUNCTUALITY_BENCHMARKS)) {
    if (normalized.includes(key)) {
      return score;
    }
  }
  return 0.88;
};

/**
 * Computes the multi-factor route risk analysis for an itinerary.
 */
export const calculateRouteRisk = (params: RiskCalculationParams): RouteRiskAnalysis => {
  const { legs, customMinBufferMinutes } = params;

  if (!legs || legs.length === 0) {
    return {
      overallRiskScore: 0,
      riskLevel: 'LOW',
      historicalPunctualityRate: 1.0,
      tightestBufferMinutes: 999,
      bufferAdequacy: 'GENEROUS',
      riskSummaryText: 'Direct journey with zero connection risk.',
      factors: [],
    };
  }

  // 1. Calculate weighted carrier punctuality
  let totalPunctuality = 0;
  let punctualityCount = 0;

  legs.forEach((leg) => {
    const historicalPercent =
      leg.risk?.historicalPunctualityPercent ??
      getCarrierPunctualityDefault(leg.names.operatorName || leg.names.operatorShortName) * 100;

    totalPunctuality += historicalPercent / 100;
    punctualityCount += 1;
  });

  const avgPunctuality = punctualityCount > 0 ? totalPunctuality / punctualityCount : 0.9;
  // Punctuality penalty: 0 to 35 points
  const punctualityPenalty = Math.max(0, Math.min(35, (1 - avgPunctuality) * 70));

  // 2. Evaluate transfer buffers between consecutive legs
  const transferBuffers: number[] = [];
  const factors: RouteRiskFactor[] = [];
  let bufferPenalty = 0;

  for (let i = 0; i < legs.length - 1; i++) {
    const currentLeg = legs[i];
    const nextLeg = legs[i + 1];
    const buffer = currentLeg.risk?.transferBufferAfterMinutes;

    if (typeof buffer === 'number') {
      transferBuffers.push(buffer);

      const targetMin = customMinBufferMinutes ?? ROMANIAN_TRANSFER_SHIELD.RECOMMENDED_BUFFER_MINUTES;

      if (buffer < ROMANIAN_TRANSFER_SHIELD.TIGHT_BUFFER_MINUTES) {
        // High hazard buffer (< 15 min): up to 45 penalty points
        const penalty = 30 + Math.max(0, 15 - buffer);
        bufferPenalty = Math.max(bufferPenalty, penalty);

        factors.push({
          code: 'SUB_15_MIN_TRANSFER',
          severity: 'CRITICAL',
          description: `Tight ${buffer}-min transfer at ${currentLeg.names.destinationName} between ${currentLeg.names.lineCode || currentLeg.transportType} and ${nextLeg.names.lineCode || nextLeg.transportType}.`,
          affectedLegIndex: i,
        });
      } else if (buffer < targetMin) {
        // Moderate buffer (15 - 24 min): 10 to 20 penalty points
        const deficit = targetMin - buffer;
        const penalty = 10 + (deficit / 10) * 10;
        bufferPenalty = Math.max(bufferPenalty, penalty);

        factors.push({
          code: 'SUB_15_MIN_TRANSFER',
          severity: 'WARNING',
          description: `Transfer buffer of ${buffer} min at ${currentLeg.names.destinationName} is below the 25-min shield recommendation.`,
          affectedLegIndex: i,
        });
      }
    }
  }

  // 3. Disruption and operational hazard penalties (0 to 20 points)
  let disruptionPenalty = 0;

  legs.forEach((leg, index) => {
    // Check known route hazards
    if (leg.transportType === 'TRAIN' && (leg.names.originCity === 'Galați' || leg.names.destinationCity === 'Galați')) {
      factors.push({
        code: 'SINGLE_TRACK_RAIL',
        severity: 'INFO',
        description: 'Single-track railway segment on Galați-Făurei branch.',
        affectedLegIndex: index,
      });
      disruptionPenalty += 3;
    }

    if (leg.risk?.disruptions) {
      leg.risk.disruptions.forEach((d) => {
        if (d.severity === 'CRITICAL') {
          disruptionPenalty += 20;
          factors.push({
            code: 'CARRIER_CHRONIC_DELAY',
            severity: 'CRITICAL',
            description: d.headline,
            affectedLegIndex: index,
          });
        } else if (d.severity === 'WARNING') {
          disruptionPenalty += 10;
          factors.push({
            code: 'CARRIER_CHRONIC_DELAY',
            severity: 'WARNING',
            description: d.headline,
            affectedLegIndex: index,
          });
        } else {
          disruptionPenalty += 3;
        }
      });
    }
  });

  disruptionPenalty = Math.min(30, disruptionPenalty);

  // 4. Overall composite risk score (0 to 100)
  const rawScore = punctualityPenalty + bufferPenalty + disruptionPenalty;
  const overallRiskScore = Math.round(Math.max(0, Math.min(100, rawScore)));

  // 5. Risk Level classification
  let riskLevel: RiskLevel = 'LOW';
  if (overallRiskScore > 70) {
    riskLevel = 'CRITICAL';
  } else if (overallRiskScore > 45) {
    riskLevel = 'HIGH';
  } else if (overallRiskScore > 20) {
    riskLevel = 'MODERATE';
  }

  // 6. Tightest buffer and buffer adequacy
  const tightestBufferMinutes =
    transferBuffers.length > 0 ? Math.min(...transferBuffers) : 999;

  let bufferAdequacy: BufferAdequacy = 'GENEROUS';
  if (tightestBufferMinutes < ROMANIAN_TRANSFER_SHIELD.TIGHT_BUFFER_MINUTES) {
    bufferAdequacy = 'INSUFFICIENT';
  } else if (tightestBufferMinutes < ROMANIAN_TRANSFER_SHIELD.RECOMMENDED_BUFFER_MINUTES) {
    bufferAdequacy = 'TIGHT';
  } else if (tightestBufferMinutes < ROMANIAN_TRANSFER_SHIELD.GENEROUS_BUFFER_MINUTES) {
    bufferAdequacy = 'OPTIMAL';
  }

  // 7. Natural language summary text
  let riskSummaryText = '';
  if (legs.length === 1) {
    riskSummaryText = 'Direct journey with zero connection risk.';
  } else if (bufferAdequacy === 'GENEROUS' || bufferAdequacy === 'OPTIMAL') {
    riskSummaryText = `Shielded connection: ${tightestBufferMinutes}-min transfer buffer safely absorbs standard Romanian transit delays.`;
  } else if (bufferAdequacy === 'TIGHT') {
    riskSummaryText = `Caution: tight ${tightestBufferMinutes}-min transfer buffer. Keep pace when changing platforms.`;
  } else {
    riskSummaryText = `High connection risk: ${tightestBufferMinutes}-min transfer is below safe margins; delay on arrival will break connection.`;
  }

  return {
    overallRiskScore,
    riskLevel,
    historicalPunctualityRate: Number(avgPunctuality.toFixed(2)),
    tightestBufferMinutes,
    bufferAdequacy,
    riskSummaryText,
    factors,
  };
};
