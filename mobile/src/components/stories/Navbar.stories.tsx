import { Navbar, NavbarProps } from '../Navbar';
import { StoryMeta, StoryObj, fireEvent } from '../../../.storybook/testing';

const meta: StoryMeta<NavbarProps> = {
  title: 'Navigation/Navbar',
  component: Navbar,
  args: {
    activeRoute: '/',
    showThemeToggle: true,
    showQuickAction: true,
  },
};

export default meta;

export const DefaultHome: StoryObj<NavbarProps> = {
  args: {
    activeRoute: '/',
  },
};

export const ActiveTrains: StoryObj<NavbarProps> = {
  args: {
    activeRoute: '/trains',
  },
};

export const ActiveMyTrip: StoryObj<NavbarProps> = {
  args: {
    activeRoute: '/my-trip',
  },
};

export const InteractiveNavbarPlay: StoryObj<NavbarProps> = {
  args: {
    activeRoute: '/',
  },
  play: async ({ canvasElement }) => {
    const brand = canvasElement.getByTestId('navbar-brand-touchable');
    fireEvent.press(brand);

    const trainsLink = canvasElement.getByTestId('navbar-link-schedules');
    fireEvent.press(trainsLink);

    const actionBtn = canvasElement.getByTestId('navbar-action-btn');
    fireEvent.press(actionBtn);

    const themeToggle = canvasElement.getByTestId('navbar-theme-toggle');
    fireEvent.press(themeToggle);
  },
};
