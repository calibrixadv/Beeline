import {
  formatInfoferDate,
  extractTrainDigits,
  buildInfoferTrainUrl,
  buildOfficialTicketUrl,
  buildCarrierTicketUrl,
  buildLegTrainLinks,
} from '../utils/officialTicketUrl';

describe('officialTicketUrl utility', () => {
  describe('formatInfoferDate', () => {
    it('formats YYYY-MM-DD into DD.MM.YYYY', () => {
      expect(formatInfoferDate('2026-11-21')).toBe('21.11.2026');
      expect(formatInfoferDate('2026-01-05')).toBe('05.01.2026');
    });

    it('extracts and formats date from ISO timestamp', () => {
      expect(formatInfoferDate('2026-11-21T08:30:00.000Z')).toBe('21.11.2026');
      expect(formatInfoferDate('2026-12-31T23:59:59')).toBe('31.12.2026');
    });

    it('returns already formatted DD.MM.YYYY unchanged', () => {
      expect(formatInfoferDate('21.11.2026')).toBe('21.11.2026');
    });

    it('falls back to today DD.MM.YYYY when date is empty or undefined', () => {
      const formatted = formatInfoferDate();
      expect(formatted).toMatch(/^\d{2}\.\d{2}\.\d{4}$/);
    });
  });

  describe('extractTrainDigits', () => {
    it('extracts numeric digits from various Romanian train designations', () => {
      expect(extractTrainDigits('IR 1572')).toBe('1572');
      expect(extractTrainDigits('R-E 10061')).toBe('10061');
      expect(extractTrainDigits('IC 531')).toBe('531');
      expect(extractTrainDigits('R 2081')).toBe('2081');
      expect(extractTrainDigits('1682')).toBe('1682');
    });

    it('returns empty string when no digits are present or undefined', () => {
      expect(extractTrainDigits('METRO')).toBe('');
      expect(extractTrainDigits('')).toBe('');
      expect(extractTrainDigits(undefined)).toBe('');
    });
  });

  describe('buildInfoferTrainUrl', () => {
    it('generates direct InfoFer train page URL for train code and date', () => {
      const url = buildInfoferTrainUrl('IR 1572', '2026-11-21');
      expect(url).toBe('https://mersultrenurilor.infofer.ro/ro-RO/Tren/1572?Date=21.11.2026');
    });

    it('handles parameter object and ISO date timestamps', () => {
      const url = buildInfoferTrainUrl({
        trainNumber: 'R-E 10061',
        travelDate: '2026-11-21T07:15:00Z',
      });
      expect(url).toBe('https://mersultrenurilor.infofer.ro/ro-RO/Tren/10061?Date=21.11.2026');
    });
  });

  describe('buildOfficialTicketUrl (InfoFer specific train & route search)', () => {
    it('generates direct InfoFer train URL when trainNumber is specified (direct single-train journeys)', () => {
      const url = buildOfficialTicketUrl({
        trainNumber: 'IR 1572',
        origin: 'Galați',
        destination: 'București Nord',
        travelDate: '2026-11-21',
      });

      expect(url).toBe('https://mersultrenurilor.infofer.ro/ro-RO/Tren/1572?Date=21.11.2026');
    });

    it('generates direct InfoFer train URL for regional express train', () => {
      const url = buildOfficialTicketUrl({
        trainNumber: 'R-E 10061',
        travelDate: '2026-12-05',
      });

      expect(url).toBe('https://mersultrenurilor.infofer.ro/ro-RO/Tren/10061?Date=05.12.2026');
    });

    it('falls back to route search URL when trainNumber is omitted', () => {
      const url = buildOfficialTicketUrl({
        origin: 'Galați',
        destination: 'București Nord',
        travelDate: '2026-11-21',
      });

      expect(url).toContain('https://mersultrenurilor.infofer.ro/ro-RO/Itineraries?');
      expect(url).toContain('DepartureDate=21.11.2026');
      expect(url).toContain(`DepartureStationName=${encodeURIComponent('Galați')}`);
      expect(url).toContain(`ArrivalStationName=${encodeURIComponent('București Nord')}`);
    });

    it('handles station names with Romanian diacritics in fallback route search', () => {
      const url = buildOfficialTicketUrl({
        origin: 'Brașov',
        destination: 'Cluj-Napoca',
        travelDate: '2026-12-01',
      });

      expect(url).toContain(`DepartureStationName=${encodeURIComponent('Brașov')}`);
      expect(url).toContain(`ArrivalStationName=${encodeURIComponent('Cluj-Napoca')}`);
      expect(url).toContain('DepartureDate=01.12.2026');
    });
  });

  describe('buildCarrierTicketUrl', () => {
    it('generates direct CFR Călători purchase URL when operator is CFR Călători', () => {
      const url = buildCarrierTicketUrl({
        origin: 'București Nord',
        destination: 'Brașov',
        travelDate: '2026-11-21',
        operator: 'CFR Călători',
      });

      expect(url).toContain('https://bilete.cfrcalatori.ro/ro-RO/Itineraries/?');
      expect(url).toContain(`DepartureStationName=${encodeURIComponent('București Nord')}`);
      expect(url).toContain(`ArrivalStationName=${encodeURIComponent('Brașov')}`);
      expect(url).toContain('DepartureDate=21.11.2026');
      expect(url).toContain('TimeSelectionId=0&MinutesInDay=0&OrderingTypeId=0&ConnectionsTypeId=1');
    });

    it('generates direct CFR Călători URL when operator shorthand CFR is used', () => {
      const url = buildCarrierTicketUrl({
        origin: 'București Nord',
        destination: 'Constanța',
        travelDate: '2026-11-21',
        operator: 'CFR',
      });

      expect(url).toContain('https://bilete.cfrcalatori.ro/ro-RO/Itineraries/?');
    });

    it('generates direct TFC online purchase URL when operator is Transferoviar Călători / TFC', () => {
      const urlTfc = buildCarrierTicketUrl({
        origin: 'București Nord',
        destination: 'Galați',
        travelDate: '2026-11-21',
        operator: 'Transferoviar Călători',
      });

      expect(urlTfc).toContain('https://bilete.tfc-online.ro/ro-RO/Itineraries/?');
      expect(urlTfc).toContain(`DepartureStationName=${encodeURIComponent('București Nord')}`);
      expect(urlTfc).toContain(`ArrivalStationName=${encodeURIComponent('Galați')}`);
      expect(urlTfc).toContain('DepartureDate=21.11.2026');
    });

    it('falls back cleanly to official Mersul Trenurilor for other carriers or unspecified operator', () => {
      const urlRegio = buildCarrierTicketUrl({
        origin: 'Brașov',
        destination: 'Gheorgheni',
        travelDate: '2026-11-21',
        operator: 'Regio Călători',
        trainNumber: 'R 2081',
      });

      expect(urlRegio).toBe('https://mersultrenurilor.infofer.ro/ro-RO/Tren/2081?Date=21.11.2026');

      const urlAstra = buildCarrierTicketUrl({
        origin: 'București Nord',
        destination: 'Arad',
        travelDate: '2026-11-21',
        operator: 'Astra Trans Carpatic',
        trainNumber: 'IR 1551',
      });

      expect(urlAstra).toBe('https://mersultrenurilor.infofer.ro/ro-RO/Tren/1551?Date=21.11.2026');

      const urlNone = buildCarrierTicketUrl({
        origin: 'București Nord',
        destination: 'Brașov',
        travelDate: '2026-11-21',
      });

      expect(urlNone).toContain('https://mersultrenurilor.infofer.ro/ro-RO/Itineraries?');
    });
  });

  describe('buildLegTrainLinks (multi-leg transfer journeys)', () => {
    it('generates individual per-leg train links for multi-leg transfer journeys', () => {
      const multiLegPlan = {
        date: '2026-11-21',
        legs: [
          {
            legIndex: 0,
            transportType: 'TRAIN',
            names: {
              lineCode: 'IR 1732',
              operatorName: 'CFR Călători',
              originName: 'Galați',
              destinationName: 'Ploiești Sud',
            },
          },
          {
            legIndex: 1,
            transportType: 'TRAIN',
            names: {
              lineCode: 'R-E 10061',
              operatorName: 'Regio Călători',
              originName: 'Ploiești Sud',
              destinationName: 'Brașov',
            },
          },
        ],
      };

      const links = buildLegTrainLinks(multiLegPlan);
      expect(links).toHaveLength(2);

      expect(links[0]).toEqual({
        legIndex: 0,
        trainCode: 'IR 1732',
        operator: 'CFR Călători',
        originName: 'Galați',
        destinationName: 'Ploiești Sud',
        url: 'https://mersultrenurilor.infofer.ro/ro-RO/Tren/1732?Date=21.11.2026',
      });

      expect(links[1]).toEqual({
        legIndex: 1,
        trainCode: 'R-E 10061',
        operator: 'Regio Călători',
        originName: 'Ploiești Sud',
        destinationName: 'Brașov',
        url: 'https://mersultrenurilor.infofer.ro/ro-RO/Tren/10061?Date=21.11.2026',
      });
    });

    it('filters out non-rail legs like WALK or METRO and keeps rail legs', () => {
      const mixedPlan = {
        travelDate: '2026-11-22',
        legs: [
          {
            legIndex: 0,
            transportType: 'WALK',
            names: { originName: 'Platform 1', destinationName: 'Platform 3' },
          },
          {
            legIndex: 1,
            transportType: 'TRAIN',
            names: {
              lineCode: 'IR 1572',
              operatorName: 'CFR Călători',
              originName: 'Galați',
              destinationName: 'București Nord',
            },
          },
        ],
      };

      const links = buildLegTrainLinks(mixedPlan);
      expect(links).toHaveLength(1);
      expect(links[0].trainCode).toBe('IR 1572');
      expect(links[0].url).toBe('https://mersultrenurilor.infofer.ro/ro-RO/Tren/1572?Date=22.11.2026');
    });

    it('handles direct single journey object gracefully', () => {
      const singleJourney = {
        trainNumber: 'IC 531',
        operator: 'CFR Călători',
        origin: { name: 'București Nord' },
        destination: { name: 'Cluj-Napoca' },
        departureTime: '2026-11-23T06:00:00Z',
      };

      const links = buildLegTrainLinks(singleJourney);
      expect(links).toHaveLength(1);
      expect(links[0].trainCode).toBe('IC 531');
      expect(links[0].url).toBe('https://mersultrenurilor.infofer.ro/ro-RO/Tren/531?Date=23.11.2026');
    });
  });
});
