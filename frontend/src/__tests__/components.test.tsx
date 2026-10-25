import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import BaseButton from '../components/BaseButton';
import MascotBee from '../components/MascotBee';
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

  it('renders MascotBee personas without crashing', () => {
    render(<MascotBee name="barnaby" size="md" />);
    expect(screen.getByRole('img')).toBeInTheDocument();
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
