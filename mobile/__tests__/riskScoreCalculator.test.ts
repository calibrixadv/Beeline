import {
  calculateRouteRisk,
  getCarrierPunctualityDefault,
  ROMANIAN_TRANSFER_SHIELD,
} from '../src/services/riskScoreCalculator';
import {
  apiClient,
  formatExpectedDelay,
  formatConnectionGuarantee,
  formatExpectedDelayBadge,
  formatConnectionGuaranteeBadge,
} from '../src/services/apiClient';
import { TransitLeg } from '../src/types/routePlan';

describe('riskScoreCalculator (The Romanian Transfer Shield Engine)', () => {
  it('exposes the standard Romanian Transfer Shield threshold constants', () => {
    expect(ROMANIAN_TRANSFER_SHIELD.RECOMMENDED_BUFFER_MINUTES).toBe(20);
    expect(ROMANIAN_TRANSFER_SHIELD.GENEROUS_BUFFER_MINUTES).toBe(35);
    expect(ROMANIAN_TRANSFER_SHIELD.TIGHT_BUFFER_MINUTES).toBe(15);
  });

  it('evaluates direct journeys as low risk with zero connection hazards', () => {
    const directLeg: Pick<TransitLeg, 'transportType' | 'names' | 'risk'> = {
      transportType: 'TRAIN',
      names: {
        originName: 'București Nord',
        originCity: 'București',
        destinationName: 'Gara Brașov',
        destinationCity: 'Brașov',
        operatorName: 'CFR Călători',
      },
      risk: {
        legRiskScore: 7,
        historicalPunctualityPercent: 90.0,
        isShieldedBuffer: true,
        disruptions: [],
      },
    };

    const risk = calculateRouteRisk({ legs: [directLeg] });

    expect(risk.overallRiskScore).toBeLessThanOrEqual(20);
    expect(risk.riskLevel).toBe('LOW');
    expect(risk.tightestBufferMinutes).toBe(999);
    expect(risk.bufferAdequacy).toBe('GENEROUS');
    expect(risk.riskSummaryText).toContain('Direct journey');
    expect(risk.factors.length).toBe(0);
  });

  it('evaluates multi-modal routes with optimal transfer buffers (Micro 19 ➔ Piața Unirii)', () => {
    const legs: Pick<TransitLeg, 'transportType' | 'names' | 'risk'>[] = [
      {
        transportType: 'BUS',
        names: {
          originName: 'Micro 19',
          originCity: 'Galați',
          destinationName: 'Gara CFR Galați',
          destinationCity: 'Galați',
          operatorName: 'Transurb S.A. Galați',
        },
        risk: {
          legRiskScore: 8,
          historicalPunctualityPercent: 94.0,
          transferBufferAfterMinutes: 28,
          isShieldedBuffer: true,
          disruptions: [],
        },
      },
      {
        transportType: 'TRAIN',
        names: {
          originName: 'Gara Galați',
          originCity: 'Galați',
          destinationName: 'București Nord',
          destinationCity: 'București',
          operatorName: 'CFR Călători',
        },
        risk: {
          legRiskScore: 18,
          historicalPunctualityPercent: 87.0,
          transferBufferAfterMinutes: 20,
          isShieldedBuffer: true,
          disruptions: [],
        },
      },
      {
        transportType: 'METRO',
        names: {
          originName: 'Gara de Nord 1',
          originCity: 'București',
          destinationName: 'Piața Unirii',
          destinationCity: 'București',
          operatorName: 'Metrorex S.A.',
        },
        risk: {
          legRiskScore: 3,
          historicalPunctualityPercent: 98.5,
          isShieldedBuffer: true,
          disruptions: [],
        },
      },
    ];

    const risk = calculateRouteRisk({ legs });

    expect(risk.tightestBufferMinutes).toBe(20);
    expect(risk.bufferAdequacy).toBe('OPTIMAL');
    expect(risk.riskLevel).toBe('LOW');
    expect(risk.historicalPunctualityRate).toBeGreaterThanOrEqual(0.9);
    expect(risk.riskSummaryText).toContain('Shielded connection');
  });

  it('flags tight sub-15 minute transfers as critical connection risks', () => {
    const tightLegs: Pick<TransitLeg, 'transportType' | 'names' | 'risk'>[] = [
      {
        transportType: 'TRAIN',
        names: {
          originName: 'Gara Brașov',
          originCity: 'Brașov',
          destinationName: 'Ploiești Vest',
          destinationCity: 'Ploiești',
          operatorName: 'CFR Călători',
        },
        risk: {
          legRiskScore: 25,
          historicalPunctualityPercent: 80.0,
          transferBufferAfterMinutes: 8, // Dangerous 8-min buffer for rail transfer!
          isShieldedBuffer: false,
          disruptions: [],
        },
      },
      {
        transportType: 'TRAIN',
        names: {
          originName: 'Ploiești Vest',
          originCity: 'Ploiești',
          destinationName: 'Iași',
          destinationCity: 'Iași',
          operatorName: 'CFR Călători',
        },
        risk: {
          legRiskScore: 15,
          historicalPunctualityPercent: 82.0,
          isShieldedBuffer: true,
          disruptions: [],
        },
      },
    ];

    const risk = calculateRouteRisk({ legs: tightLegs });

    expect(risk.tightestBufferMinutes).toBe(8);
    expect(risk.bufferAdequacy).toBe('INSUFFICIENT');
    expect(risk.overallRiskScore).toBeGreaterThanOrEqual(45);
    expect(['HIGH', 'CRITICAL']).toContain(risk.riskLevel);
    expect(risk.factors.some((f) => f.code === 'SUB_15_MIN_TRANSFER')).toBe(true);
    expect(risk.riskSummaryText).toContain('High connection risk');
  });

  it('incorporates active disruptions into risk calculation', () => {
    const disruptedLegs: Pick<TransitLeg, 'transportType' | 'names' | 'risk'>[] = [
      {
        transportType: 'TRAIN',
        names: {
          originName: 'București Nord',
          originCity: 'București',
          destinationName: 'Constanța',
          destinationCity: 'Constanța',
          operatorName: 'CFR Călători',
        },
        risk: {
          legRiskScore: 40,
          historicalPunctualityPercent: 80.0,
          transferBufferAfterMinutes: 30,
          isShieldedBuffer: true,
          disruptions: [
            {
              id: 'disrupt-cernavoda-1',
              severity: 'CRITICAL',
              headline: 'Power line failure at Cernavodă bridge',
              description: 'Trains held at Saligny',
              estimatedDelayMinutes: 45,
            },
          ],
        },
      },
      {
        transportType: 'BUS',
        names: {
          originName: 'Gara Constanța',
          originCity: 'Constanța',
          destinationName: 'Mamaia Cazino',
          destinationCity: 'Constanța',
          operatorName: 'CT BUS Constanța',
        },
        risk: {
          legRiskScore: 10,
          historicalPunctualityPercent: 92.0,
          isShieldedBuffer: true,
          disruptions: [],
        },
      },
    ];

    const risk = calculateRouteRisk({ legs: disruptedLegs });

    expect(risk.overallRiskScore).toBeGreaterThanOrEqual(30);
    expect(risk.factors.some((f) => f.code === 'CARRIER_CHRONIC_DELAY')).toBe(true);
  });

  it('correctly maps operator punctuality defaults', () => {
    expect(getCarrierPunctualityDefault('Metrorex S.A.')).toBe(0.98);
    expect(getCarrierPunctualityDefault('Transurb Galați')).toBe(0.93);
    expect(getCarrierPunctualityDefault('CFR Călători')).toBe(0.82);
    expect(getCarrierPunctualityDefault('Unknown Operator')).toBe(0.88);
  });

  it('handles empty leg list safely', () => {
    const risk = calculateRouteRisk({ legs: [] });
    expect(risk.overallRiskScore).toBe(0);
    expect(risk.riskLevel).toBe('LOW');
    expect(risk.expectedDelayMinutes).toBe(0);
    expect(risk.missedConnectionProbability).toBe(0.0);
    expect(risk.isMlComputed).toBe(false);
    expect(risk.riskFactors).toEqual([]);
  });

  it('populates default offline fallback properties for multi-leg journeys', () => {
    const directLeg: Pick<TransitLeg, 'transportType' | 'names' | 'risk'> = {
      transportType: 'TRAIN',
      names: {
        originName: 'București Nord',
        originCity: 'București',
        destinationName: 'Gara Brașov',
        destinationCity: 'Brașov',
        operatorName: 'CFR Călători',
      },
      risk: {
        legRiskScore: 7,
        historicalPunctualityPercent: 90.0,
        transferBufferAfterMinutes: 20,
        isShieldedBuffer: true,
        disruptions: [],
      },
    };

    const risk = calculateRouteRisk({ legs: [directLeg, directLeg] });
    expect(risk.expectedDelayMinutes).toBe(0);
    expect(risk.missedConnectionProbability).toBe(0.05);
    expect(risk.isMlComputed).toBe(false);
    expect(Array.isArray(risk.riskFactors)).toBe(true);
  });
});

