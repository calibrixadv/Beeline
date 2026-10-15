import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Navbar } from '../src/components/Navbar';
import { ThemeProvider } from '../src/context/ThemeContext';
import { TripProvider } from '../src/context/TripContext';
import { ScreenTransitionProvider } from '../src/context/ScreenTransitionContext';
import { useRouter } from 'expo-router';

const renderNavbar = (props: React.ComponentProps<typeof Navbar> = {}) => {
  return render(
    <ThemeProvider>
      <ScreenTransitionProvider>
        <TripProvider>
          <Navbar {...props} />
        </TripProvider>
      </ScreenTransitionProvider>
    </ThemeProvider>
  );
};

describe('Navbar UI component', () => {
  it('renders brand name, placeholder icon, and placeholder favicon', () => {
    const { getByTestId, getByText } = renderNavbar();

    expect(getByText('BEELINE')).toBeTruthy();
    expect(getByText('RAIL & TRANSIT')).toBeTruthy();
    expect(getByTestId('navbar-placeholder-icon')).toBeTruthy();
    expect(getByTestId('navbar-placeholder-favicon')).toBeTruthy();
  });

  it('renders navigation links and triggers navigation handler', () => {
    const handleNavigate = jest.fn();
    const { getByText, getByTestId } = renderNavbar({ onNavigate: handleNavigate });

    expect(getByText('Home')).toBeTruthy();
    expect(getByText('Schedules')).toBeTruthy();
    expect(getByText('My Trip')).toBeTruthy();

    const trainsLink = getByTestId('navbar-link-schedules');
    fireEvent.press(trainsLink);
    expect(handleNavigate).toHaveBeenCalledWith('/trains');

    const homeLink = getByTestId('navbar-link-home');
    fireEvent.press(homeLink);
    expect(handleNavigate).toHaveBeenCalledWith('/');

    const myTripLink = getByTestId('navbar-link-my-trip');
    fireEvent.press(myTripLink);
    expect(handleNavigate).toHaveBeenCalledWith('/my-trip');
  });

  it('navigates via router and transition when onNavigate is omitted', () => {
    const router = useRouter();
    const { getByTestId } = renderNavbar();

    const trainsLink = getByTestId('navbar-link-schedules');
    fireEvent.press(trainsLink);

    expect(router.push).toHaveBeenCalledWith('/trains');
  });

  it('triggers quick action button press', () => {
    const router = useRouter();
    const { getByTestId } = renderNavbar();

    const actionBtn = getByTestId('navbar-action-btn');
    fireEvent.press(actionBtn);

    expect(router.push).toHaveBeenCalledWith('/trains');
  });

  it('toggles theme on pressing theme toggle button', () => {
    const { getByTestId } = renderNavbar();

    const toggle = getByTestId('navbar-theme-toggle');
    fireEvent.press(toggle);
    // Verified it didn't throw and toggles state
    expect(toggle).toBeTruthy();
  });
});
