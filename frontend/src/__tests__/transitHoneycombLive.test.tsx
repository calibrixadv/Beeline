import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import { TransitHoneycombSection } from '../components/hive-tour/TransitHoneycombSection';
import { apiClient } from '../services/apiClient';

describe('TransitHoneycombSection Live Binding', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders initial fallback state immediately with zero layout shift', () => {
    jest.spyOn(apiClient, 'getOperatorsSummary').mockReturnValue(new Promise(() => {}));
    const { container } = render(<TransitHoneycombSection />);

    expect(screen.getByRole('heading', { level: 2, name: /Romanian Rail Network/i })).toBeInTheDocument();
    expect(screen.getByText(/2,103 trains\/day/i)).toBeInTheDocument();
    expect(screen.getByText(/709 routes/i)).toBeInTheDocument();
    expect(screen.getAllByText('CFR Călători').length).toBeGreaterThan(0);
    expect(container.querySelectorAll('.leaflet-container, canvas, map').length).toBe(0);
  });

  it('updates dynamically when live operators summary arrives', async () => {
    const liveData = {
      totalDailyTrains: 2200,
      totalRoutes: 750,
      operatorCount: 7,
      updatedAt: '2026-11-20T10:30:00+00:00',
      source: 'OFFICIAL_XML_LIVE',
      operators: [
        { id: 'cfr', shortName: 'CFR', name: 'CFR Călători', dailyTrains: 1300, routes: 500 },
        { id: 'tfc', shortName: 'TFC', name: 'Transferoviar Călători', dailyTrains: 320, routes: 70 },
        { id: 'regio', shortName: 'Regio', name: 'Regio Călători', dailyTrains: 290, routes: 85 },
        { id: 'interregional', shortName: 'Interregional', name: 'Interregional Călători', dailyTrains: 220, routes: 60 },
        { id: 'astra', shortName: 'Astra', name: 'Astra Trans Carpatic', dailyTrains: 30, routes: 15 },
        { id: 'ferotrafic', shortName: 'Ferotrafic', name: 'Ferotrafic TFI', dailyTrains: 22, routes: 12 },
        { id: 'softrans', shortName: 'Softrans', name: 'Softrans', dailyTrains: 18, routes: 8 },
      ],
    };

    jest.spyOn(apiClient, 'getOperatorsSummary').mockResolvedValue(liveData);
    render(<TransitHoneycombSection />);

    await waitFor(() => {
      expect(screen.getByText(/2,200 trains\/day/i)).toBeInTheDocument();
      expect(screen.getByText(/750 routes/i)).toBeInTheDocument();
      expect(screen.getByText(/1,300 \/ day/i)).toBeInTheDocument();
      expect(screen.getByText(/500 routes/i)).toBeInTheDocument();
    });
  });

  it('keeps selectedId valid or defaults to first operator if selected is not in new list', async () => {
    const liveData = {
      totalDailyTrains: 500,
      totalRoutes: 150,
      operatorCount: 2,
      updatedAt: '2026-11-20T10:30:00+00:00',
      source: 'OFFICIAL_XML_LIVE',
      operators: [
        { id: 'tfc', shortName: 'TFC', name: 'Transferoviar Călători', dailyTrains: 350, routes: 100 },
        { id: 'regio', shortName: 'Regio', name: 'Regio Călători', dailyTrains: 150, routes: 50 },
      ],
    };

    jest.spyOn(apiClient, 'getOperatorsSummary').mockResolvedValue(liveData);
    render(<TransitHoneycombSection />);

    await waitFor(() => {
      expect(screen.getByText(/350 \/ day/i)).toBeInTheDocument();
      expect(screen.getByText(/100 routes/i)).toBeInTheDocument();
    });
  });

  it('recovers gracefully and retains fallback if API rejects', async () => {
    jest.spyOn(apiClient, 'getOperatorsSummary').mockRejectedValue(new Error('Network error'));
    render(<TransitHoneycombSection />);

    expect(screen.getByText(/2,103 trains\/day/i)).toBeInTheDocument();
    expect(screen.getByText(/709 routes/i)).toBeInTheDocument();
    expect(screen.getAllByText('CFR Călători').length).toBeGreaterThan(0);
  });
});
