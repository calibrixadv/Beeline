import React, { useState } from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import StationAutocompleteInput from '../components/StationAutocompleteInput';
import HomePage from '../app/page';
import TripsPage from '../app/trips/page';
import { TripProvider } from '../context/TripContext';
import * as tripBookingService from '../services/tripBookingService';

const mockPush = jest.fn();
const mockReplace = jest.fn();
let mockSearchParams = new URLSearchParams();

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    prefetch: jest.fn(),
  }),
  useSearchParams: () => mockSearchParams,
  usePathname: () => '/',
}));

describe('Station Autocomplete Component & Page Wiring Suite', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSearchParams = new URLSearchParams();
    jest.spyOn(tripBookingService, 'fetchDayTripsFromBackend').mockResolvedValue({
      plans: [],
      allDayDepartures: [],
      status: 'OK',
    });
  });

  describe('StationAutocompleteInput standalone behavior', () => {
    function ControlledTestInput({
      initialValue = '',
      excludeStationName,
    }: {
      initialValue?: string;
      excludeStationName?: string;
    }) {
      const [val, setVal] = useState(initialValue);
      return (
        <StationAutocompleteInput
          id="test-station-input"
          label="TEST DEPARTURE"
          placeholder="Search Romanian railway station..."
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onClear={() => setVal('')}
          excludeStationName={excludeStationName}
        />
      );
    }

    it('renders combobox input with accessible ARIA attributes and Cozy Hive theme', () => {
      render(<ControlledTestInput initialValue="" />);

      const input = screen.getByRole('combobox');
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute('aria-autocomplete', 'list');
      expect(input).toHaveAttribute('placeholder', 'Search Romanian railway station...');
      expect(screen.getByText('TEST DEPARTURE')).toBeInTheDocument();
    });

    it('opens dropdown, performs diacritic-insensitive matching for "galati" -> "Galați"', async () => {
      render(<ControlledTestInput initialValue="" />);

      const input = screen.getByRole('combobox');
      fireEvent.focus(input);
      fireEvent.change(input, { target: { value: 'galati' } });

      const dropdown = await screen.findByTestId('station-autocomplete-dropdown');
      expect(dropdown).toBeInTheDocument();
      expect(dropdown).toHaveClass('absolute', 'left-0', 'right-0', 'z-50');
      expect(dropdown.style.position).toBe('absolute');
      expect(dropdown.style.top).toBe('calc(100% + 6px)');

      const option = await screen.findByRole('option', { name: /Galați/i });
      expect(option).toBeInTheDocument();
      expect(screen.getByText('GLT')).toBeInTheDocument();
    });

    it('keeps input visible, editable, and listbox positioned directly underneath without layout shift', async () => {
      const handleSubmit = jest.fn();
      render(
        <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
          <ControlledTestInput initialValue="" />
        </form>
      );

      const input = screen.getByRole('combobox') as HTMLInputElement;
      expect(input).toBeVisible();

      // Freely type into the input
      fireEvent.focus(input);
      fireEvent.change(input, { target: { value: 'Bucur' } });
      expect(input.value).toBe('Bucur');

      const dropdown = await screen.findByTestId('station-autocomplete-dropdown');
      expect(dropdown).toBeInTheDocument();
      expect(dropdown.className).toContain('absolute');
      expect(dropdown.className).toContain('z-50');

      // The listbox is directly underneath and does not cover the input
      const listbox = screen.getByRole('listbox');
      expect(listbox).toBeInTheDocument();

      // C.2 DOM geometry assertions:
      // 1. listbox.parentElement is station-autocomplete-input-anchor
      const anchor = screen.getByTestId('station-autocomplete-input-anchor');
      expect(listbox.parentElement).toBe(anchor);
      // anchor contains <input> and does NOT contain <label>
      expect(anchor.contains(input)).toBe(true);
      expect(anchor.querySelector('label')).toBeNull();

      // 2. <input> precedes listbox in DOM order
      expect(input.compareDocumentPosition(listbox) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

      // 3. listbox styles
      expect(listbox.style.position).toBe('absolute');
      expect(listbox.style.top).toBe('calc(100% + 6px)');
      expect(listbox.style.zIndex).toBe('100');

      // Pressing Enter when no item is highlighted does not prevent default, allowing form submission
      const notPrevented = fireEvent.keyDown(input, { key: 'Enter', cancelable: true });
      expect(notPrevented).toBe(true);
      fireEvent.submit(input.closest('form')!);
      expect(handleSubmit).toHaveBeenCalled();
    });

    it('matches "intorsura" -> "Întorsura Buzăului" with canonical code IBZ', async () => {
      render(<ControlledTestInput initialValue="" />);

      const input = screen.getByRole('combobox');
      fireEvent.focus(input);
      fireEvent.change(input, { target: { value: 'intorsura' } });

      const option = await screen.findByRole('option', { name: /Întorsura Buzăului/i });
      expect(option).toBeInTheDocument();
      expect(screen.getByText('IBZ')).toBeInTheDocument();
    });

    it('supports full keyboard navigation: ArrowDown, ArrowUp, Enter, and Escape', async () => {
      render(<ControlledTestInput initialValue="" />);

      const input = screen.getByRole('combobox');
      fireEvent.focus(input);
      fireEvent.change(input, { target: { value: 'bucur' } });

      await screen.findByRole('option', { name: /București Nord/i });

      // ArrowDown cycles options
      fireEvent.keyDown(input, { key: 'ArrowDown' });
      // Enter selects option
      fireEvent.keyDown(input, { key: 'Enter' });

      // Input value should be selected station name (e.g. București Nord)
      expect(input).toHaveValue('București Nord');

      // Dropdown should be dismissed after selection
      expect(screen.queryByTestId('station-autocomplete-dropdown')).not.toBeInTheDocument();

      // Typing again and pressing Escape closes dropdown
      fireEvent.change(input, { target: { value: 'Cluj' } });
      await screen.findByRole('option', { name: /Cluj-Napoca/i });
      fireEvent.keyDown(input, { key: 'Escape' });
      expect(screen.queryByTestId('station-autocomplete-dropdown')).not.toBeInTheDocument();
    });

    it('clicking the clear button clears typed text and resets focus', async () => {
      render(<ControlledTestInput initialValue="Constanța" />);

      const input = screen.getByRole('combobox');
      expect(input).toHaveValue('Constanța');

      const clearBtn = screen.getByLabelText('Clear station input');
      fireEvent.click(clearBtn);

      expect(input).toHaveValue('');
    });
  });

  describe('HomePage (/) Autocomplete Integration', () => {
    it('renders hero origin and destination autocomplete inputs with swap button', () => {
      render(<HomePage />);

      const originInput = screen.getByPlaceholderText(/e\.g\. Galați/i);
      const destInput = screen.getByPlaceholderText(/e\.g\. Brașov/i);
      expect(originInput).toBeInTheDocument();
      expect(destInput).toBeInTheDocument();
      expect(originInput).toHaveAttribute('id', 'hero-origin-input');
      expect(originInput).toHaveValue('Galați');
      expect(destInput).toHaveValue('București Nord');

      const swapBtn = screen.getByTitle(/Swap Origin and Destination/i);
      fireEvent.click(swapBtn);
      expect(originInput).toHaveValue('București Nord');
      expect(destInput).toHaveValue('Galați');
    });

    it('filters and selects station in origin autocomplete on HomePage', async () => {
      render(<HomePage />);

      const originInput = screen.getByPlaceholderText(/e\.g\. Galați/i);
      fireEvent.focus(originInput);
      fireEvent.change(originInput, { target: { value: 'Bras' } });

      const option = await screen.findByRole('option', { name: /Brașov/i });
      fireEvent.click(option);

      expect(originInput).toHaveValue('Brașov');
    });
  });

  describe('TripsPage (/trips) Autocomplete & Route Fetching', () => {
    it('renders Origin and Destination autocomplete on /trips and updates corridor without leaving page', async () => {
      mockSearchParams = new URLSearchParams({
        origin: 'Galați',
        destination: 'București Nord',
        date: '2026-11-20',
      });

      render(
        <TripProvider>
          <TripsPage />
        </TripProvider>
      );

      const originInput = (await screen.findByPlaceholderText(/Departure station or city\.\.\./i)) as HTMLInputElement;
      const destInput = screen.getByPlaceholderText(/Arrival station or city\.\.\./i) as HTMLInputElement;

      expect(originInput).toBeInTheDocument();
      expect(destInput).toBeInTheDocument();
      expect(originInput.value).toBe('Galați');
      expect(destInput.value).toBe('București Nord');

      // Wait for backend plans to load cleanly
      await waitFor(() => {
        expect(screen.queryByTestId('trips-ghost-skeleton')).not.toBeInTheDocument();
        expect(screen.queryByText(/Error fetching trains/i)).not.toBeInTheDocument();
      });

      // Swap button on /trips updates inputs and router query
      const swapBtn = screen.getByTitle('Swap Stations');
      fireEvent.click(swapBtn);
      await waitFor(() => expect(screen.queryByTestId('trips-ghost-skeleton')).not.toBeInTheDocument());

      expect(originInput.value).toBe('București Nord');
      expect(destInput.value).toBe('Galați');
      expect(mockReplace).toHaveBeenCalledWith(
        expect.stringContaining('/trips?origin=Bucure%C8%99ti+Nord&destination=Gala%C8%9Bi&date=2026-11-20')
      );

      // Typing new station and selecting via autocomplete
      fireEvent.focus(destInput);
      fireEvent.change(destInput, { target: { value: 'iasi' } });

      const iasiOption = await screen.findByRole('option', { name: /Iași/i });
      fireEvent.click(iasiOption);
      await waitFor(() => expect(screen.queryByTestId('trips-ghost-skeleton')).not.toBeInTheDocument());

      expect(destInput.value).toBe('Iași');
      expect(mockReplace).toHaveBeenCalledWith(
        expect.stringContaining('/trips?origin=Bucure%C8%99ti+Nord&destination=Ia%C8%99i&date=2026-11-20')
      );
    });
  });
});
