import { 
  calculateRouteRisk, 
  getCarrierPunctualityDefault,
  ROMANIAN_TRANSFER_SHIELD,
  OPERATOR_PUNCTUALITY_BENCHMARKS 
} from '../services/riskScoreCalculator';

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
  });
});
