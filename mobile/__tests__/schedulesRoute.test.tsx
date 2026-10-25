import React from 'react';
import { render, fireEvent, waitFor, within } from '@testing-library/react-native';
import SchedulesScreen from '../app/schedules';
import { ThemeProvider } from '../src/context/ThemeContext';
import { TripProvider } from '../src/context/TripContext';

const renderSchedulesScreen = (mode: 'light' | 'dark' = 'light') => {
  return render(
    <ThemeProvider initialMode={mode}>
      <TripProvider>
        <SchedulesScreen />
      </TripProvider>
    </ThemeProvider>
  );
};

describe('SchedulesScreen (/schedules route integration)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders title, section switcher, and default Urban transit lines (Metrorex, Transurb, STB)', async () => {
    const { getByText, getByTestId, getAllByText } = renderSchedulesScreen();

    expect(getByText('Romanian Transit Schedules')).toBeTruthy();
    expect(getByTestId('schedule-section-switcher')).toBeTruthy();
    expect(getByTestId('section-tab-urban')).toBeTruthy();
    expect(getByTestId('section-tab-train')).toBeTruthy();

    await waitFor(() => {
      // Metrorex (Bucharest)
      expect(getByText('M2')).toBeTruthy();
      expect(getAllByText('Metrorex').length).toBeGreaterThan(0);

      // Transurb (Galați)
      expect(getByText('Tram 39')).toBeTruthy();
      expect(getAllByText('Transurb Galați').length).toBeGreaterThan(0);

      // STB (Bucharest)
      expect(getByText('Tram 41')).toBeTruthy();
      expect(getAllByText('STB').length).toBeGreaterThan(0);
    });
  });

  it('toggles section switcher to Intercity Rail and displays Romanian rail operators', async () => {
    const { getByTestId, queryByText, getAllByText } = renderSchedulesScreen();

    const trainTab = getByTestId('section-tab-train');
    fireEvent.press(trainTab);

    await waitFor(() => {
      // Intercity rail operators should be present
      expect(getAllByText('CFR Călători').length).toBeGreaterThan(0);
      expect(getAllByText('Astra Trans Carpatic').length).toBeGreaterThan(0);
      expect(getAllByText('TFC').length).toBeGreaterThan(0);
      expect(getAllByText('Softrans').length).toBeGreaterThan(0);

      // Urban lines should be hidden
      expect(queryByText('M2')).toBeNull();
      expect(queryByText('Tram 39')).toBeNull();
    });
  });

  it('filters Urban transit by location when selecting city Galați', async () => {
    const { getByTestId, getByText, queryByText, getAllByText } = renderSchedulesScreen();

    // Click Galați quick chip
    const galatiChip = getByTestId('city-chip-galați');
    fireEvent.press(galatiChip);

    await waitFor(() => {
      // Transurb Galați lines should be visible
      expect(getByText('Tram 39')).toBeTruthy();
      expect(getByText('Bus 102')).toBeTruthy();
      expect(getAllByText('Transurb Galați').length).toBeGreaterThan(0);

      // Lines from Bucharest should be filtered out
      expect(queryByText('M2')).toBeNull();
      expect(queryByText('Tram 41')).toBeNull();

      // Active filter pill
      expect(getByText('Filtered by location: Galați')).toBeTruthy();
    });
  });

  it('filters by transit mode (TRAM)', async () => {
    const { getByTestId, getByText, queryByText } = renderSchedulesScreen();

    const tramChip = getByTestId('mode-chip-tram');
    fireEvent.press(tramChip);

    await waitFor(() => {
      // Trams should appear
      expect(getByText('Tram 39')).toBeTruthy();
      expect(getByText('Tram 41')).toBeTruthy();

      // Metro and Bus lines should be filtered out
      expect(queryByText('M2')).toBeNull();
      expect(queryByText('Bus 100 Express')).toBeNull();
    });
  });

  it('filters real-time departures via search query', async () => {
    const { getByTestId, getByText, queryByText } = renderSchedulesScreen();

    const searchInput = getByTestId('schedules-search-input');
    fireEvent.changeText(searchInput, 'M2');

    await waitFor(() => {
      expect(getByText('M2')).toBeTruthy();
      expect(queryByText('Tram 39')).toBeNull();
      expect(queryByText('Tram 41')).toBeNull();
    });
  });

  it('shows empty state when no schedules match and resets filters', async () => {
    const { getByTestId, getByText, queryByTestId } = renderSchedulesScreen();

    const searchInput = getByTestId('schedules-search-input');
    fireEvent.changeText(searchInput, 'NonExistentLineXYZ999');

    await waitFor(() => {
      expect(getByTestId('empty-schedules-container')).toBeTruthy();
      expect(getByText('No Transit Schedules Found')).toBeTruthy();
    });

    const resetBtn = getByTestId('reset-schedules-filters-btn');
    fireEvent.press(resetBtn);

    await waitFor(() => {
      expect(queryByTestId('empty-schedules-container')).toBeNull();
      expect(getByText('M2')).toBeTruthy();
    });
  });

  it('triggers location detection via Detect Near Me button', async () => {
    const { getByTestId } = renderSchedulesScreen();

    const detectBtn = getByTestId('location-detect-btn');
    fireEvent.press(detectBtn);

    await waitFor(() => {
      expect(getByTestId('detected-location-msg')).toBeTruthy();
    });
  });

  it('toggles stopover accordion to reveal route stops', async () => {
    const { getByText, getByTestId, queryByTestId } = renderSchedulesScreen();

    await waitFor(() => {
      expect(getByText('M2')).toBeTruthy();
    });

    const toggleBtn = getByTestId('toggle-stops-btn-metrorex-m2');
    expect(queryByTestId('stops-list-container-metrorex-m2')).toBeNull();

    fireEvent.press(toggleBtn);
    const stopsContainer = getByTestId('stops-list-container-metrorex-m2');
    expect(stopsContainer).toBeTruthy();
    expect(within(stopsContainer).getByText(/Piața Unirii 2/)).toBeTruthy();

    fireEvent.press(toggleBtn);
    expect(queryByTestId('stops-list-container-metrorex-m2')).toBeNull();
  });

  it('STRICT INVARIANT: does not render any map component', () => {
    const { queryByTestId, toJSON } = renderSchedulesScreen();

    expect(queryByTestId('map-view')).toBeNull();
    expect(queryByTestId('map-container')).toBeNull();

    const tree = JSON.stringify(toJSON());
    expect(tree).not.toContain('MapView');
    expect(tree).not.toContain('react-native-maps');
  });
});
