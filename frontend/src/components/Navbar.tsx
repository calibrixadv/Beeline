import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePathname } from 'expo-router';
import { useTheme } from '../context/ThemeContext';
import { useTripPlanner } from '../context/TripContext';
import { useScreenTransition } from '../context/ScreenTransitionContext';
import { BaseButton } from './BaseButton';
import { IconButton } from './IconButton';


export interface NavbarProps {
  /** Override active route for testing or storybook */
  activeRoute?: string;
  /** Navigation callback handler */
  onNavigate?: (route: string) => void;
  /** Whether to show the theme mode toggle button */
  showThemeToggle?: boolean;
  /** Whether to show the quick action jump button */
  showQuickAction?: boolean;
  /** Container style overrides */
  style?: StyleProp<ViewStyle>;
  /** Test identifier */
  testID?: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeRoute: propActiveRoute,
  onNavigate,
  showThemeToggle = true,
  showQuickAction = true,
  style,
  testID = 'navbar-container',
}) => {
  const { theme, isDark, toggleTheme } = useTheme();
  const { getTripItemCount } = useTripPlanner();
  const { navigateWithTransition } = useScreenTransition();

  // Safely get current route
  let currentPath = '/';
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const hookPath = usePathname();
    if (hookPath) {
      currentPath = hookPath;
    }
  } catch {
    currentPath = '/';
  }

  const activePath = propActiveRoute ?? currentPath;
  const tripCount = getTripItemCount();

  const handleNav = (route: string) => {
    if (onNavigate) {
      onNavigate(route);
    } else {
      navigateWithTransition(route, { message: `Loading ${route.replace('/', '') || 'Home'}...` });
    }
  };

  const navLinks = [
    { label: 'Home', route: '/', icon: 'home-outline' as const },
    { label: 'Schedules', route: '/schedules', icon: 'time-outline' as const },
    {
      label: 'My Trip',
      route: '/my-trip',
      icon: 'briefcase-outline' as const,
      badgeCount: tripCount,
    },
  ];

  return (
    <View
      testID={testID}
      accessibilityRole="header"
      accessibilityLabel="Beeline Main Navigation"
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.navbarBg,
          borderBottomColor: theme.colors.navbarBorder,
        },
        style,
      ]}
    >
      <View style={styles.content}>
        {/* Brand & Placeholder Icons Group */}
        <TouchableOpacity
          testID="navbar-brand-touchable"
          style={styles.brandContainer}
          onPress={() => handleNav('/')}
          accessibilityRole="button"
          accessibilityLabel="Beeline Home"
        >
          {/* Placeholder Icon: Stylized Beeline Transit Badge */}
          <View
            testID="navbar-placeholder-icon"
            accessibilityLabel="Beeline Placeholder Icon"
            style={[
              styles.iconBadge,
              {
                backgroundColor: theme.colors.brandYellow,
              },
            ]}
          >
            <Ionicons name="flash" size={18} color="#000000" />
          </View>

          {/* Brand Name */}
          <View style={styles.brandTextGroup}>
            <View style={styles.titleRow}>
              <Text style={styles.brandTitle}>BEELINE</Text>
              <View
                style={[
                  styles.dot,
                  {
                    backgroundColor: theme.colors.brandYellow,
                  },
                ]}
              />
            </View>
            <Text style={styles.brandTagline}>RAIL & TRANSIT</Text>
          </View>

          {/* Placeholder Favicon Indicator Tag */}
          <View
            testID="navbar-placeholder-favicon"
            accessibilityLabel="Beeline Placeholder Favicon"
            style={styles.faviconPlaceholderTag}
          >
            <Text style={styles.faviconEmoji}>🐝</Text>
            <Text style={styles.faviconTagText}>FAV</Text>
          </View>
        </TouchableOpacity>

        {/* Navigation Links */}
        <View style={styles.navLinksRow}>
          {navLinks.map((link) => {
            const isActive =
              link.route === '/'
                ? activePath === '/' || activePath === ''
                : activePath.startsWith(link.route) ||
                  (link.route === '/schedules' && activePath.startsWith('/trains'));

            return (
              <TouchableOpacity
                key={link.route}
                testID={`navbar-link-${link.label.toLowerCase().replace(/\s+/g, '-')}`}
                style={[
                  styles.navLink,
                  isActive && [
                    styles.navLinkActive,
                    { borderBottomColor: theme.colors.brandYellow },
                  ],
                ]}
                onPress={() => handleNav(link.route)}
                accessibilityRole="link"
                accessibilityLabel={link.label}
                accessibilityState={{ selected: isActive }}
              >
                <Ionicons
                  name={link.icon}
                  size={16}
                  color={isActive ? theme.colors.brandYellow : theme.colors.navbarSubtext}
                />
                <Text
                  style={[
                    styles.navLinkText,
                    {
                      color: isActive ? theme.colors.brandYellow : theme.colors.navbarText,
                      fontWeight: isActive ? '800' : '600',
                    },
                  ]}
                >
                  {link.label}
                </Text>

                {link.badgeCount !== undefined && link.badgeCount > 0 && (
                  <View
                    testID="navbar-trip-count-badge"
                    style={[
                      styles.countBadge,
                      {
                        backgroundColor: theme.colors.brandYellow,
                      },
                    ]}
                  >
                    <Text style={styles.countBadgeText}>{link.badgeCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Right Side Actions: Quick Action CTA & Theme Toggle */}
        <View style={styles.actionsRow}>
          {showQuickAction && (
            <BaseButton
              testID="navbar-action-btn"
              variant="primary"
              size="sm"
              title="Jump into Action"
              iconRight={<Ionicons name="arrow-forward" size={14} color="#000000" />}
              onPress={() => handleNav('/schedules')}
              style={styles.ctaButton}
              accessibilityLabel="Jump directly into route action"
            />
          )}

          {showThemeToggle && (
            <IconButton
              testID="navbar-theme-toggle"
              iconName={isDark ? 'sunny' : 'moon'}
              iconSize={18}
              iconColor={isDark ? theme.colors.brandYellow : '#FFFFFF'}
              shape="rounded"
              size="sm"
              onPress={toggleTheme}
              accessibilityLabel={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              style={[
                styles.themeToggleBtn,
                {
                  backgroundColor: isDark ? '#1F1F23' : '#18181B',
                  borderColor: isDark ? theme.colors.brandYellow : '#27272A',
                },
              ]}
            />
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    borderBottomWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
    zIndex: 100,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBadge: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandTextGroup: {
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  brandTitle: {
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: 1.5,
    color: '#FFFFFF',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  brandTagline: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.5,
    color: '#A1A1AA',
  },
  faviconPlaceholderTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
  },
  faviconEmoji: {
    fontSize: 10,
  },
  faviconTagText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.5,
  },
  navLinksRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  navLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    borderRadius: 6,
  },
  navLinkActive: {
    backgroundColor: 'rgba(255, 199, 0, 0.08)',
  },
  navLinkText: {
    fontSize: 14,
  },
  countBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
    minWidth: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countBadgeText: {
    color: '#000000',
    fontSize: 10,
    fontWeight: '900',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ctaButton: {
    backgroundColor: '#FFC700',
    borderColor: '#FFC700',
  },
  themeToggleBtn: {
    borderWidth: 1,
  },
});
