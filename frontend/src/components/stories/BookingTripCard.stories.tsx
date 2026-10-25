import { BookingTripCard, BookingTripCardProps } from '../BookingTripCard';
import {
  SAMPLE_ROUTE_PLAN_MICRO19_TO_PIATA_UNIRII,
  SAMPLE_ROUTE_PLAN_BUCHAREST_TO_BRASOV,
} from '../../data/sampleRoutePlans';
import { generateTripsForCorridor } from '../../services/tripBookingService';
import { StoryMeta, StoryObj, fireEvent } from '../../../.storybook/testing';

const galatiTrips = generateTripsForCorridor('Galați', 'București');

const meta: StoryMeta<BookingTripCardProps> = {
  title: 'Feature/BookingTripCard',
  component: BookingTripCard,
  args: {
    plan: SAMPLE_ROUTE_PLAN_BUCHAREST_TO_BRASOV,
    isBooked: false,
    defaultExpanded: false,
    onBookTrip: () => {},
    onRemoveTrip: () => {},
  },
};

export default meta;

export const FastestDirectIR: StoryObj<BookingTripCardProps> = {
  args: {
    plan: SAMPLE_ROUTE_PLAN_BUCHAREST_TO_BRASOV,
    isBooked: false,
  },
};

export const MostReliableHoneyShielded: StoryObj<BookingTripCardProps> = {
  args: {
    plan: SAMPLE_ROUTE_PLAN_MICRO19_TO_PIATA_UNIRII,
    isBooked: false,
    defaultExpanded: false,
  },
};

export const BestValueRegional: StoryObj<BookingTripCardProps> = {
  args: {
    plan: galatiTrips.find((t) => t.curatedPillar === 'BEST_VALUE') || galatiTrips[1],
    isBooked: false,
  },
};

export const BookedInItinerary: StoryObj<BookingTripCardProps> = {
  args: {
    plan: SAMPLE_ROUTE_PLAN_BUCHAREST_TO_BRASOV,
    isBooked: true,
  },
};

export const ExpandedDetails: StoryObj<BookingTripCardProps> = {
  args: {
    plan: SAMPLE_ROUTE_PLAN_MICRO19_TO_PIATA_UNIRII,
    isBooked: false,
    defaultExpanded: true,
  },
};

export const InteractiveExpandAndBook: StoryObj<BookingTripCardProps> = {
  args: {
    plan: SAMPLE_ROUTE_PLAN_BUCHAREST_TO_BRASOV,
    isBooked: false,
  },
  play: async ({ canvasElement }) => {
    // Assert primary price is displayed
    expect(canvasElement.getByText(/48\.00 LEI/)).toBeTruthy();

    // Toggle details open
    const toggleBtn = canvasElement.getByTestId(
      `toggle-details-btn-${SAMPLE_ROUTE_PLAN_BUCHAREST_TO_BRASOV.id}`
    );
    fireEvent.press(toggleBtn);

    // Verify timeline expanded
    expect(
      canvasElement.getByTestId(`trip-legs-timeline-${SAMPLE_ROUTE_PLAN_BUCHAREST_TO_BRASOV.id}`)
    ).toBeTruthy();

    // Toggle details closed
    fireEvent.press(toggleBtn);
  },
};
