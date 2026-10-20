import React from 'react';
import { Text, Platform, AccessibilityInfo, StyleSheet } from 'react-native';
import { render } from '@testing-library/react-native';
import { CozyHoneyBackground } from '../src/components/CozyHoneyBackground';
import { ThemeProvider } from '../src/context/ThemeContext';

describe('CozyHoneyBackground component', () => {
  const originalPlatformOS = Platform.OS;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    Platform.OS = originalPlatformOS;
  });

  const renderWithTheme = (
    ui: React.ReactElement,
    mode: 'light' | 'dark' = 'light'
  ) => {
    return render(
      <ThemeProvider initialMode={mode}>
        {ui}
      </ThemeProvider>
    );
  };

  it('renders default container with testID and 8 floating pollen particles', () => {
    const { getByTestId } = renderWithTheme(<CozyHoneyBackground />);

    expect(getByTestId('cozy-honey-background')).toBeTruthy();
    expect(getByTestId('cozy-honey-ambient-layer')).toBeTruthy();

    for (let i = 0; i < 8; i++) {
      expect(getByTestId(`pollen-particle-${i}`)).toBeTruthy();
    }
  });

  it('renders nested children above ambient background layer with pointer transparency', () => {
    const { getByText, getByTestId } = renderWithTheme(
      <CozyHoneyBackground>
        <Text testID="child-content">Active Trip Content</Text>
      </CozyHoneyBackground>
    );

    const container = getByTestId('cozy-honey-background');
    expect(container.props.pointerEvents).toBe('box-none');

    const ambientLayer = getByTestId('cozy-honey-ambient-layer');
    expect(ambientLayer.props.pointerEvents).toBe('none');

    expect(getByText('Active Trip Content')).toBeTruthy();
  });

  it('sets pointerEvents="none" when no children are provided', () => {
    const { getByTestId } = renderWithTheme(<CozyHoneyBackground />);
    const container = getByTestId('cozy-honey-background');
    expect(container.props.pointerEvents).toBe('none');
  });

  it('respects explicit pointerEvents prop override', () => {
    const { getByTestId } = renderWithTheme(
      <CozyHoneyBackground pointerEvents="none">
        <Text>Inner content</Text>
      </CozyHoneyBackground>
    );
    const container = getByTestId('cozy-honey-background');
    expect(container.props.pointerEvents).toBe('none');
  });

  it('supports custom particleCount configuration', () => {
    const { getByTestId, queryByTestId } = renderWithTheme(
      <CozyHoneyBackground particleCount={12} />
    );

    for (let i = 0; i < 12; i++) {
      expect(getByTestId(`pollen-particle-${i}`)).toBeTruthy();
    }
    expect(queryByTestId('pollen-particle-12')).toBeNull();
  });

  it('handles edge case particleCounts robustly (0, negative, NaN)', () => {
    const { queryByTestId } = renderWithTheme(
      <CozyHoneyBackground particleCount={0} />
    );
    expect(queryByTestId('pollen-particle-0')).toBeNull();

    const { queryByTestId: queryNegative } = renderWithTheme(
      <CozyHoneyBackground particleCount={-5} />
    );
    expect(queryNegative('pollen-particle-0')).toBeNull();

    const { getByTestId: getNaN } = renderWithTheme(
      <CozyHoneyBackground particleCount={NaN} />
    );
    // Defaults back to 8 when particleCount is not a finite number
    expect(getNaN('pollen-particle-0')).toBeTruthy();
    expect(getNaN('pollen-particle-7')).toBeTruthy();
  });

  it('handles animated=false static mode without throwing or failing render', () => {
    const { getByTestId } = renderWithTheme(
      <CozyHoneyBackground animated={false} particleCount={6} />
    );

    expect(getByTestId('cozy-honey-background')).toBeTruthy();
    for (let i = 0; i < 6; i++) {
      expect(getByTestId(`pollen-particle-${i}`)).toBeTruthy();
    }
  });

  it('renders geometric honeycomb watermark pattern with 7 interlocking cells', () => {
    const { getByTestId } = renderWithTheme(<CozyHoneyBackground />);

    expect(getByTestId('honeycomb-watermark')).toBeTruthy();
    for (let i = 0; i < 7; i++) {
      expect(getByTestId(`honeycomb-cell-${i}`)).toBeTruthy();
    }
  });

  it('renders cozy honeycomb texture layer and secondary balancing cluster', () => {
    const { getByTestId } = renderWithTheme(<CozyHoneyBackground />);

    expect(getByTestId('cozy-honeycomb-texture')).toBeTruthy();
    expect(getByTestId('honeycomb-watermark-secondary')).toBeTruthy();
    for (let i = 0; i < 5; i++) {
      expect(getByTestId(`honeycomb-cell-secondary-${i}`)).toBeTruthy();
    }
  });

  it('allows disabling texture layer via showTexture={false}', () => {
    const { queryByTestId } = renderWithTheme(
      <CozyHoneyBackground showTexture={false} />
    );

    expect(queryByTestId('cozy-honeycomb-texture')).toBeNull();
  });

  it('adapts background and pollen particle colors seamlessly in dark mode', () => {
    const { getByTestId } = renderWithTheme(
      <CozyHoneyBackground testID="dark-bg" />,
      'dark'
    );

    const container = getByTestId('dark-bg');
    expect(container).toBeTruthy();
    expect(container.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          backgroundColor: '#121110', // Dark obsidian brandCream
        }),
      ])
    );
  });

  it('detects AccessibilityInfo prefers-reduced-motion and gracefully switches to static particles', async () => {
    const isReduceMotionSpy = jest
      .spyOn(AccessibilityInfo, 'isReduceMotionEnabled')
      .mockResolvedValue(true);

    const { getByTestId, findByTestId } = renderWithTheme(
      <CozyHoneyBackground testID="reduced-motion-bg" />
    );

    const bg = await findByTestId('reduced-motion-bg');
    expect(bg).toBeTruthy();
    expect(getByTestId('pollen-particle-0')).toBeTruthy();

    isReduceMotionSpy.mockRestore();
  });

  it('cleans up motion listeners cleanly upon unmounting without leaking memory', () => {
    const removeSubMock = jest.fn();
    const addListenerSpy = jest
      .spyOn(AccessibilityInfo, 'addEventListener')
      .mockReturnValue({ remove: removeSubMock } as any);

    const { unmount } = renderWithTheme(<CozyHoneyBackground />);
    unmount();

    expect(removeSubMock).toHaveBeenCalled();
    addListenerSpy.mockRestore();
  });

  it('supports Web platform with CSS keyframe generation and animationFillMode', () => {
    Platform.OS = 'web';
    const { getByTestId } = renderWithTheme(<CozyHoneyBackground testID="web-bg" />);

    expect(getByTestId('web-bg')).toBeTruthy();
    const particle = getByTestId('pollen-particle-0');
    expect(particle).toBeTruthy();

    const rawStyle = particle.props.style;
    const stylesList = Array.isArray(rawStyle) ? rawStyle : rawStyle[0] ?? rawStyle;
    const flatStyle = StyleSheet.flatten(stylesList) as any;

    expect(flatStyle).toBeDefined();
    expect(flatStyle.animationName).toBe('pollenDrift_0');
    expect(flatStyle.animationFillMode).toBe('both');

    const texture = getByTestId('cozy-honeycomb-texture');
    expect(texture).toBeTruthy();
    const textureStyle = StyleSheet.flatten(texture.props.style) as any;
    expect(textureStyle.backgroundImage).toContain('data:image/svg+xml');
    expect(textureStyle.backgroundRepeat).toBe('repeat, no-repeat');
  });
});
