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
import { Ionicons } from '@expo/vector-icons';
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

  const renderAccessory = () => {
    if (name === 'barnaby') {
      const boosterW = Math.max(Math.round(14 * s), 8.5);
      const boosterH = Math.max(Math.round(17.5 * s), 10.5);
      const rocketIconSize = Math.max(Math.round(7.5 * s), 5);
      return (
        <View
          testID="mascot-accessory-barnaby"
          style={[
            styles.boosterContainer,
            {
              width: boosterW,
              height: boosterH,
              bottom: sizePx * 0.04,
              right: sizePx * 0.02,
            },
          ]}
        >
          {/* Rocket booster capsule body */}
          <View
            style={[
              styles.boosterBody,
              {
                width: boosterW,
                height: boosterH * 0.7,
                borderRadius: boosterW * 0.35,
                backgroundColor: '#EA580C',
                borderColor: '#FED7AA',
                borderWidth: Math.max(1 * s, 1),
              },
            ]}
          >
            <Ionicons
              name="rocket"
              size={rocketIconSize}
              color="#FFFFFF"
            />
          </View>
          {/* Exhaust thruster flame plume & speed dash */}
          <View
            style={[
              styles.thrusterFlame,
              {
                width: boosterW * 0.65,
                height: Math.max(4.5 * s, 3),
                borderBottomLeftRadius: 2.5 * s,
                borderBottomRightRadius: 2.5 * s,
                backgroundColor: '#F97316',
              },
            ]}
          >
            <View
              style={[
                styles.innerFlame,
                {
                  width: boosterW * 0.35,
                  height: Math.max(2.5 * s, 1.8),
                  borderBottomLeftRadius: 1.5 * s,
                  borderBottomRightRadius: 1.5 * s,
                  backgroundColor: '#FDE047',
                },
              ]}
            />
          </View>
        </View>
      );
    }

    if (name === 'honey') {
      const coinSize = Math.max(Math.round(15 * s), 9);
      const currencyFontSize = Math.max(Math.round(7.5 * s), 5);
      const sparkleBoxSize = Math.max(4.8 * s, 3.5);
      const sparkleIconSize = Math.max(Math.round(3.5 * s), 2.5);
      return (
        <View
          testID="mascot-accessory-honey"
          style={[
            styles.moneyContainer,
            {
              width: coinSize,
              height: coinSize,
              bottom: sizePx * 0.04,
              right: sizePx * 0.02,
            },
          ]}
        >
          {/* Big shiny gold coin */}
          <View
            testID="mascot-coin-honey"
            style={[
              styles.goldCoin,
              {
                width: coinSize,
                height: coinSize,
                borderRadius: coinSize / 2,
                backgroundColor: '#F59E0B',
                borderColor: '#B45309',
                borderWidth: Math.max(1.2 * s, 1),
              },
            ]}
          >
            {/* Inner coin rim for embossed look */}
            <View
              style={[
                styles.coinInnerRim,
                {
                  width: coinSize * 0.76,
                  height: coinSize * 0.76,
                  borderRadius: (coinSize * 0.76) / 2,
                  borderColor: '#FCD34D',
                  borderWidth: Math.max(0.6 * s, 0.5),
                },
              ]}
            >
              {/* Currency symbol (€) without overriding lineHeight for natural flex centering */}
              <Text
                style={[
                  styles.currencySymbol,
                  {
                    fontSize: currencyFontSize,
                  },
                ]}
              >
                €
              </Text>
            </View>

            {/* Nectar sparkle at top-right corner of coin */}
            <View
              style={[
                styles.nectarSparkle,
                {
                  width: sparkleBoxSize,
                  height: sparkleBoxSize,
                  borderRadius: sparkleBoxSize / 2,
                  top: -1.2 * s,
                  right: -1.2 * s,
                  backgroundColor: '#FEF08A',
                  borderColor: '#F59E0B',
                  borderWidth: Math.max(0.5 * s, 0.5),
                },
              ]}
            >
              <Ionicons
                name="sparkles"
                size={sparkleIconSize}
                color="#B45309"
              />
            </View>
          </View>
        </View>
      );
    }

    if (name === 'bumble') {
      const shieldW = Math.max(Math.round(15 * s), 9);
      const shieldH = Math.max(Math.round(18.5 * s), 11.5);
      const shieldIconSize = Math.max(Math.round(8 * s), 5);
      return (
        <View
          testID="mascot-accessory-bumble"
          style={[
            styles.shieldContainer,
            {
              width: shieldW,
              height: shieldH,
              borderTopLeftRadius: shieldW * 0.25,
              borderTopRightRadius: shieldW * 0.25,
              borderBottomLeftRadius: shieldW * 0.5,
              borderBottomRightRadius: shieldW * 0.5,
              backgroundColor: theme.colors.successBg,
              borderColor: theme.colors.success,
              borderWidth: Math.max(1.5 * s, 1.2),
              bottom: sizePx * 0.04,
              right: sizePx * 0.02,
            },
          ]}
        >
          {/* Inner heraldic shield crest */}
          <View
            style={[
              styles.shieldCrest,
              {
                width: shieldW * 0.74,
                height: shieldH * 0.72,
                borderTopLeftRadius: shieldW * 0.18,
                borderTopRightRadius: shieldW * 0.18,
                borderBottomLeftRadius: shieldW * 0.42,
                borderBottomRightRadius: shieldW * 0.42,
                backgroundColor: theme.colors.success,
              },
            ]}
          >
            <Ionicons
              name="shield-checkmark"
              size={shieldIconSize}
              color="#FFFFFF"
            />
          </View>
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
          {/* Eyes with reflections & Persona Head Gear (Goggles / Glasses) */}
          <View style={[styles.eyesArea, { marginTop: Math.max(Math.round(2 * s), 1.2) }]}>
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

            {/* Sleek aviator/racer goggles for Barnaby */}
            {name === 'barnaby' && (
              <View
                testID="mascot-goggles-barnaby"
                pointerEvents="none"
                style={[
                  styles.gogglesOverlay,
                  {
                    width: headSize * 1.15,
                    height: eyeSize * 1.6,
                  },
                ]}
              >
                {/* Elastic racer strap across head */}
                <View
                  style={[
                    styles.goggleStrap,
                    {
                      width: headSize * 1.18,
                      height: Math.max(1.8 * s, 1.2),
                      borderRadius: 1 * s,
                      backgroundColor: '#0F172A',
                    },
                  ]}
                />
                {/* Aerodynamic racer goggles frame */}
                <View
                  style={[
                    styles.goggleLensesRow,
                    {
                      width: headSize * 0.72 + eyeSize * 0.45,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.goggleLens,
                      {
                        width: eyeSize * 1.45,
                        height: eyeSize * 1.45,
                        borderRadius: (eyeSize * 1.45) / 2,
                        borderColor: '#0284C7',
                        borderWidth: Math.max(1 * s, 1),
                        backgroundColor: 'rgba(56, 189, 248, 0.45)',
                      },
                    ]}
                  >
                    <View
                      style={{
                        width: eyeGlint * 1.3,
                        height: eyeGlint * 1.3,
                        borderRadius: (eyeGlint * 1.3) / 2,
                        backgroundColor: '#FFFFFF',
                      }}
                    />
                  </View>
                  <View
                    style={{
                      width: 2.2 * s,
                      height: Math.max(1.2 * s, 1),
                      backgroundColor: '#0F172A',
                    }}
                  />
                  <View
                    style={[
                      styles.goggleLens,
                      {
                        width: eyeSize * 1.45,
                        height: eyeSize * 1.45,
                        borderRadius: (eyeSize * 1.45) / 2,
                        borderColor: '#0284C7',
                        borderWidth: Math.max(1 * s, 1),
                        backgroundColor: 'rgba(56, 189, 248, 0.45)',
                      },
                    ]}
                  >
                    <View
                      style={{
                        width: eyeGlint * 1.3,
                        height: eyeGlint * 1.3,
                        borderRadius: (eyeGlint * 1.3) / 2,
                        backgroundColor: '#FFFFFF',
                      }}
                    />
                  </View>
                </View>
              </View>
            )}

            {/* Cute round scholar/banker glasses for Honey */}
            {name === 'honey' && (
              <View
                testID="mascot-glasses-honey"
                pointerEvents="none"
                style={[
                  styles.glassesOverlay,
                  {
                    width: headSize * 1.15,
                    height: eyeSize * 1.6,
                  },
                ]}
              >
                {/* Thin bronze wire frame temples behind spectacles */}
                <View
                  style={[
                    styles.glassesTemple,
                    {
                      width: headSize * 1.15,
                      height: Math.max(1 * s, 0.8),
                      backgroundColor: '#78350F',
                    },
                  ]}
                />
                <View
                  style={[
                    styles.glassesRow,
                    {
                      width: headSize * 0.72 + eyeSize * 0.45,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.glassesRim,
                      {
                        width: eyeSize * 1.45,
                        height: eyeSize * 1.45,
                        borderRadius: (eyeSize * 1.45) / 2,
                        borderWidth: Math.max(1 * s, 1),
                        borderColor: '#78350F',
                        backgroundColor: 'rgba(254, 243, 199, 0.25)',
                      },
                    ]}
                  >
                    <View
                      style={{
                        width: eyeGlint,
                        height: eyeGlint,
                        borderRadius: eyeGlint / 2,
                        backgroundColor: '#FFFFFF',
                      }}
                    />
                  </View>
                  <View
                    style={{
                      width: 2.2 * s,
                      height: Math.max(1 * s, 0.8),
                      backgroundColor: '#78350F',
                    }}
                  />
                  <View
                    style={[
                      styles.glassesRim,
                      {
                        width: eyeSize * 1.45,
                        height: eyeSize * 1.45,
                        borderRadius: (eyeSize * 1.45) / 2,
                        borderWidth: Math.max(1 * s, 1),
                        borderColor: '#78350F',
                        backgroundColor: 'rgba(254, 243, 199, 0.25)',
                      },
                    ]}
                  >
                    <View
                      style={{
                        width: eyeGlint,
                        height: eyeGlint,
                        borderRadius: eyeGlint / 2,
                        backgroundColor: '#FFFFFF',
                      }}
                    />
                  </View>
                </View>
              </View>
            )}
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
              width: headSize * 1.2,
              height: Math.max(3.8 * s, 3.2),
              borderRadius: 2 * s,
              top: sizePx * 0.38,
            },
          ]}
        >
          {/* Cozy hanging scarf knot/tail */}
          <View
            style={[
              styles.scarfTail,
              {
                width: Math.max(3.5 * s, 3),
                height: Math.max(5 * s, 4),
                borderRadius: 1.5 * s,
                left: headSize * 0.15,
                top: Math.max(2 * s, 1.5),
              },
            ]}
          />
        </View>
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
  scarfTail: {
    position: 'absolute',
    backgroundColor: '#0369A1',
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
  mouth: {
    color: '#1C1917',
    fontWeight: '700',
    textAlign: 'center',
    marginTop: -1,
  },
  eyesArea: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  gogglesOverlay: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 6,
  },
  goggleStrap: {
    position: 'absolute',
  },
  goggleLensesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 2,
  },
  goggleLens: {
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    padding: 0.5,
  },
  glassesOverlay: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 6,
  },
  glassesTemple: {
    position: 'absolute',
  },
  glassesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  glassesRim: {
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    padding: 0.5,
  },
  shieldContainer: {
    position: 'absolute',
    zIndex: 5,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.18,
    shadowRadius: 2,
    elevation: 3,
  },
  shieldCrest: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  boosterContainer: {
    position: 'absolute',
    zIndex: 5,
    alignItems: 'center',
    justifyContent: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  boosterBody: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  thrusterFlame: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginTop: -0.5,
  },
  innerFlame: {
    marginTop: 0,
  },
  moneyContainer: {
    position: 'absolute',
    zIndex: 5,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.18,
    shadowRadius: 2,
    elevation: 3,
  },
  goldCoin: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  coinInnerRim: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  currencySymbol: {
    color: '#78350F',
    fontWeight: '900',
    textAlign: 'center',
  },
  nectarSparkle: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
