import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, act } from '@testing-library/react';
import BaseButton from '../components/BaseButton';
import MascotBee from '../components/MascotBee';
import MascotDebugModal from '../components/MascotDebugModal';
import BaseBadge from '../components/BaseBadge';
import BaseInput from '../components/BaseInput';
import BookingTripCard from '../components/BookingTripCard';
import TripFilterBar from '../components/TripFilterBar';
import { generateTripsForCorridor, DEFAULT_TRIP_FILTERS } from '../services/tripBookingService';

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

  it('renders BookingTripCard with price and shield indicators', () => {
    const trips = generateTripsForCorridor('Galați', 'București Nord');
    const plan = trips[0];
    const handleBook = jest.fn();

    render(<BookingTripCard plan={plan} onBookTrip={handleBook} />);
    expect(screen.getByText(/LEI/i)).toBeInTheDocument();
    expect(screen.getByText(/Shield:/i)).toBeInTheDocument();

    const bookBtn = screen.getByRole('button', { name: /book trip/i });
    fireEvent.click(bookBtn);
    expect(handleBook).toHaveBeenCalledWith(plan);
  });

  it('renders TripFilterBar and handles filter changes', () => {
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

    expect(screen.getByText('Filters & Sorting')).toBeInTheDocument();
  });
});
