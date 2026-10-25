import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { BookingTripCard } from '../src/components/BookingTripCard';
import { ThemeProvider } from '../src/context/ThemeContext';
import {
  SAMPLE_ROUTE_PLAN_MICRO19_TO_PIATA_UNIRII,
  SAMPLE_ROUTE_PLAN_BUCHAREST_TO_BRASOV,
} from '../src/data/sampleRoutePlans';

const renderCard = (props: React.ComponentProps<typeof BookingTripCard>) => {
  return render(
    <ThemeProvider>
      <BookingTripCard {...props} />
    </ThemeProvider>
  );
};

describe('BookingTripCard component', () => {
  it('renders booking summary, departure/arrival times, stations, and dual currency price', () => {
    const { getByText, getByTestId } = renderCard({
      plan: SAMPLE_ROUTE_PLAN_BUCHAREST_TO_BRASOV,
    });

    // Check stations and times
    expect(getByText('București Nord')).toBeTruthy();
    expect(getByText('Gara Brașov')).toBeTruthy();
    expect(getByTestId(`duration-text-${SAMPLE_ROUTE_PLAN_BUCHAREST_TO_BRASOV.id}`)).toBeTruthy();
    expect(getByTestId(`transfers-count-${SAMPLE_ROUTE_PLAN_BUCHAREST_TO_BRASOV.id}`)).toBeTruthy();
    expect(getByText('Direct')).toBeTruthy();

    // Check dual currency pricing
    expect(getByText(/48\.00 LEI/)).toBeTruthy();
    expect(getByText(/approx\. €9\.60/)).toBeTruthy();

    // Check Trifecta badge and Transfer Shield
    expect(getByTestId(`pillar-badge-${SAMPLE_ROUTE_PLAN_BUCHAREST_TO_BRASOV.id}`)).toBeTruthy();
    expect(getByText('⚡ FASTEST')).toBeTruthy();
    expect(getByTestId(`shield-risk-badge-${SAMPLE_ROUTE_PLAN_BUCHAREST_TO_BRASOV.id}`)).toBeTruthy();
  });

  it('renders multi-modal operators, transfer count, and risk metrics for shielded multi-leg route', () => {
    const { getByText } = renderCard({
      plan: SAMPLE_ROUTE_PLAN_MICRO19_TO_PIATA_UNIRII,
    });

    expect(getByText('2 transfers')).toBeTruthy();
    expect(getByText('🛡️ MOST RELIABLE')).toBeTruthy();
    expect(getByText(/Shield Risk: 14\/100/)).toBeTruthy();
    expect(getByText(/69\.00 LEI/)).toBeTruthy();
    expect(getByText(/approx\. €13\.80/)).toBeTruthy();
  });

  it('toggles leg-by-leg timeline accordion and intermediate stops', () => {
    const { getByTestId, queryByTestId, getByText } = renderCard({
      plan: SAMPLE_ROUTE_PLAN_MICRO19_TO_PIATA_UNIRII,
    });

    const toggleBtn = getByTestId(`toggle-details-btn-${SAMPLE_ROUTE_PLAN_MICRO19_TO_PIATA_UNIRII.id}`);
    expect(queryByTestId(`trip-legs-timeline-${SAMPLE_ROUTE_PLAN_MICRO19_TO_PIATA_UNIRII.id}`)).toBeNull();

    // Expand details
    fireEvent.press(toggleBtn);
    expect(getByTestId(`trip-legs-timeline-${SAMPLE_ROUTE_PLAN_MICRO19_TO_PIATA_UNIRII.id}`)).toBeTruthy();
    expect(getByText('STEP-BY-STEP ITINERARY')).toBeTruthy();
    expect(getByTestId(`mascot-advice-${SAMPLE_ROUTE_PLAN_MICRO19_TO_PIATA_UNIRII.id}`)).toBeTruthy();

    // Toggle intermediate stops on leg-2 (CFR IR 1572)
    const leg2StopsToggle = getByTestId('toggle-stops-leg-leg-2');
    fireEvent.press(leg2StopsToggle);
    expect(getByTestId('stops-list-leg-leg-2')).toBeTruthy();
    expect(getByText('Brăila')).toBeTruthy();
    expect(getByText('Buzău')).toBeTruthy();

    // Toggle intermediate stops off
    fireEvent.press(leg2StopsToggle);
    expect(queryByTestId('stops-list-leg-leg-2')).toBeNull();

    // Collapse details
    fireEvent.press(toggleBtn);
    expect(queryByTestId(`trip-legs-timeline-${SAMPLE_ROUTE_PLAN_MICRO19_TO_PIATA_UNIRII.id}`)).toBeNull();
  });

  it('triggers onBookTrip callback when Book Trip button is pressed', () => {
    const handleBook = jest.fn();
    const { getByTestId } = renderCard({
      plan: SAMPLE_ROUTE_PLAN_BUCHAREST_TO_BRASOV,
      onBookTrip: handleBook,
      isBooked: false,
    });

    const bookBtn = getByTestId(`book-trip-btn-${SAMPLE_ROUTE_PLAN_BUCHAREST_TO_BRASOV.id}`);
    fireEvent.press(bookBtn);

    expect(handleBook).toHaveBeenCalledWith(SAMPLE_ROUTE_PLAN_BUCHAREST_TO_BRASOV);
  });

  it('shows In Trip badge and triggers onRemoveTrip when already booked', () => {
    const handleRemove = jest.fn();
    const { getByTestId, getByText } = renderCard({
      plan: SAMPLE_ROUTE_PLAN_BUCHAREST_TO_BRASOV,
      onRemoveTrip: handleRemove,
      isBooked: true,
    });

    expect(getByText('In Trip ✓')).toBeTruthy();
    const removeBtn = getByTestId(`remove-trip-btn-${SAMPLE_ROUTE_PLAN_BUCHAREST_TO_BRASOV.id}`);
    fireEvent.press(removeBtn);

    expect(handleRemove).toHaveBeenCalledWith(SAMPLE_ROUTE_PLAN_BUCHAREST_TO_BRASOV.id);
  });
});
