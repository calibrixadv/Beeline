import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { LoginButton } from '../src/components/LoginButton';

describe('LoginButton Component (Extends BaseButton)', () => {
  it('renders default VoyageRail provider button', () => {
    const { getByText, getByRole } = render(<LoginButton />);

    expect(getByText('Sign in to VoyageRail')).toBeTruthy();
    expect(getByRole('button')).toBeTruthy();
  });

  it('renders Google authentication provider with proper label and testID', () => {
    const { getByText, getByTestId } = render(<LoginButton provider="google" />);

    expect(getByText('Continue with Google')).toBeTruthy();
    expect(getByTestId('login-button-google')).toBeTruthy();
  });

  it('renders Apple authentication provider', () => {
    const { getByText, getByTestId } = render(<LoginButton provider="apple" />);

    expect(getByText('Continue with Apple')).toBeTruthy();
    expect(getByTestId('login-button-apple')).toBeTruthy();
  });

  it('renders Email authentication provider', () => {
    const { getByText, getByTestId } = render(<LoginButton provider="email" />);

    expect(getByText('Sign in with Email')).toBeTruthy();
    expect(getByTestId('login-button-email')).toBeTruthy();
  });

  it('renders Guest mode provider', () => {
    const { getByText, getByTestId } = render(<LoginButton provider="guest" />);

    expect(getByText('Continue as Guest')).toBeTruthy();
    expect(getByTestId('login-button-guest')).toBeTruthy();
  });

  it('reflects logged-in state for VoyageRail provider', () => {
    const { getByText } = render(<LoginButton provider="voyagerail" isLoggedIn={true} />);

    expect(getByText('Signed in to VoyageRail')).toBeTruthy();
  });

  it('propagates onPress events from BaseButton', () => {
    const handleLogin = jest.fn();
    const { getByRole } = render(
      <LoginButton provider="google" onPress={handleLogin} />
    );

    fireEvent.press(getByRole('button'));
    expect(handleLogin).toHaveBeenCalledTimes(1);
  });

  it('supports loading and disabled states inherited from BaseButton', () => {
    const handleLogin = jest.fn();
    const { getByTestId } = render(
      <LoginButton provider="email" loading={true} onPress={handleLogin} />
    );

    const spinner = getByTestId('button-activity-indicator');
    expect(spinner).toBeTruthy();
    fireEvent.press(spinner);
    expect(handleLogin).not.toHaveBeenCalled();
  });

  it('reflects logged-in state across Google, Apple, Email, and Guest providers', () => {
    const { getByText: getGoogle } = render(<LoginButton provider="google" isLoggedIn={true} />);
    expect(getGoogle('Signed in with Google')).toBeTruthy();

    const { getByText: getApple } = render(<LoginButton provider="apple" isLoggedIn={true} />);
    expect(getApple('Signed in with Apple')).toBeTruthy();

    const { getByText: getEmail } = render(<LoginButton provider="email" isLoggedIn={true} />);
    expect(getEmail('Signed in with Email')).toBeTruthy();

    const { getByText: getGuest } = render(<LoginButton provider="guest" isLoggedIn={true} />);
    expect(getGuest('Continuing as Guest')).toBeTruthy();
  });

  it('prevents rapid concurrent double dispatch while an async login is in-flight', async () => {
    let resolvePromise!: () => void;
    const asyncPromise = new Promise<void>((resolve) => {
      resolvePromise = resolve;
    });
    const handleAsyncLogin = jest.fn(() => asyncPromise);

    const { getByRole, getByTestId } = render(
      <LoginButton provider="google" onPress={handleAsyncLogin} />
    );

    const button = getByRole('button');

    // First press initiates login
    fireEvent.press(button);
    expect(handleAsyncLogin).toHaveBeenCalledTimes(1);

    // Button should now be busy / loading with spinner
    expect(getByTestId('button-activity-indicator')).toBeTruthy();

    // Second rapid press while still in-flight
    fireEvent.press(button);
    expect(handleAsyncLogin).toHaveBeenCalledTimes(1); // Still 1! No double dispatch

    // Finish async action cleanly
    await act(async () => {
      resolvePromise();
    });
  });
});
