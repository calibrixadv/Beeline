import React from 'react';
import { Animated } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import { MascotBee } from '../src/components/MascotBee';
import { RouteRewardBadge } from '../src/components/RouteRewardBadge';
import { ThemeProvider } from '../src/context/ThemeContext';

describe('MascotBee component', () => {
  it('renders Barnaby the Scout Bee persona with aviator goggles, supersonic booster accessory, and focused expression', () => {
    const { getByTestId, queryByTestId } = render(
      <ThemeProvider>
        <MascotBee name="barnaby" />
      </ThemeProvider>
    );

    const mascot = getByTestId('mascot-bee-barnaby');
    expect(mascot).toBeTruthy();
    expect(mascot.props.accessibilityRole).toBe('image');
    expect(getByTestId('mascot-wing-left')).toBeTruthy();
    expect(getByTestId('mascot-wing-right')).toBeTruthy();
    expect(getByTestId('mascot-goggles-barnaby')).toBeTruthy();
    expect(getByTestId('mascot-accessory-barnaby')).toBeTruthy();
    expect(getByTestId('mascot-mouth')).toBeTruthy();
    expect(getByTestId('mascot-mouth').props.children).toBe('▾');
    expect(mascot.props.accessibilityLabel).toContain('Barnaby the Scout Bee');

    // Does not have Honey's or Bumble's persona gear
    expect(queryByTestId('mascot-glasses-honey')).toBeNull();
    expect(queryByTestId('mascot-accessory-honey')).toBeNull();
    expect(queryByTestId('mascot-coin-honey')).toBeNull();
    expect(queryByTestId('mascot-accessory-bumble')).toBeNull();
    expect(queryByTestId('mascot-scarf-bumble')).toBeNull();
  });

  it('renders Honey the Hive Saver persona with banker glasses, gold coin with nectar sparkle, and sweet smile', () => {
    const { getByTestId, queryByTestId } = render(
      <ThemeProvider>
        <MascotBee name="honey" />
      </ThemeProvider>
    );

    const mascot = getByTestId('mascot-bee-honey');
    expect(mascot).toBeTruthy();
    expect(getByTestId('mascot-glasses-honey')).toBeTruthy();
    expect(getByTestId('mascot-accessory-honey')).toBeTruthy();
    expect(getByTestId('mascot-coin-honey')).toBeTruthy();
    expect(getByTestId('mascot-mouth')).toBeTruthy();
    expect(getByTestId('mascot-mouth').props.children).toBe('◡');
    expect(mascot.props.accessibilityLabel).toContain('Honey the Hive Saver');

    // Does not have Barnaby's or Bumble's persona gear
    expect(queryByTestId('mascot-goggles-barnaby')).toBeNull();
    expect(queryByTestId('mascot-accessory-barnaby')).toBeNull();
    expect(queryByTestId('mascot-accessory-bumble')).toBeNull();
    expect(queryByTestId('mascot-scarf-bumble')).toBeNull();
  });

  it('renders Bumble the Buffer Guard persona with cozy scarf, prominent guard shield, and relaxed smile', () => {
    const { getByTestId, queryByTestId } = render(
      <ThemeProvider>
        <MascotBee name="bumble" />
      </ThemeProvider>
    );

    const mascot = getByTestId('mascot-bee-bumble');
    expect(mascot).toBeTruthy();
    expect(getByTestId('mascot-scarf-bumble')).toBeTruthy();
    expect(getByTestId('mascot-accessory-bumble')).toBeTruthy();
    expect(getByTestId('mascot-mouth')).toBeTruthy();
    expect(getByTestId('mascot-mouth').props.children).toBe('‿');
    expect(mascot.props.accessibilityLabel).toContain('Bumble the Buffer Guard');

    // Does not have Barnaby's or Honey's persona gear
    expect(queryByTestId('mascot-goggles-barnaby')).toBeNull();
    expect(queryByTestId('mascot-accessory-barnaby')).toBeNull();
    expect(queryByTestId('mascot-glasses-honey')).toBeNull();
    expect(queryByTestId('mascot-accessory-honey')).toBeNull();
    expect(queryByTestId('mascot-coin-honey')).toBeNull();
  });

  it('renders all size variants cleanly (sm, md, lg, xl) with distinct visual elements scaled', () => {
    const { getByTestId } = render(
      <ThemeProvider>
        <MascotBee name="barnaby" size="sm" testID="bee-sm" />
        <MascotBee name="honey" size="md" testID="bee-md" />
        <MascotBee name="bumble" size="lg" testID="bee-lg" />
        <MascotBee name="barnaby" size="xl" testID="bee-xl" />
      </ThemeProvider>
    );

    expect(getByTestId('bee-sm')).toBeTruthy();
    expect(getByTestId('bee-md')).toBeTruthy();
    expect(getByTestId('bee-lg')).toBeTruthy();
    expect(getByTestId('bee-xl')).toBeTruthy();
  });

  it('initializes Animated.loop when animated is true and bypasses loop when animated is false', () => {
    const loopSpy = jest.spyOn(Animated, 'loop');

    // 1. Static: animated={false}
    loopSpy.mockClear();
    const { getByTestId: getStatic } = render(
      <ThemeProvider>
        <MascotBee name="honey" animated={false} testID="bee-static" />
      </ThemeProvider>
    );
    expect(getStatic('bee-static')).toBeTruthy();
    expect(loopSpy).not.toHaveBeenCalled();

    // 2. Animated: animated={true} (default)
    loopSpy.mockClear();
    const { getByTestId: getAnimated } = render(
      <ThemeProvider>
        <MascotBee name="honey" animated={true} testID="bee-animated" />
      </ThemeProvider>
    );
    expect(getAnimated('bee-animated')).toBeTruthy();
    expect(loopSpy).toHaveBeenCalled();

    loopSpy.mockRestore();
  });

  it('handles custom accessibility props and interactive clicks', () => {
    const handlePress = jest.fn();
    const handleHoverIn = jest.fn();
    const handleHoverOut = jest.fn();

    const { getByRole } = render(
      <ThemeProvider>
        <MascotBee
          name="barnaby"
          accessibilityLabel="Custom Barnaby Alt"
          onPress={handlePress}
          onHoverIn={handleHoverIn}
          onHoverOut={handleHoverOut}
          style={{ margin: 8 }}
        />
      </ThemeProvider>
    );

    const button = getByRole('button');
    expect(button.props.accessibilityLabel).toBe('Custom Barnaby Alt');

    fireEvent.press(button);
    expect(handlePress).toHaveBeenCalledTimes(1);

    fireEvent(button, 'hoverIn');
    expect(handleHoverIn).toHaveBeenCalledTimes(1);

    fireEvent(button, 'hoverOut');
    expect(handleHoverOut).toHaveBeenCalledTimes(1);
  });

  it('renders harmoniously under dark mode theme tokens for all personas', () => {
    const { getByTestId } = render(
      <ThemeProvider initialMode="dark">
        <MascotBee name="bumble" testID="dark-bumble" />
        <MascotBee name="barnaby" testID="dark-barnaby" />
        <MascotBee name="honey" testID="dark-honey" />
      </ThemeProvider>
    );

    expect(getByTestId('dark-bumble')).toBeTruthy();
    expect(getByTestId('mascot-accessory-bumble')).toBeTruthy();
    expect(getByTestId('mascot-scarf-bumble')).toBeTruthy();

    expect(getByTestId('dark-barnaby')).toBeTruthy();
    expect(getByTestId('mascot-goggles-barnaby')).toBeTruthy();
    expect(getByTestId('mascot-accessory-barnaby')).toBeTruthy();

    expect(getByTestId('dark-honey')).toBeTruthy();
    expect(getByTestId('mascot-glasses-honey')).toBeTruthy();
    expect(getByTestId('mascot-accessory-honey')).toBeTruthy();
    expect(getByTestId('mascot-coin-honey')).toBeTruthy();
  });

  it.each(['sm', 'md', 'lg', 'xl'] as const)(
    'preserves unmistakable persona visual gear at %s size',
    (size) => {
      const { getByTestId: getBarnaby } = render(
        <ThemeProvider>
          <MascotBee name="barnaby" size={size} testID={`barnaby-${size}`} />
        </ThemeProvider>
      );
      expect(getBarnaby(`barnaby-${size}`)).toBeTruthy();
      expect(getBarnaby('mascot-goggles-barnaby')).toBeTruthy();
      expect(getBarnaby('mascot-accessory-barnaby')).toBeTruthy();

      const { getByTestId: getHoney } = render(
        <ThemeProvider>
          <MascotBee name="honey" size={size} testID={`honey-${size}`} />
        </ThemeProvider>
      );
      expect(getHoney(`honey-${size}`)).toBeTruthy();
      expect(getHoney('mascot-glasses-honey')).toBeTruthy();
      expect(getHoney('mascot-accessory-honey')).toBeTruthy();
      expect(getHoney('mascot-coin-honey')).toBeTruthy();

      const { getByTestId: getBumble } = render(
        <ThemeProvider>
          <MascotBee name="bumble" size={size} testID={`bumble-${size}`} />
        </ThemeProvider>
      );
      expect(getBumble(`bumble-${size}`)).toBeTruthy();
      expect(getBumble('mascot-scarf-bumble')).toBeTruthy();
      expect(getBumble('mascot-accessory-bumble')).toBeTruthy();
    }
  );
});

