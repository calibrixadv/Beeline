import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { render, fireEvent, act } from '@testing-library/react-native';
import {
  ScreenTransitionProvider,
  useScreenTransition,
} from '../src/context/ScreenTransitionContext';
import { useRouter } from 'expo-router';

const TransitionConsumer: React.FC = () => {
  const { isTransitioning, transitionMessage, triggerTransition, navigateWithTransition } =
    useScreenTransition();

  return (
    <>
      <Text testID="is-transitioning">{String(isTransitioning)}</Text>
      <Text testID="transition-message">{transitionMessage}</Text>
      <TouchableOpacity
        testID="trigger-btn"
        onPress={() => triggerTransition('Custom Loading...', 50)}
      >
        <Text>Trigger</Text>
      </TouchableOpacity>
      <TouchableOpacity
        testID="nav-btn"
        onPress={() => navigateWithTransition('/trains', { message: 'Navigating to trains...', durationMs: 50 })}
      >
        <Text>Nav</Text>
      </TouchableOpacity>
    </>
  );
};

describe('ScreenTransitionContext and Provider', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('manages transition states and messages', async () => {
    const { getByTestId } = render(
      <ScreenTransitionProvider>
        <TransitionConsumer />
      </ScreenTransitionProvider>
    );

    expect(getByTestId('is-transitioning').props.children).toBe('false');

    act(() => {
      fireEvent.press(getByTestId('trigger-btn'));
    });

    expect(getByTestId('is-transitioning').props.children).toBe('true');
    expect(getByTestId('transition-message').props.children).toBe('Custom Loading...');

    act(() => {
      jest.advanceTimersByTime(60);
    });

    expect(getByTestId('is-transitioning').props.children).toBe('false');
  });

  it('navigates with transition and calls router push', async () => {
    const router = useRouter();
    const { getByTestId } = render(
      <ScreenTransitionProvider>
        <TransitionConsumer />
      </ScreenTransitionProvider>
    );

    act(() => {
      fireEvent.press(getByTestId('nav-btn'));
    });

    expect(router.push).toHaveBeenCalledWith('/trains');
    expect(getByTestId('is-transitioning').props.children).toBe('true');
    expect(getByTestId('transition-message').props.children).toBe('Navigating to trains...');

    act(() => {
      jest.advanceTimersByTime(60);
    });

    expect(getByTestId('is-transitioning').props.children).toBe('false');
  });

  it('handles rapid consecutive transitions by cancelling prior timeout and single-flighting', async () => {
    const { getByTestId } = render(
      <ScreenTransitionProvider>
        <TransitionConsumer />
      </ScreenTransitionProvider>
    );

    // First transition at t=0 with 50ms duration
    act(() => {
      fireEvent.press(getByTestId('nav-btn'));
    });
    expect(getByTestId('is-transitioning').props.children).toBe('true');
    expect(getByTestId('transition-message').props.children).toBe('Navigating to trains...');

    // Advance 20ms
    act(() => {
      jest.advanceTimersByTime(20);
    });

    // Second transition triggered before first finishes (duration 50ms, ends at t=70)
    act(() => {
      fireEvent.press(getByTestId('trigger-btn'));
    });
    expect(getByTestId('is-transitioning').props.children).toBe('true');
    expect(getByTestId('transition-message').props.children).toBe('Custom Loading...');

    // Advance past first timeout (t=55ms total, 35ms after second call)
    act(() => {
      jest.advanceTimersByTime(35);
    });

    // MUST STILL BE IN TRANSITION (first timeout was cancelled and did not prematurely resolve)
    expect(getByTestId('is-transitioning').props.children).toBe('true');

    // Advance past second timeout (t=75ms total)
    act(() => {
      jest.advanceTimersByTime(20);
    });

    // Now completes cleanly
    expect(getByTestId('is-transitioning').props.children).toBe('false');
  });

  it('safely cleans up timeouts when ScreenTransitionProvider unmounts during active transition', () => {
    const { getByTestId, unmount } = render(
      <ScreenTransitionProvider>
        <TransitionConsumer />
      </ScreenTransitionProvider>
    );

    act(() => {
      fireEvent.press(getByTestId('nav-btn'));
    });
    expect(getByTestId('is-transitioning').props.children).toBe('true');

    // Unmount while transition in flight
    unmount();

    // Advance timers after unmount - should not throw or trigger state update warning
    expect(() => {
      act(() => {
        jest.advanceTimersByTime(100);
      });
    }).not.toThrow();
  });
});
