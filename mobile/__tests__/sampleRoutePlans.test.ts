import {
  SAMPLE_ROUTE_PLAN_MICRO19_TO_PIATA_UNIRII,
  SAMPLE_ROUTE_PLAN_BUCHAREST_TO_BRASOV,
  SAMPLE_ROUTE_PLANS,
} from '../src/data/sampleRoutePlans';
import { TransitRoutePlan } from '../src/types/routePlan';

describe('Standardized TransitRoutePlan contract conformance', () => {
  it('contains valid canonical sample route plans', () => {
    expect(SAMPLE_ROUTE_PLANS.length).toBeGreaterThanOrEqual(2);
  });

  describe('Micro 19 (Galați) ➔ Piața Unirii (București) multi-modal plan', () => {
    const plan: TransitRoutePlan = SAMPLE_ROUTE_PLAN_MICRO19_TO_PIATA_UNIRII;

    it('enforces mandatory top-level itinerary fields', () => {
      expect(plan.id).toBeDefined();
      expect(plan.summary).toContain('Transurb');
      expect(plan.summary).toContain('CFR');
      expect(plan.summary).toContain('Metrorex');
      expect(plan.totalDurationMinutes).toBeGreaterThan(0);
      expect(plan.transfersCount).toBe(2);
      expect(plan.legs.length).toBe(3);
    });

    it('enforces mandatory coordinates on all stops and GeoJSON line geometry', () => {
      plan.legs.forEach((leg) => {
        // Origin coords
        expect(leg.coords.originCoords.latitude).toBeGreaterThan(40);
        expect(leg.coords.originCoords.longitude).toBeGreaterThan(20);

        // Destination coords
        expect(leg.coords.destinationCoords.latitude).toBeGreaterThan(40);
        expect(leg.coords.destinationCoords.longitude).toBeGreaterThan(20);

        // GeoJSON geometry LineString [longitude, latitude]
        expect(leg.coords.geometry.type).toBe('LineString');
        expect(leg.coords.geometry.coordinates.length).toBeGreaterThanOrEqual(2);
        leg.coords.geometry.coordinates.forEach(([lng, lat]) => {
          expect(typeof lng).toBe('number');
          expect(typeof lat).toBe('number');
          expect(lng).toBeGreaterThan(20); // Romanian longitude range ~20-30°E
          expect(lat).toBeGreaterThan(43); // Romanian latitude range ~43-48°N
        });
      });
    });

    it('enforces mandatory naming hierarchy across every leg', () => {
      plan.legs.forEach((leg) => {
        expect(leg.names.originName).toBeTruthy();
        expect(leg.names.originCity).toBeTruthy();
        expect(leg.names.destinationName).toBeTruthy();
        expect(leg.names.destinationCity).toBeTruthy();
        expect(leg.names.operatorName).toBeTruthy();
      });

      // Specific operator verification
      expect(plan.legs[0].names.operatorName).toContain('Transurb');
      expect(plan.legs[1].names.operatorName).toContain('CFR');
      expect(plan.legs[2].names.operatorName).toContain('Metrorex');
    });

    it('enforces mandatory transportation types', () => {
      expect(plan.legs[0].transportType).toBe('BUS');
      expect(plan.legs[1].transportType).toBe('TRAIN');
      expect(plan.legs[2].transportType).toBe('METRO');
    });

    it('enforces mandatory risk scores at route and leg level', () => {
      expect(plan.riskAnalysis.overallRiskScore).toBeGreaterThanOrEqual(0);
      expect(plan.riskAnalysis.overallRiskScore).toBeLessThanOrEqual(100);
      expect(plan.riskAnalysis.riskLevel).toBe('LOW');
      expect(plan.riskAnalysis.bufferAdequacy).toBe('OPTIMAL');
      expect(plan.riskAnalysis.tightestBufferMinutes).toBe(20);

      plan.legs.forEach((leg) => {
        expect(leg.risk.legRiskScore).toBeGreaterThanOrEqual(0);
        expect(leg.risk.legRiskScore).toBeLessThanOrEqual(100);
        expect(leg.risk.historicalPunctualityPercent).toBeGreaterThan(0);
      });
    });

    it('includes rich feature extensions (eco benchmark & fare summary)', () => {
      expect(plan.fare.totalAmountLei).toBe(69.00);
      expect(plan.fare.legFares.length).toBe(3);
      expect(plan.eco.savedKgCO2).toBeGreaterThan(0);
      expect(plan.eco.percentageSaved).toBeGreaterThanOrEqual(50);
    });
  });

  describe('București Nord ➔ Gara Brașov direct corridor plan', () => {
    const plan: TransitRoutePlan = SAMPLE_ROUTE_PLAN_BUCHAREST_TO_BRASOV;

    it('enforces direct train corridor specifications', () => {
      expect(plan.transfersCount).toBe(0);
      expect(plan.legs.length).toBe(1);
      expect(plan.legs[0].transportType).toBe('TRAIN');
      expect(plan.legs[0].names.lineCode).toBe('IR 1631');
      expect(plan.riskAnalysis.overallRiskScore).toBeLessThanOrEqual(15);
      expect(plan.riskAnalysis.bufferAdequacy).toBe('GENEROUS');
    });
  });
});