describe('RouteRewardBadge component', () => {
  it('renders lightning fastest badge with default label, icon, and role="text"', () => {
    const { getByTestId, getByText } = render(
      <ThemeProvider>
        <RouteRewardBadge type="lightning" />
      </ThemeProvider>
    );

    const badge = getByTestId('reward-badge-lightning');
    expect(badge).toBeTruthy();
    expect(badge.props.accessibilityRole).toBe('text');
    expect(getByTestId('badge-icon-lightning')).toBeTruthy();
    expect(getByText('Fastest')).toBeTruthy();
  });

  it('renders nectar best value badge with default label and icon', () => {
    const { getByTestId, getByText } = render(
      <ThemeProvider>
        <RouteRewardBadge type="nectar" />
      </ThemeProvider>
    );

    expect(getByTestId('reward-badge-nectar')).toBeTruthy();
    expect(getByTestId('badge-icon-nectar')).toBeTruthy();
    expect(getByText('Best Value')).toBeTruthy();
  });

  it('renders shield most reliable badge with default label and icon', () => {
    const { getByTestId, getByText } = render(
      <ThemeProvider>
        <RouteRewardBadge type="shield" />
      </ThemeProvider>
    );

    expect(getByTestId('reward-badge-shield')).toBeTruthy();
    expect(getByTestId('badge-icon-shield')).toBeTruthy();
    expect(getByText('Most Reliable')).toBeTruthy();
  });

  it('supports custom label, style, textStyle, and sm size preset', () => {
    const { getByTestId, getByText } = render(
      <ThemeProvider>
        <RouteRewardBadge
          type="lightning"
          size="sm"
          label="Express Direct"
          testID="custom-lightning-badge"
          style={{ paddingHorizontal: 10 }}
          textStyle={{ fontWeight: '800' }}
        />
      </ThemeProvider>
    );

    expect(getByTestId('custom-lightning-badge')).toBeTruthy();
    expect(getByText('Express Direct')).toBeTruthy();
  });

  it('supports interactive press and hover events with role="button"', () => {
    const handlePress = jest.fn();
    const handleHoverIn = jest.fn();
    const handleHoverOut = jest.fn();

    const { getByRole } = render(
      <ThemeProvider>
        <RouteRewardBadge
          type="nectar"
          onPress={handlePress}
          onHoverIn={handleHoverIn}
          onHoverOut={handleHoverOut}
        />
      </ThemeProvider>
    );

    const button = getByRole('button');
    fireEvent.press(button);
    expect(handlePress).toHaveBeenCalledTimes(1);

    fireEvent(button, 'hoverIn');
    expect(handleHoverIn).toHaveBeenCalledTimes(1);

    fireEvent(button, 'hoverOut');
    expect(handleHoverOut).toHaveBeenCalledTimes(1);
  });

  it('handles disabled state properly and prevents interactive press', () => {
    const handlePress = jest.fn();

    const { getByTestId } = render(
      <ThemeProvider>
        <RouteRewardBadge
          type="shield"
          disabled={true}
          onPress={handlePress}
          testID="disabled-badge"
        />
      </ThemeProvider>
    );

    const badge = getByTestId('disabled-badge');
    expect(badge.props.accessibilityState).toEqual({ disabled: true });
    // When disabled, isInteractive is false so it renders a View with accessibilityRole="text"
    expect(badge.props.accessibilityRole).toBe('text');
  });

  it('renders correctly under dark mode with warm surface and border tokens', () => {
    const { getByTestId, getByText } = render(
      <ThemeProvider initialMode="dark">
        <RouteRewardBadge type="lightning" testID="dark-reward-badge" />
      </ThemeProvider>
    );

    expect(getByTestId('dark-reward-badge')).toBeTruthy();
    expect(getByText('Fastest')).toBeTruthy();
  });
});
