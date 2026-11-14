import { 
  calculateRouteRisk, 
  getCarrierPunctualityDefault,
  ROMANIAN_TRANSFER_SHIELD,
  OPERATOR_PUNCTUALITY_BENCHMARKS 
} from '../services/riskScoreCalculator';
import {
  apiClient,
  formatExpectedDelay,
  formatConnectionGuarantee,
  formatExpectedDelayBadge,
  formatConnectionGuaranteeBadge,
} from '../services/apiClient';

describe('riskScoreCalculator (Romanian Transfer Shield)', () => {
  it('correctly provides operator punctuality defaults', () => {
    expect(getCarrierPunctualityDefault('Metrorex')).toBe(0.98);
    expect(getCarrierPunctualityDefault('CFR Călători')).toBe(0.82);
    expect(getCarrierPunctualityDefault('Astra Trans Carpatic')).toBe(0.90);
    expect(getCarrierPunctualityDefault('Unknown Operator')).toBe(0.88);
  });

  it('declares valid transfer shield buffer constants', () => {
    expect(ROMANIAN_TRANSFER_SHIELD.RECOMMENDED_BUFFER_MINUTES).toBe(20);
    expect(ROMANIAN_TRANSFER_SHIELD.GENEROUS_BUFFER_MINUTES).toBe(35);
    expect(ROMANIAN_TRANSFER_SHIELD.TIGHT_BUFFER_MINUTES).toBe(15);
  });

  it('calculates risk analysis for direct single-leg trips', () => {
    const analysis = calculateRouteRisk({
      legs: [
        {
          transportType: 'TRAIN',
          names: {
            originName: 'Galați',
            originCity: 'Galați',
            destinationName: 'București Nord',
            destinationCity: 'București',
            operatorName: 'CFR Călători',
          },
          risk: {
            legRiskScore: 18,
            historicalPunctualityPercent: 82,
            isShieldedBuffer: true,
            disruptions: [],
          },
        },
      ],
    });

    expect(analysis.overallRiskScore).toBeLessThan(40);
    expect(analysis.riskLevel).toBe('LOW');
    expect(analysis.riskSummaryText).toBeDefined();
    expect(analysis.bufferAdequacy).toBe('GENEROUS');
    expect(analysis.expectedDelayMinutes).toBe(0);
    expect(analysis.missedConnectionProbability).toBe(0.05);
    expect(analysis.isMlComputed).toBe(false);
    expect(Array.isArray(analysis.riskFactors)).toBe(true);
  });

  it('populates default offline fallback properties for empty legs', () => {
    const analysis = calculateRouteRisk({ legs: [] });
    expect(analysis.overallRiskScore).toBe(0);
    expect(analysis.riskLevel).toBe('LOW');
    expect(analysis.expectedDelayMinutes).toBe(0);
    expect(analysis.missedConnectionProbability).toBe(0.0);
    expect(analysis.isMlComputed).toBe(false);
    expect(analysis.riskFactors).toEqual([]);
  });

  it('calculates risk analysis for connecting multi-leg trips with tight buffers', () => {
    const analysis = calculateRouteRisk({
      legs: [
        {
          transportType: 'TRAIN',
          names: {
            originName: 'Galați',
            originCity: 'Galați',
            destinationName: 'București Nord',
            destinationCity: 'București',
            operatorName: 'CFR Călători',
          },
          risk: {
            legRiskScore: 35,
            historicalPunctualityPercent: 78,
            isShieldedBuffer: false,
            transferBufferAfterMinutes: 10,
            disruptions: [
              {
                id: 'disrupt-001',
                severity: 'WARNING',
                headline: 'Single-track work',
                description: 'Single-track maintenance in progress',
              },
            ],
          },
        },
        {
          transportType: 'METRO',
          names: {
            originName: 'Gara de Nord 1',
            originCity: 'București',
            destinationName: 'Piața Unirii',
            destinationCity: 'București',
            operatorName: 'Metrorex',
          },
          risk: {
            legRiskScore: 5,
            historicalPunctualityPercent: 98,
            isShieldedBuffer: true,
            disruptions: [],
          },
        },
      ],
    });

    expect(analysis.tightestBufferMinutes).toBe(10);
    expect(analysis.bufferAdequacy).toBe('INSUFFICIENT');
    expect(analysis.isMlComputed).toBe(false);
    expect(analysis.expectedDelayMinutes).toBe(0);
    expect(analysis.missedConnectionProbability).toBe(0.05);
    expect(analysis.factors.length).toBeGreaterThanOrEqual(1);
  });
});

describe('apiClient ML risk formatting & deserialization helpers', () => {
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

  it('handles backend API errors gracefully when planRoute fails', async () => {
    const originalFetch = global.fetch;
    global.fetch = jest.fn().mockImplementation(() =>
      Promise.resolve({
        ok: false,
        status: 400,
        json: () =>
          Promise.resolve({
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid origin station',
            },
          }),
      } as any)
    );

    await expect(
      apiClient.planRoute({
        origin: { name: 'Invalid Station' },
        destination: { name: 'București' },
        allowedModes: ['TRAIN'],
        optimizationPreference: 'FASTEST',
      })
    ).rejects.toThrow('Failed to compute route plan');

    global.fetch = originalFetch;
  });
});
