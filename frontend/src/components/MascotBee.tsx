import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  StyleProp,
  ViewStyle,
  AccessibilityRole,
  GestureResponderEvent,
  Pressable,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

export type MascotName = 'barnaby' | 'honey' | 'bumble';
export type MascotSize = 'sm' | 'md' | 'lg' | 'xl';

export interface MascotBeeProps {
  /** Persona name: barnaby (Scout), honey (Saver), bumble (Guard) */
  name: MascotName;
  /** Mascot size preset: sm (24px), md (40px), lg (64px), xl (96px) */
  size?: MascotSize;
  /** Loops gentle wing oscillation animation. Defaults to true. */
  animated?: boolean;
  /** Style overrides for mascot container */
  style?: StyleProp<ViewStyle>;
  /** Test identifier */
  testID?: string;
  /** Accessibility role (defaults to image, or button if onPress is provided) */
  accessibilityRole?: AccessibilityRole;
  /** Accessibility label describing the mascot persona */
  accessibilityLabel?: string;
  /** Optional press handler */
  onPress?: (event: GestureResponderEvent) => void;
  /** Hover callbacks */
  onHoverIn?: () => void;
  onHoverOut?: () => void;
}

const SIZE_MAP: Record<MascotSize, number> = {
  sm: 24,
  md: 40,
  lg: 64,
  xl: 96,
};

const DEFAULT_LABELS: Record<MascotName, string> = {
  barnaby: 'Barnaby the Scout Bee - Fastest routes with lightning speed',
  honey: 'Honey the Hive Saver - €10/hour value engine and savings',
  bumble: 'Bumble the Buffer Guard - Safe transfer buffers and CFR protection',
};