describe('mobile apiClient ML risk formatting & deserialization helpers', () => {
  it('formats expected delay correctly into UI pill labels', () => {
    expect(formatExpectedDelay(undefined)).toBe('On Time');
    expect(formatExpectedDelay(0)).toBe('On Time');
    expect(formatExpectedDelay(-2)).toBe('On Time');
    expect(formatExpectedDelay(4)).toBe('+4m expected');
    expect(formatExpectedDelay(5)).toBe('+5m expected');
    expect(formatExpectedDelay(15)).toBe('+15m expected');

    expect(formatExpectedDelayBadge(0)).toBe('✅ On Time');
    expect(formatExpectedDelayBadge(4)).toBe('⏱️ +4m expected delay');
  });

  it('formats connection guarantee percentage from probability', () => {
    expect(formatConnectionGuarantee(undefined)).toBe('100% connection safety');
    expect(formatConnectionGuarantee(0.04)).toBe('96% connection safety');
    expect(formatConnectionGuarantee(0.03, 'connection guarantee')).toBe('97% connection guarantee');
    expect(formatConnectionGuaranteeBadge(0.03)).toBe('🛡️ 97% connection guarantee');
  });

  it('deserializes route plan responses with camelCase, snake_case, or absent ML fields', async () => {
    const originalFetch = global.fetch;
    global.fetch = jest.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            plans: [
              {
                id: 'plan-ml-1',
                riskAnalysis: {
                  overallRiskScore: 12.5,
                  riskLevel: 'LOW',
                  expected_delay_minutes: 4,
                  missed_connection_probability: 0.03,
                  risk_factors: ['Minor junction friction'],
                  is_ml_computed: true,
                },
              },
              {
                id: 'plan-legacy-2',
                riskAnalysis: {
                  overallRiskScore: 30.0,
                  riskLevel: 'MODERATE',
                },
              },
            ],
            recommendedPlanId: 'plan-ml-1',
            query: { origin: { name: 'Galați' }, destination: { name: 'București' } },
            generatedAt: '2026-11-09T22:00:00Z',
          }),
      } as any)
    );

    const res = await apiClient.planRoute({
      origin: { name: 'Galați' },
      destination: { name: 'București' },
      allowedModes: ['TRAIN', 'BUS'],
      optimizationPreference: 'FASTEST',
    });

    expect(res.plans[0].riskAnalysis.expectedDelayMinutes).toBe(4);
    expect(res.plans[0].riskAnalysis.missedConnectionProbability).toBe(0.03);
    expect(res.plans[0].riskAnalysis.isMlComputed).toBe(true);
    expect(res.plans[0].riskAnalysis.riskFactors).toEqual(['Minor junction friction']);

    // Legacy plan defaults safely
    expect(res.plans[1].riskAnalysis.expectedDelayMinutes).toBe(0);
    expect(res.plans[1].riskAnalysis.missedConnectionProbability).toBe(0.0);
    expect(res.plans[1].riskAnalysis.isMlComputed).toBe(false);
    expect(res.plans[1].riskAnalysis.riskFactors).toEqual([]);

    global.fetch = originalFetch;
  });
});
