import React, { useState } from 'react';
import { GestureResponderEvent } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BaseButton, BaseButtonProps, ButtonVariant } from './BaseButton';

export type AuthProvider = 'voyagerail' | 'google' | 'apple' | 'email' | 'guest';

export interface LoginButtonProps extends Omit<BaseButtonProps, 'iconLeft' | 'iconRight'> {
  /** Authentication provider */
  provider?: AuthProvider;
  /** Whether user is already logged in */
  isLoggedIn?: boolean;
  /** Automatically prevent double dispatch while an async onPress is pending */
  preventConcurrent?: boolean;
}

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

export const LoginButton: React.FC<LoginButtonProps> = ({
  provider = 'voyagerail',
  isLoggedIn = false,
  preventConcurrent = true,
  title,
  variant,
  accessibilityLabel,
  testID,
  loading = false,
  disabled = false,
  onPress,
  ...restProps
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const effectiveLoading = loading || isSubmitting;

  // Provider-specific default configurations
  const getProviderConfig = (): {
    defaultTitle: string;
    iconName: IoniconsName;
    defaultVariant: ButtonVariant;
    iconColor: string;
  } => {
    switch (provider) {
      case 'google':
        return {
          defaultTitle: isLoggedIn ? 'Signed in with Google' : 'Continue with Google',
          iconName: 'logo-google',
          defaultVariant: 'surface',
          iconColor: '#EA4335',
        };
      case 'apple':
        return {
          defaultTitle: isLoggedIn ? 'Signed in with Apple' : 'Continue with Apple',
          iconName: 'logo-apple',
          defaultVariant: 'secondary',
          iconColor: '#FFFFFF',
        };
      case 'email':
        return {
          defaultTitle: isLoggedIn ? 'Signed in with Email' : 'Sign in with Email',
          iconName: 'mail-outline',
          defaultVariant: 'outline',
          iconColor: '#2563EB',
        };
      case 'guest':
        return {
          defaultTitle: isLoggedIn ? 'Continuing as Guest' : 'Continue as Guest',
          iconName: 'person-outline',
          defaultVariant: 'ghost',
          iconColor: '#64748B',
        };
      case 'voyagerail':
      default:
        return {
          defaultTitle: isLoggedIn ? 'Signed in to VoyageRail' : 'Sign in to VoyageRail',
          iconName: isLoggedIn ? 'checkmark-circle' : 'train-outline',
          defaultVariant: isLoggedIn ? 'success' : 'primary',
          iconColor: '#FFFFFF',
        };
    }
  };

  const handlePress = async (e: GestureResponderEvent) => {
    if (effectiveLoading || disabled || !onPress) {
      return;
    }

    if (preventConcurrent) {
      try {
        const result: unknown = onPress(e);
        if (result && typeof (result as Promise<unknown>).then === 'function') {
          setIsSubmitting(true);
          await (result as Promise<unknown>);
        }
      } finally {
        setIsSubmitting(false);
      }
    } else {
      onPress(e);
    }
  };

  const config = getProviderConfig();
  const resolvedTitle = title ?? config.defaultTitle;
  const resolvedVariant = variant ?? config.defaultVariant;
  const resolvedTestId = testID ?? `login-button-${provider}`;
  const resolvedA11yLabel =
    accessibilityLabel ?? `${resolvedTitle} (${provider} authentication)`;

  return (
    <BaseButton
      {...restProps}
      title={resolvedTitle}
      variant={resolvedVariant}
      testID={resolvedTestId}
      accessibilityLabel={resolvedA11yLabel}
      loading={effectiveLoading}
      disabled={disabled}
      onPress={handlePress}
      iconLeft={<Ionicons name={config.iconName} size={18} color={config.iconColor} />}
    />
  );
};
