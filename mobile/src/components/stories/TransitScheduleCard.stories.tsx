import { TransitScheduleCard, TransitScheduleCardProps } from '../TransitScheduleCard';
import { StoryMeta, StoryObj, fireEvent } from '../../../.storybook/testing';
import { ROMANIAN_TRANSIT_TEMPLATES } from '../../data/romanianTransitTemplates';

const meta: StoryMeta<TransitScheduleCardProps> = {
  title: 'Feature/TransitScheduleCard',
  component: TransitScheduleCard,
  args: {
    schedule: ROMANIAN_TRANSIT_TEMPLATES[0], // Metrorex M2
  },
};

export default meta;

export const MetrorexM2: StoryObj<TransitScheduleCardProps> = {
  args: {
    schedule: ROMANIAN_TRANSIT_TEMPLATES[0], // Metrorex M2
  },
};

export const TransurbGalatiTram39: StoryObj<TransitScheduleCardProps> = {
  args: {
    schedule: ROMANIAN_TRANSIT_TEMPLATES.find((s) => s.id === 'transurb-tram-39') || ROMANIAN_TRANSIT_TEMPLATES[4],
  },
};

export const STBBus100Express: StoryObj<TransitScheduleCardProps> = {
  args: {
    schedule: ROMANIAN_TRANSIT_TEMPLATES.find((s) => s.id === 'stb-bus-100') || ROMANIAN_TRANSIT_TEMPLATES[11],
  },
};

export const CFRCalatoriTrain: StoryObj<TransitScheduleCardProps> = {
  args: {
    schedule: ROMANIAN_TRANSIT_TEMPLATES.find((s) => s.id === 'cfr-ir-1631') || ROMANIAN_TRANSIT_TEMPLATES[20],
  },
};

export const InteractiveToggleStops: StoryObj<TransitScheduleCardProps> = {
  args: {
    schedule: ROMANIAN_TRANSIT_TEMPLATES[0],
  },
  play: async ({ canvasElement }) => {
    // Assert card renders
    expect(canvasElement.getByText('M2')).toBeTruthy();
    expect(canvasElement.getByText('Metrorex')).toBeTruthy();

    // Toggle stops accordion open
    const toggleBtn = canvasElement.getByTestId('toggle-stops-btn-metrorex-m2');
    fireEvent.press(toggleBtn);

    // Verify stops container opened
    expect(canvasElement.getByTestId('stops-list-container-metrorex-m2')).toBeTruthy();
    expect(canvasElement.getByText(/Piața Unirii 2/)).toBeTruthy();

    // Toggle stops accordion closed
    fireEvent.press(toggleBtn);
  },
};