export const MascotBee: React.FC<MascotBeeProps> = ({
  name,
  size = 'md',
  animated = true,
  style,
  testID,
  accessibilityRole,
  accessibilityLabel,
  onPress,
  onHoverIn,
  onHoverOut,
}) => {
  const { theme } = useTheme();
  const sizePx = SIZE_MAP[size] ?? 40;
  const s = sizePx / 40; // Scale factor relative to md (40px)

  const wingAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!animated) {
      wingAnim.setValue(0);
      return;
    }

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(wingAnim, {
          toValue: 1,
          duration: 140,
          useNativeDriver: true,
        }),
        Animated.timing(wingAnim, {
          toValue: -1,
          duration: 140,
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();

    // Safeguard for test environment: stop immediately after starting to avoid open timers
    if (typeof process !== 'undefined' && process.env.NODE_ENV === 'test') {
      animation.stop();
      return;
    }

    return () => {
      animation.stop();
    };
  }, [animated, wingAnim]);

  // Dynamic wing rotation transforms
  const leftWingRotate = wingAnim.interpolate({
    inputRange: [-1, 1],
    outputRange: ['-24deg', '-6deg'],
  });

  const rightWingRotate = wingAnim.interpolate({
    inputRange: [-1, 1],
    outputRange: ['6deg', '24deg'],
  });

  const isInteractive = typeof onPress === 'function' || typeof onHoverIn === 'function' || typeof onHoverOut === 'function';
  const resolvedRole = accessibilityRole ?? (isInteractive ? 'button' : 'image');
  const resolvedLabel = accessibilityLabel ?? DEFAULT_LABELS[name];
  const resolvedTestId = testID ?? `mascot-bee-${name}`;

  // Proportional dimensional tokens
  const bodyW = 20 * s;
  const bodyH = 22 * s;
  const headSize = 16 * s;
  const wingW = 12 * s;
  const wingH = 17 * s;
  const eyeSize = 3.2 * s;
  const eyeGlint = 1.2 * s;
  const cheekSize = 3.6 * s;
  const stingerH = 3 * s;
  const stingerW = 4 * s;
  const stripeH = 3 * s;
  const accessorySize = Math.max(10 * s, 10);
  const iconSize = Math.max(Math.round(8 * s), 7);

  const renderAccessory = () => {
    if (name === 'barnaby') {
      return (
        <View
          testID="mascot-accessory-barnaby"
          style={[
            styles.accessoryContainer,
            {
              width: accessorySize,
              height: accessorySize,
              borderRadius: accessorySize / 2,
              backgroundColor: theme.colors.brandHoneyLight,
              borderColor: theme.colors.brandHoneyDark,
              borderWidth: Math.max(1 * s, 1),
              bottom: 0,
              right: 0,
            },
          ]}
        >
          <Ionicons name="flash" size={iconSize} color={theme.colors.brandHoneyDark} />
        </View>
      );
    }

    if (name === 'honey') {
      return (
        <View
          testID="mascot-accessory-honey"
          style={[
            styles.accessoryContainer,
            {
              width: accessorySize,
              height: accessorySize,
              borderRadius: accessorySize / 2,
              backgroundColor: theme.colors.brandHoneyLight,
              borderColor: theme.colors.brandHoney,
              borderWidth: Math.max(1 * s, 1),
              bottom: 0,
              right: 0,
            },
          ]}
        >
          <MaterialCommunityIcons name="bee-flower" size={iconSize} color={theme.colors.brandHoneyDark} />
          <View
            testID="mascot-coin-honey"
            style={[
              styles.coinSparkle,
              {
                width: Math.max(7 * s, 7),
                height: Math.max(7 * s, 7),
                borderRadius: Math.max(3.5 * s, 3.5),
                backgroundColor: theme.colors.brandHoney,
                borderColor: theme.colors.brandHoneyDark,
                borderWidth: Math.max(0.5 * s, 0.5),
              },
            ]}
          >
            <Text
              style={[
                styles.coinText,
                {
                  fontSize: Math.max(4.5 * s, 4),
                  lineHeight: Math.max(5.5 * s, 5),
                },
              ]}
            >
              ¢
            </Text>
          </View>
        </View>
      );
    }

    if (name === 'bumble') {
      return (
        <View
          testID="mascot-accessory-bumble"
          style={[
            styles.accessoryContainer,
            {
              width: accessorySize,
              height: accessorySize,
              borderRadius: accessorySize / 2,
              backgroundColor: theme.colors.successBg,
              borderColor: theme.colors.success,
              borderWidth: Math.max(1 * s, 1),
              bottom: 0,
              right: 0,
            },
          ]}
        >
          <Ionicons name="shield-checkmark" size={iconSize} color={theme.colors.success} />
        </View>
      );
    }

    return null;
  };

  const mascotVisual = (
    <View
      style={[
        styles.mascotContainer,
        {
          width: sizePx,
          height: sizePx,
        },
      ]}
    >
      {/* Animated Wings behind body */}
      <View style={styles.wingsWrapper} pointerEvents="none">
        <Animated.View
          testID="mascot-wing-left"
          style={[
            styles.wing,
            {
              width: wingW,
              height: wingH,
              borderRadius: wingW / 2,
              borderColor: theme.colors.honeyBorder,
              left: sizePx / 2 - wingW * 1.1,
              top: sizePx * 0.18,
              transform: [{ rotate: leftWingRotate }],
            },
          ]}
        />
        <Animated.View
          testID="mascot-wing-right"
          style={[
            styles.wing,
            {
              width: wingW,
              height: wingH,
              borderRadius: wingW / 2,
              borderColor: theme.colors.honeyBorder,
              right: sizePx / 2 - wingW * 1.1,
              top: sizePx * 0.18,
              transform: [{ rotate: rightWingRotate }],
            },
          ]}
        />
      </View>

      {/* Head and Antennae */}
      <View
        style={[
          styles.headWrapper,
          {
            top: sizePx * 0.08,
            alignItems: 'center',
          },
        ]}
      >
        {/* Antennae */}
        <View style={[styles.antennaeRow, { width: headSize * 1.2 }]}>
          {name === 'barnaby' ? (
            <>
              <View style={[styles.antennaBarnaby, { transform: [{ rotate: '-18deg' }] }]}>
                <Ionicons name="flash" size={Math.max(6 * s, 6)} color={theme.colors.brandHoneyDark} />
              </View>
              <View style={[styles.antennaBarnaby, { transform: [{ rotate: '18deg' }] }]}>
                <Ionicons name="flash" size={Math.max(6 * s, 6)} color={theme.colors.brandHoneyDark} />
              </View>
            </>
          ) : (
            <>
              <View
                style={[
                  styles.antennaDefault,
                  {
                    width: Math.max(1.5 * s, 1),
                    height: 5 * s,
                    transform: [{ rotate: '-18deg' }],
                  },
                ]}
              >
                <View
                  style={[
                    styles.antennaTip,
                    {
                      width: 2.8 * s,
                      height: 2.8 * s,
                      borderRadius: (2.8 * s) / 2,
                      backgroundColor: name === 'honey' ? theme.colors.brandHoney : '#1C1917',
                    },
                  ]}
                />
              </View>
              <View
                style={[
                  styles.antennaDefault,
                  {
                    width: Math.max(1.5 * s, 1),
                    height: 5 * s,
                    transform: [{ rotate: '18deg' }],
                  },
                ]}
              >
                <View
                  style={[
                    styles.antennaTip,
                    {
                      width: 2.8 * s,
                      height: 2.8 * s,
                      borderRadius: (2.8 * s) / 2,
                      backgroundColor: name === 'honey' ? theme.colors.brandHoney : '#1C1917',
                    },
                  ]}
                />
              </View>
            </>
          )}
        </View>

        {/* Head circle */}
        <View
          style={[
            styles.headCircle,
            {
              width: headSize,
              height: headSize,
              borderRadius: headSize / 2,
              backgroundColor: theme.colors.brandHoney,
            },
          ]}
        >
          {/* Eyes with reflections */}
          <View style={[styles.eyesRow, { width: headSize * 0.72 }]}>
            <View
              style={[
                styles.eye,
                {
                  width: eyeSize,
                  height: eyeSize,
                  borderRadius: eyeSize / 2,
                },
              ]}
            >
              <View
                style={[
                  styles.eyeGlint,
                  {
                    width: eyeGlint,
                    height: eyeGlint,
                    borderRadius: eyeGlint / 2,
                  },
                ]}
              />
            </View>
            <View
              style={[
                styles.eye,
                {
                  width: eyeSize,
                  height: eyeSize,
                  borderRadius: eyeSize / 2,
                },
              ]}
            >
              <View
                style={[
                  styles.eyeGlint,
                  {
                    width: eyeGlint,
                    height: eyeGlint,
                    borderRadius: eyeGlint / 2,
                  },
                ]}
              />
            </View>
          </View>

          {/* Rosy Cheeks & Expressive Mouth */}
          <View style={[styles.cheeksRow, { width: headSize * 0.9 }]}>
            <View
              style={[
                styles.cheek,
                {
                  width: cheekSize,
                  height: cheekSize,
                  borderRadius: cheekSize / 2,
                },
              ]}
            />
            <Text
              testID="mascot-mouth"
              style={[
                styles.mouth,
                {
                  fontSize: Math.max(Math.round(5.5 * s), 5),
                  lineHeight: Math.max(Math.round(6.5 * s), 6),
                },
              ]}
            >
              {name === 'honey' ? '◡' : name === 'bumble' ? '‿' : '▾'}
            </Text>
            <View
              style={[
                styles.cheek,
                {
                  width: cheekSize,
                  height: cheekSize,
                  borderRadius: cheekSize / 2,
                },
              ]}
            />
          </View>
        </View>
      </View>

      {/* Cozy Scarf for Bumble */}
      {name === 'bumble' && (
        <View
          testID="mascot-scarf-bumble"
          style={[
            styles.scarf,
            {
              width: headSize * 1.15,
              height: Math.max(3.5 * s, 3),
              borderRadius: 2 * s,
              top: sizePx * 0.38,
            },
          ]}
        />
      )}

      {/* Torso with Honey & Charcoal Stripes */}
      <View
        style={[
          styles.bodyTorso,
          {
            width: bodyW,
            height: bodyH,
            borderRadius: bodyW / 2,
            backgroundColor: theme.colors.brandHoney,
            borderColor: theme.colors.honeyBorder,
            borderWidth: Math.max(0.75 * s, 0.5),
            top: sizePx * 0.34,
          },
        ]}
      >
        {/* Charcoal Stripe 1 */}
        <View
          style={[
            styles.stripe,
            {
              width: bodyW * 0.88,
              height: stripeH,
              borderRadius: stripeH / 2,
              top: bodyH * 0.3,
            },
          ]}
        />
        {/* Charcoal Stripe 2 */}
        <View
          style={[
            styles.stripe,
            {
              width: bodyW * 0.76,
              height: stripeH,
              borderRadius: stripeH / 2,
              top: bodyH * 0.6,
            },
          ]}
        />
        {/* Stinger at bottom tip */}
        <View
          style={[
            styles.stinger,
            {
              width: stingerW,
              height: stingerH,
              borderTopWidth: stingerH,
              borderLeftWidth: stingerW / 2,
              borderRightWidth: stingerW / 2,
              bottom: -stingerH * 0.7,
            },
          ]}
        />
      </View>

      {/* Persona specific accessory badge */}
      {renderAccessory()}
    </View>
  );

  if (isInteractive) {
    return (
      <Pressable
        testID={resolvedTestId}
        accessibilityRole={resolvedRole}
        accessibilityLabel={resolvedLabel}
        onPress={onPress}
        onHoverIn={onHoverIn}
        onHoverOut={onHoverOut}
        style={[styles.container, style]}
      >
        {mascotVisual}
      </Pressable>
    );
  }

  return (
    <View
      testID={resolvedTestId}
      accessibilityRole={resolvedRole}
      accessibilityLabel={resolvedLabel}
      style={[styles.container, style]}
    >
      {mascotVisual}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  mascotContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  wingsWrapper: {
    ...StyleSheet.absoluteFillObject,
  },
  wing: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderColor: '#FDE68A',
    borderWidth: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  headWrapper: {
    position: 'absolute',
    zIndex: 3,
  },
  antennaeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: -1,
  },
  antennaBarnaby: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  antennaDefault: {
    backgroundColor: '#1C1917',
    alignItems: 'center',
    borderRadius: 1,
  },
  antennaTip: {
    position: 'absolute',
    top: -2,
  },
  headCircle: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  eyesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  eye: {
    backgroundColor: '#1C1917',
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    padding: 0.5,
  },
  eyeGlint: {
    backgroundColor: '#FFFFFF',
  },
  cheeksRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 1,
  },
  cheek: {
    backgroundColor: 'rgba(244, 63, 94, 0.45)',
  },
  scarf: {
    position: 'absolute',
    backgroundColor: '#0284C7',
    zIndex: 4,
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 1,
  },
  bodyTorso: {
    position: 'absolute',
    alignItems: 'center',
    zIndex: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 2,
    elevation: 2,
  },
  stripe: {
    position: 'absolute',
    backgroundColor: '#1C1917',
  },
  stinger: {
    position: 'absolute',
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#1C1917',
  },
  accessoryContainer: {
    position: 'absolute',
    zIndex: 5,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 3,
  },
  mouth: {
    color: '#1C1917',
    fontWeight: '700',
    textAlign: 'center',
    marginTop: -1,
  },
  coinSparkle: {
    position: 'absolute',
    top: -3,
    right: -3,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 2,
  },
  coinText: {
    color: '#1C1917',
    fontWeight: '900',
    textAlign: 'center',
  },
});
