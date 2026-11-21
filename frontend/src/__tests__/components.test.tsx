import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, act } from '@testing-library/react';
import BaseButton from '../components/BaseButton';
import MascotBee from '../components/MascotBee';
import MascotDebugModal from '../components/MascotDebugModal';
import BaseBadge from '../components/BaseBadge';
import BaseInput from '../components/BaseInput';
import BookingTripCard from '../components/BookingTripCard';
import { RouteFinderCard } from '../components/RouteFinderCard';
import TripFilterBar from '../components/TripFilterBar';
import { generateTripsForCorridor, DEFAULT_TRIP_FILTERS } from '../services/tripBookingService';

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
  usePathname: () => '/',
}));

describe('Next.js UI Components', () => {
  it('renders BaseButton and handles click events', () => {
    const handleClick = jest.fn();
    render(<BaseButton onClick={handleClick}>Click Me</BaseButton>);
    const btn = screen.getByRole('button', { name: /click me/i });
    expect(btn).toBeInTheDocument();
    fireEvent.click(btn);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('renders MascotBee personas and dynamic gear shifts without crashing', () => {
    const { rerender } = render(<MascotBee name="default" size="md" showSpeech speechText="Ready to explore!" />);
    expect(screen.getByRole('img')).toBeInTheDocument();
    expect(screen.getByText('Ready to explore!')).toBeInTheDocument();

    // Test gear shifts
    rerender(<MascotBee gear="fast" size="lg" showBadge />);
    expect(screen.getByText(/FAST ROUTE/i)).toBeInTheDocument();

    rerender(<MascotBee gear="safe" size="xl" showBadge />);
    expect(screen.getByText(/SAFE ROUTE/i)).toBeInTheDocument();

    rerender(<MascotBee gear="economy" size="2xl" showBadge />);
    expect(screen.getByText(/BEST VALUE/i)).toBeInTheDocument();

    // Scaled-up sizes 3xl and 4xl for ambient background flight
    rerender(<MascotBee gear="default" size="3xl" showAccessoryBadge={false} />);
    expect(screen.getByRole('img')).toBeInTheDocument();

    rerender(<MascotBee gear="fast" size="4xl" showAccessoryBadge={false} />);
    expect(screen.getByRole('img')).toBeInTheDocument();

    // Legacy backwards compatibility aliases
    rerender(<MascotBee name="barnaby" size="md" />);
    expect(screen.getByRole('img')).toBeInTheDocument();
  });

  it('performs dynamic gear shift transitions with radial exit, vertical entry, and shine effects', () => {
    jest.useFakeTimers();

    const { container, rerender } = render(<MascotBee gear="default" size="lg" animated={true} />);
    const root = container.firstElementChild as HTMLElement;

    // Initial state: default gear, idle, no exiting gear
    expect(root).toHaveAttribute('data-gear', 'default');
    expect(root).toHaveAttribute('data-transitioning', 'false');
    expect(root).not.toHaveAttribute('data-exiting-gear');
    expect(container.querySelector('[data-testid="mascot-gear-shine"]')).toBeNull();

    // Trigger gear change to 'fast'
    rerender(<MascotBee gear="fast" size="lg" animated={true} />);

    // Now in dynamic transition
    expect(root).toHaveAttribute('data-gear', 'fast');
    expect(root).toHaveAttribute('data-exiting-gear', 'default');
    expect(root).toHaveAttribute('data-transitioning', 'true');

    // 1. Old gear exits radially from center (transform radial + fade out)
    const exitingGroup = container.querySelector('[data-gear-status="exiting"]');
    expect(exitingGroup).toBeInTheDocument();
    expect(exitingGroup).toHaveAttribute('data-gear-type', 'default');
    expect(exitingGroup).toHaveClass('animate-gear-radial-exit');

    // Radial shockwave ripple is rendered
    expect(container.querySelector('.animate-gear-shockwave')).toBeInTheDocument();

    // 2. New gear enters vertically from above (transformY + fade in)
    const enteringGroup = container.querySelector('[data-gear-status="entering"]');
    expect(enteringGroup).toBeInTheDocument();
    expect(enteringGroup).toHaveAttribute('data-gear-type', 'fast');
    expect(enteringGroup).toHaveClass('animate-gear-enter-top');

    // 3. Shine effect is active when new gear gets in place
    const shineGroup = container.querySelector('[data-testid="mascot-gear-shine"]');
    expect(shineGroup).toBeInTheDocument();
    expect(shineGroup).toHaveAttribute('data-shine-gear', 'fast');
    expect(shineGroup?.querySelector('.animate-gear-sweep')).toBeInTheDocument();
    expect(shineGroup?.querySelectorAll('.animate-gear-sparkle').length).toBeGreaterThan(0);

    // Fast-forward past transition duration (850ms)
    act(() => {
      jest.advanceTimersByTime(900);
    });

    // Transition ends: exiting gear and shine unmounted, entering gear settles to idle
    expect(root).toHaveAttribute('data-gear', 'fast');
    expect(root).toHaveAttribute('data-transitioning', 'false');
    expect(root).not.toHaveAttribute('data-exiting-gear');
    expect(container.querySelector('[data-gear-status="exiting"]')).toBeNull();
    expect(container.querySelector('[data-testid="mascot-gear-shine"]')).toBeNull();

    const idleGroup = container.querySelector('[data-gear-status="idle"]');
    expect(idleGroup).toBeInTheDocument();
    expect(idleGroup).toHaveAttribute('data-gear-type', 'fast');

    jest.useRealTimers();
  });

  it('skips dynamic transition animation when animated prop is false', () => {
    const { container, rerender } = render(<MascotBee gear="default" size="lg" animated={false} />);
    const root = container.firstElementChild as HTMLElement;

    expect(root).toHaveAttribute('data-gear', 'default');
    expect(root).toHaveAttribute('data-transitioning', 'false');

    rerender(<MascotBee gear="safe" size="lg" animated={false} />);

    expect(root).toHaveAttribute('data-gear', 'safe');
    expect(root).toHaveAttribute('data-transitioning', 'false');
    expect(root).not.toHaveAttribute('data-exiting-gear');
    expect(container.querySelector('[data-gear-status="exiting"]')).toBeNull();
    expect(container.querySelector('[data-testid="mascot-gear-shine"]')).toBeNull();
  });

  it('renders MascotDebugModal with full gear override controls', () => {
    const handleClose = jest.fn();
    const handleSelectGear = jest.fn();
    const handleResetAuto = jest.fn();

    const { rerender } = render(
      <MascotDebugModal
        isOpen={true}
        onClose={handleClose}
        currentGear="default"
        onSelectGear={handleSelectGear}
        onResetAuto={handleResetAuto}
        isManualOverride={false}
      />
    );

    expect(screen.getByText(/Mascot Gear Override Panel/i)).toBeInTheDocument();
    expect(screen.getByText(/Auto Route Sync/i)).toBeInTheDocument();

    // Check default button has aria-pressed="true"
    const defaultBtn = screen.getByRole('button', { name: /🧭 Default/i });
    expect(defaultBtn).toHaveAttribute('aria-pressed', 'true');

    // Click Fast gear
    const fastBtn = screen.getByRole('button', { name: /⚡ Fast/i });
    expect(fastBtn).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(fastBtn);
    expect(handleSelectGear).toHaveBeenCalledWith('fast');

    // Click Safe gear
    const safeBtn = screen.getByRole('button', { name: /🛡️ Safe/i });
    fireEvent.click(safeBtn);
    expect(handleSelectGear).toHaveBeenCalledWith('safe');

    // Click Economy gear
    const economyBtn = screen.getByRole('button', { name: /🍯 Economy/i });
    fireEvent.click(economyBtn);
    expect(handleSelectGear).toHaveBeenCalledWith('economy');

    // Click Reset to Auto
    const resetBtn = screen.getByRole('button', { name: /Reset to Automatic Route Mode/i });
    fireEvent.click(resetBtn);
    expect(handleResetAuto).toHaveBeenCalledTimes(1);

    // Click Done
    const doneBtn = screen.getByRole('button', { name: /Done/i });
    fireEvent.click(doneBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);

    // Press Escape key closes modal
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(handleClose).toHaveBeenCalledTimes(2);

    // Backdrop click closes modal
    const dialogBackdrop = screen.getByRole('dialog');
    fireEvent.click(dialogBackdrop);
    expect(handleClose).toHaveBeenCalledTimes(3);

    // Re-render in manual override mode
    rerender(
      <MascotDebugModal
        isOpen={true}
        onClose={handleClose}
        currentGear="fast"
        onSelectGear={handleSelectGear}
        onResetAuto={handleResetAuto}
        isManualOverride={true}
      />
    );
    expect(screen.getByText(/Manual Override/i)).toBeInTheDocument();

    // Re-render closed
    rerender(
      <MascotDebugModal
        isOpen={false}
        onClose={handleClose}
        currentGear="default"
        onSelectGear={handleSelectGear}
        onResetAuto={handleResetAuto}
        isManualOverride={false}
      />
    );
    expect(screen.queryByText(/Mascot Gear Override Panel/i)).not.toBeInTheDocument();
  });

  it('renders BaseBadge with variant styling', () => {
    render(<BaseBadge variant="success">Confirmed</BaseBadge>);
    expect(screen.getByText('Confirmed')).toBeInTheDocument();
  });

  it('renders BaseInput and responds to typing', () => {
    const handleChange = jest.fn();
    render(<BaseInput placeholder="Enter station" onChange={handleChange} />);
    const input = screen.getByPlaceholderText('Enter station');
    fireEvent.change(input, { target: { value: 'București' } });
    expect(handleChange).toHaveBeenCalled();
  });

  it('renders BookingTripCard with price and shield indicators and non-green submit CTA', () => {
    const trips = generateTripsForCorridor('Galați', 'București Nord');
    const plan = trips[0];
    const handleBook = jest.fn();

    render(<BookingTripCard plan={plan} onBookTrip={handleBook} />);
    expect(screen.getByText(/LEI/i)).toBeInTheDocument();
    expect(screen.getByText(/Shield:/i)).toBeInTheDocument();

    const addBtn = screen.getByRole('button', { name: /add to itinerary/i });
    expect(addBtn).toHaveClass('bg-amber-500');
    expect(addBtn).not.toHaveClass('bg-emerald-600');
    expect(addBtn).not.toHaveClass('bg-green-600');

    fireEvent.click(addBtn);
    expect(handleBook).toHaveBeenCalledWith(plan);
  });

  it('renders BookingTripCard with direct InfoFer link when in itinerary', () => {
    const trips = generateTripsForCorridor('Galați', 'București Nord');
    const plan = trips[0];

    render(<BookingTripCard plan={plan} isInItinerary={true} />);
    const link = screen.getByTestId('open-official-ticket-link');
    expect(link).toBeInTheDocument();
    expect(link).toHaveTextContent(/vezi trenul pe infofer/i);
    expect(link.getAttribute('href')).toMatch(/https:\/\/mersultrenurilor\.infofer\.ro\/ro-RO\/Tren\/\d+\?Date=/);
  });

  it('renders BookingTripCard with per-leg InfoFer links for multi-leg transfer routes', () => {
    const multiLegPlan = {
      ...generateTripsForCorridor('Galați', 'București Nord')[0],
      transfersCount: 1,
      legs: [
        {
          id: 'leg-1',
          legIndex: 0,
          transportType: 'TRAIN' as const,
          names: { lineCode: 'IR 1732', originName: 'Galați', originCity: 'Galați', destinationName: 'Ploiești Sud', destinationCity: 'Ploiești', operatorName: 'CFR Călători' },
          coords: { originCoords: { latitude: 0, longitude: 0 }, destinationCoords: { latitude: 0, longitude: 0 }, intermediateStops: [], geometry: { type: 'LineString' as const, coordinates: [] } },
          timings: { scheduledDeparture: '2026-11-21T06:00:00Z', scheduledArrival: '2026-11-21T09:00:00Z', estimatedDeparture: '2026-11-21T06:00:00Z', estimatedArrival: '2026-11-21T09:00:00Z', durationMinutes: 180, delayMinutes: 0, isRealtime: false },
          risk: { legRiskScore: 10, historicalPunctualityPercent: 95, isShieldedBuffer: true, disruptions: [] },
          fare: { amount: 50, currency: 'RON' as const, ticketCategory: 'RAIL_INTERREGIO' as const },
          amenities: { items: [], crowdingLevel: 'LOW' as const, stepFreeAccess: true },
          instructions: { leadText: 'Board IR 1732' },
        },
        {
          id: 'leg-2',
          legIndex: 1,
          transportType: 'TRAIN' as const,
          names: { lineCode: 'R-E 10061', originName: 'Ploiești Sud', originCity: 'Ploiești', destinationName: 'Brașov', destinationCity: 'Brașov', operatorName: 'Regio Călători' },
          coords: { originCoords: { latitude: 0, longitude: 0 }, destinationCoords: { latitude: 0, longitude: 0 }, intermediateStops: [], geometry: { type: 'LineString' as const, coordinates: [] } },
          timings: { scheduledDeparture: '2026-11-21T09:30:00Z', scheduledArrival: '2026-11-21T11:30:00Z', estimatedDeparture: '2026-11-21T09:30:00Z', estimatedArrival: '2026-11-21T11:30:00Z', durationMinutes: 120, delayMinutes: 0, isRealtime: false },
          risk: { legRiskScore: 10, historicalPunctualityPercent: 95, isShieldedBuffer: true, disruptions: [] },
          fare: { amount: 30, currency: 'RON' as const, ticketCategory: 'RAIL_REGIO' as const },
          amenities: { items: [], crowdingLevel: 'LOW' as const, stepFreeAccess: true },
          instructions: { leadText: 'Board R-E 10061' },
        },
      ],
    };

    render(<BookingTripCard plan={multiLegPlan} isInItinerary={true} />);
    expect(screen.getByTestId('multileg-infofer-links')).toBeInTheDocument();
    const leg0 = screen.getByTestId('open-official-ticket-link-leg-0');
    const leg1 = screen.getByTestId('open-official-ticket-link-leg-1');
    expect(leg0).toHaveTextContent('InfoFer: IR 1732');
    expect(leg0.getAttribute('href')).toContain('/Tren/1732?Date=');
    expect(leg1).toHaveTextContent('InfoFer: R-E 10061');
    expect(leg1.getAttribute('href')).toContain('/Tren/10061?Date=');
  });

  it('renders TripFilterBar floating islands and handles primary filter changes', () => {
    const handleChange = jest.fn();
    const handleReset = jest.fn();

    render(
      <TripFilterBar
        filters={DEFAULT_TRIP_FILTERS}
        onChange={handleChange}
        onReset={handleReset}
        activeCount={0}
      />
    );

    // Primary Floating Row islands
    expect(screen.getByRole('button', { name: /^All Trips$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Queen Meli/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Queen Vira/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Queen Flora/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Sort trips by/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Max transfers/i)).toBeInTheDocument();

    const toggleBtn = screen.getByTestId('toggle-more-filters');
    expect(toggleBtn).toBeInTheDocument();
    expect(toggleBtn).toHaveAttribute('aria-expanded', 'false');

    // Clicking a primary pillar triggers onChange
    fireEvent.click(screen.getByRole('button', { name: /Queen Vira/i }));
    expect(handleChange).toHaveBeenCalledWith(
      expect.objectContaining({ pillar: 'FASTEST' })
    );

    fireEvent.click(screen.getByRole('button', { name: /Queen Meli/i }));
    expect(handleChange).toHaveBeenCalledWith(
      expect.objectContaining({ pillar: 'MOST_RELIABLE' })
    );

    fireEvent.click(screen.getByRole('button', { name: /Queen Flora/i }));
    expect(handleChange).toHaveBeenCalledWith(
      expect.objectContaining({ pillar: 'BEST_VALUE' })
    );
  });

  it('renders max transfers selector with all required options and handles changes', () => {
    const handleChange = jest.fn();

    render(
      <TripFilterBar
        filters={DEFAULT_TRIP_FILTERS}
        onChange={handleChange}
        activeCount={0}
      />
    );

    const selector = screen.getByLabelText(/Max transfers/i);
    expect(selector).toBeInTheDocument();
    expect(screen.getByTestId('max-transfers-select')).toBeInTheDocument();

    // Verify all 5 required transfer options exist
    expect(screen.getByRole('option', { name: /Any/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /0 \(Direct only\)/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Max 1 transfer/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Max 2 transfers/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Max 3 transfers/i })).toBeInTheDocument();

    // Select 0 (Direct only)
    fireEvent.change(selector, { target: { value: '0' } });
    expect(handleChange).toHaveBeenCalledWith(
      expect.objectContaining({ maxTransfers: 0 })
    );

    // Select Max 1 transfer
    fireEvent.change(selector, { target: { value: '1' } });
    expect(handleChange).toHaveBeenCalledWith(
      expect.objectContaining({ maxTransfers: 1 })
    );

    // Select Max 2 transfers
    fireEvent.change(selector, { target: { value: '2' } });
    expect(handleChange).toHaveBeenCalledWith(
      expect.objectContaining({ maxTransfers: 2 })
    );

    // Select Max 3 transfers
    fireEvent.change(selector, { target: { value: '3' } });
    expect(handleChange).toHaveBeenCalledWith(
      expect.objectContaining({ maxTransfers: 3 })
    );

    // Select Any / All (resets to undefined)
    fireEvent.change(selector, { target: { value: 'ANY' } });
    expect(handleChange).toHaveBeenCalledWith(
      expect.objectContaining({ maxTransfers: undefined })
    );
  });

  it('controls the secondary filters drawer and handles operator/budget filters with reset', () => {
    const handleChange = jest.fn();

    const { rerender } = render(
      <TripFilterBar
        filters={DEFAULT_TRIP_FILTERS}
        onChange={handleChange}
        activeCount={0}
      />
    );

    // Secondary panel is hidden by default
    expect(screen.queryByTestId('more-filters-panel')).not.toBeInTheDocument();

    // Toggle drawer open
    const toggleBtn = screen.getByTestId('toggle-more-filters');
    fireEvent.click(toggleBtn);
    expect(toggleBtn).toHaveAttribute('aria-expanded', 'true');

    const panel = screen.getByTestId('more-filters-panel');
    expect(panel).toBeInTheDocument();

    // Secondary filters are visible inside the drawer
    const cfrBtn = screen.getByRole('button', { name: 'CFR Călători' });
    expect(cfrBtn).toBeInTheDocument();
    fireEvent.click(cfrBtn);
    expect(handleChange).toHaveBeenCalledWith(
      expect.objectContaining({ providers: ['CFR Călători'] })
    );

    // Click budget filter
    const budgetBtn = screen.getByRole('button', { name: '< 50 LEI' });
    expect(budgetBtn).toBeInTheDocument();
    fireEvent.click(budgetBtn);
    expect(handleChange).toHaveBeenCalledWith(
      expect.objectContaining({ maxPriceLei: 50 })
    );

    // Rerender with active secondary filters: badge should show count
    rerender(
      <TripFilterBar
        filters={{
          ...DEFAULT_TRIP_FILTERS,
          providers: ['CFR Călători'],
          maxPriceLei: 50,
        }}
        onChange={handleChange}
        activeCount={2}
      />
    );

    const badge = screen.getByTestId('active-secondary-count-badge');
    expect(badge).toHaveTextContent('2');

    // Drawer is open, so Reset filters button is visible in the secondary island
    const resetBtn = screen.getByTestId('reset-filters');
    expect(resetBtn).toBeInTheDocument();
    fireEvent.click(resetBtn);
    expect(handleChange).toHaveBeenCalledWith(
      expect.objectContaining({
        providers: [],
        maxPriceLei: undefined,
      })
    );

    // Collapse drawer
    fireEvent.click(screen.getByTestId('toggle-more-filters'));
    expect(screen.queryByTestId('more-filters-panel')).not.toBeInTheDocument();
  });

  it('renders BookingTripCard with ML delay pill and connection guarantee when isMlComputed is true', () => {
    const trips = generateTripsForCorridor('Galați', 'București Nord');
    const planWithMl = {
      ...trips[0],
      riskAnalysis: {
        ...trips[0].riskAnalysis,
        expectedDelayMinutes: 4,
        missedConnectionProbability: 0.03,
        isMlComputed: true,
      },
    };

    const { rerender } = render(<BookingTripCard plan={planWithMl} />);
    expect(screen.getByText(/⏱️ \+4m expected delay/i)).toBeInTheDocument();
    // Direct route has transfersCount === 0
    expect(screen.getByText(/Direct route/i)).toBeInTheDocument();
    // Rule-based Shield percentage is replaced by ML indicators
    expect(screen.queryByText(/Shield: \d+%/i)).not.toBeInTheDocument();

    // Connecting route renders transfer chance
    const connectingPlan = {
      ...planWithMl,
      transfersCount: 1,
    };
    rerender(<BookingTripCard plan={connectingPlan} />);
    expect(screen.getByText(/🛡️ 97% transfer chance/i)).toBeInTheDocument();
  });

  it('renders BookingTripCard with On Time pill when expectedDelayMinutes is zero', () => {
    const trips = generateTripsForCorridor('Galați', 'București Nord');
    const planWithMl = {
      ...trips[0],
      riskAnalysis: {
        ...trips[0].riskAnalysis,
        expectedDelayMinutes: 0,
        missedConnectionProbability: 0.01,
        isMlComputed: true,
      },
    };

    render(<BookingTripCard plan={planWithMl} />);
    expect(screen.getByText(/✅ On Time/i)).toBeInTheDocument();
    expect(screen.getByText(/Direct route/i)).toBeInTheDocument();
  });

  it('renders RouteFinderCard preview plans with ML badges and handles selection', () => {
    const trips = generateTripsForCorridor('Galați', 'București Nord');
    const previewPlans = [
      {
        ...trips[0],
        riskAnalysis: {
          ...trips[0].riskAnalysis,
          expectedDelayMinutes: 5,
          missedConnectionProbability: 0.04,
          isMlComputed: true,
        },
      },
    ];

    const handleSelect = jest.fn();
    render(<RouteFinderCard previewPlans={previewPlans} onSelectPlan={handleSelect} />);

    expect(screen.getByText('Route Options')).toBeInTheDocument();
    expect(screen.getByText(/⏱️ \+5m expected delay/i)).toBeInTheDocument();
    expect(screen.getByText(/🛡️ 96% connection guarantee/i)).toBeInTheDocument();

    const planCard = screen.getByText(previewPlans[0].summary).closest('div');
    if (planCard) fireEvent.click(planCard);
    expect(handleSelect).toHaveBeenCalledWith(previewPlans[0]);
  });
});
