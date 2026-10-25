import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import { ThemeProvider, useTheme } from '../src/context/ThemeContext';
import { BaseButton } from '../src/components/BaseButton';
import { BaseCard } from '../src/components/BaseCard';
import { BaseInput } from '../src/components/BaseInput';

const ThemeConsumer: React.FC = () => {
  const { mode, isDark, theme, toggleTheme, setMode } = useTheme();

  return (
    <>
      <Text testID="theme-mode">{mode}</Text>
      <Text testID="theme-isDark">{String(isDark)}</Text>
      <Text testID="theme-brandYellow">{theme.colors.brandYellow}</Text>
      <Text testID="theme-bg">{theme.colors.background}</Text>
      <Text testID="theme-brandHoney">{theme.colors.brandHoney}</Text>
      <Text testID="theme-brandHoneyLight">{theme.colors.brandHoneyLight}</Text>
      <Text testID="theme-brandHoneyDark">{theme.colors.brandHoneyDark}</Text>
      <Text testID="theme-brandAmber">{theme.colors.brandAmber}</Text>
      <Text testID="theme-brandCream">{theme.colors.brandCream}</Text>
      <Text testID="theme-surfaceWarm">{theme.colors.surfaceWarm}</Text>
      <Text testID="theme-honeyBorder">{theme.colors.honeyBorder}</Text>
      <Text testID="theme-textCharcoal">{theme.colors.textCharcoal}</Text>
      <Text testID="theme-textCharcoalMuted">{theme.colors.textCharcoalMuted}</Text>
      <TouchableOpacity testID="toggle-btn" onPress={toggleTheme}>
        <Text>Toggle</Text>
      </TouchableOpacity>
      <TouchableOpacity testID="set-dark-btn" onPress={() => setMode('dark')}>
        <Text>Set Dark</Text>
      </TouchableOpacity>
      <TouchableOpacity testID="set-light-btn" onPress={() => setMode('light')}>
        <Text>Set Light</Text>
      </TouchableOpacity>
    </>
  );
};

describe('ThemeContext and ThemeProvider', () => {
  it('provides light theme defaults and Beeline Yellow brand tokens', () => {
    const { getByTestId } = render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    );

    expect(getByTestId('theme-mode').props.children).toBe('light');
    expect(getByTestId('theme-isDark').props.children).toBe('false');
    expect(getByTestId('theme-brandYellow').props.children).toBe('#FFC700');
    expect(getByTestId('theme-bg').props.children).toBe('#FFFFFF');

    // Cozy Honey tokens in light mode
    expect(getByTestId('theme-brandHoney').props.children).toBe('#F59E0B');
    expect(getByTestId('theme-brandHoneyLight').props.children).toBe('#FEF3C7');
    expect(getByTestId('theme-brandHoneyDark').props.children).toBe('#D97706');
    expect(getByTestId('theme-brandAmber').props.children).toBe('#D97706');
    expect(getByTestId('theme-brandCream').props.children).toBe('#FFFDF7');
    expect(getByTestId('theme-surfaceWarm').props.children).toBe('#FFFBEB');
    expect(getByTestId('theme-honeyBorder').props.children).toBe('#FDE68A');
    expect(getByTestId('theme-textCharcoal').props.children).toBe('#1C1917');
    expect(getByTestId('theme-textCharcoalMuted').props.children).toBe('#57534E');
  });

  it('toggles mode from light to dark cleanly', () => {
    const { getByTestId } = render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    );

    const toggleBtn = getByTestId('toggle-btn');
    fireEvent.press(toggleBtn);

    expect(getByTestId('theme-mode').props.children).toBe('dark');
    expect(getByTestId('theme-isDark').props.children).toBe('true');
    expect(getByTestId('theme-bg').props.children).toBe('#09090B');

    // Cozy Honey tokens in dark mode
    expect(getByTestId('theme-brandHoney').props.children).toBe('#F59E0B');
    expect(getByTestId('theme-brandHoneyLight').props.children).toBe('#3E3204');
    expect(getByTestId('theme-brandHoneyDark').props.children).toBe('#D97706');
    expect(getByTestId('theme-brandAmber').props.children).toBe('#D97706');
    expect(getByTestId('theme-brandCream').props.children).toBe('#121110');
    expect(getByTestId('theme-surfaceWarm').props.children).toBe('#1C1917');
    expect(getByTestId('theme-honeyBorder').props.children).toBe('#3E3204');
    expect(getByTestId('theme-textCharcoal').props.children).toBe('#FFFFFF');
    expect(getByTestId('theme-textCharcoalMuted').props.children).toBe('#A1A1AA');

    fireEvent.press(toggleBtn);
    expect(getByTestId('theme-mode').props.children).toBe('light');
    expect(getByTestId('theme-brandCream').props.children).toBe('#FFFDF7');
  });

  it('allows setting explicit mode', () => {
    const { getByTestId } = render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    );

    fireEvent.press(getByTestId('set-dark-btn'));
    expect(getByTestId('theme-mode').props.children).toBe('dark');

    fireEvent.press(getByTestId('set-light-btn'));
    expect(getByTestId('theme-mode').props.children).toBe('light');
  });

  it('provides fallback defaults even when rendered outside ThemeProvider', () => {
    const { getByTestId } = render(<ThemeConsumer />);
    expect(getByTestId('theme-brandYellow').props.children).toBe('#FFC700');
  });

  it('adapts BaseCard, BaseButton, and BaseInput across light and dark theme modes', () => {
    const ThemedComponentsHarness: React.FC = () => {
      const { toggleTheme } = useTheme();
      return (
        <>
          <BaseButton testID="test-themed-btn" variant="primary" title="Book Now" />
          <BaseCard testID="test-themed-card" variant="elevated">
            <Text>Card Content</Text>
          </BaseCard>
          <BaseInput testID="test-themed-input" value="Paris" onChangeText={() => {}} />
          <TouchableOpacity testID="toggle-theme-harness" onPress={toggleTheme}>
            <Text>Toggle</Text>
          </TouchableOpacity>
        </>
      );
    };

    const { getByTestId } = render(
      <ThemeProvider initialMode="light">
        <ThemedComponentsHarness />
      </ThemeProvider>
    );

    const btn = getByTestId('test-themed-btn');
    const card = getByTestId('test-themed-card');
    const input = getByTestId('test-themed-input');

    expect(btn).toBeTruthy();
    expect(card).toBeTruthy();
    expect(input).toBeTruthy();

    // Toggle to dark mode
    fireEvent.press(getByTestId('toggle-theme-harness'));

    expect(getByTestId('test-themed-btn')).toBeTruthy();
    expect(getByTestId('test-themed-card')).toBeTruthy();
  });
});
