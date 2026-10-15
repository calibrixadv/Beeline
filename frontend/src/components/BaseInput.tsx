import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  StyleProp,
  ViewStyle,
  TextStyle,
  NativeSyntheticEvent,
  TextInputFocusEventData,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { IconButton } from './IconButton';

export interface BaseInputProps {
  /** Current text value */
  value: string;
  /** Value change callback */
  onChangeText: (text: string) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Top label */
  label?: string;
  /** Left adornment */
  leftIcon?: React.ReactNode;
  /** Right adornment */
  rightIcon?: React.ReactNode;
  /** Whether a clear button appears when value is not empty */
  clearable?: boolean;
  /** Clear button callback */
  onClear?: () => void;
  /** Disabled state */
  disabled?: boolean;
  /** Error message */
  error?: string;
  /** Focus callbacks */
  onFocus?: (e: NativeSyntheticEvent<TextInputFocusEventData>) => void;
  onBlur?: (e: NativeSyntheticEvent<TextInputFocusEventData>) => void;
  /** Hover callbacks */
  onHoverIn?: () => void;
  onHoverOut?: () => void;
  /** Container style overrides */
  style?: StyleProp<ViewStyle>;
  /** TextInput style overrides */
  inputStyle?: StyleProp<TextStyle>;
  /** Accessibility */
  accessibilityLabel?: string;
  testID?: string;
}

export const BaseInput: React.FC<BaseInputProps> = ({
  value,
  onChangeText,
  placeholder,
  label,
  leftIcon,
  rightIcon,
  clearable = false,
  onClear,
  disabled = false,
  error,
  onFocus,
  onBlur,
  onHoverIn,
  onHoverOut,
  style,
  inputStyle,
  accessibilityLabel,
  testID,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const { theme, isDark } = useTheme();

  const handleFocus = (e: NativeSyntheticEvent<TextInputFocusEventData>) => {
    setIsFocused(true);
    onFocus?.(e);
  };

  const handleBlur = (e: NativeSyntheticEvent<TextInputFocusEventData>) => {
    setIsFocused(false);
    onBlur?.(e);
  };

  const handleHoverIn = () => {
    if (!disabled) {
      setIsHovered(true);
      onHoverIn?.();
    }
  };

  const handleHoverOut = () => {
    if (!disabled) {
      setIsHovered(false);
      onHoverOut?.();
    }
  };

  const handleClear = () => {
    onChangeText('');
    onClear?.();
  };

  const showClear = clearable && value.length > 0 && !disabled;

  return (
    <View style={[styles.wrapper, style]}>
      {label ? (
        <Text style={[styles.label, { color: theme.colors.textSecondary }]}>{label}</Text>
      ) : null}
      <View
        testID={testID ? `${testID}-container` : 'base-input-container'}
        onPointerEnter={handleHoverIn}
        onPointerLeave={handleHoverOut}
        // @ts-ignore React Native / Testing Library hover event support
        onHoverIn={handleHoverIn}
        // @ts-ignore
        onHoverOut={handleHoverOut}
        style={[
          styles.inputContainer,
          {
            backgroundColor: isDark ? theme.colors.surfaceSubtle : '#F8FAFC',
            borderColor: isDark ? theme.colors.border : '#E2E8F0',
          },
          isHovered && [
            styles.hovered,
            { borderColor: isDark ? theme.colors.borderStrong : '#94A3B8' },
          ],
          isFocused && [
            styles.focused,
            {
              borderColor: theme.colors.borderFocus,
              backgroundColor: isDark ? theme.colors.surfaceElevated : '#FFFFFF',
            },
          ],
          disabled && [
            styles.disabled,
            { backgroundColor: isDark ? '#141416' : '#F1F5F9' },
          ],
          error ? styles.hasError : null,
        ]}
      >
        {leftIcon ? <View style={styles.leftIconWrapper}>{leftIcon}</View> : null}
        <TextInput
          testID={testID}
          style={[styles.input, { color: theme.colors.textPrimary }, inputStyle]}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.textMuted}
          value={value}
          onChangeText={onChangeText}
          editable={!disabled}
          onFocus={handleFocus}
          onBlur={handleBlur}
          autoCorrect={false}
          accessibilityLabel={accessibilityLabel || label || placeholder}
        />
        {showClear ? (
          <IconButton
            iconName="close-circle"
            iconSize={18}
            iconColor={theme.colors.textMuted}
            onPress={handleClear}
            testID={`${testID ?? 'input'}-clear-btn`}
            accessibilityLabel="Clear input value"
            size="sm"
          />
        ) : rightIcon ? (
          <View style={styles.rightIconWrapper}>{rightIcon}</View>
        ) : null}
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    height: 42,
  },
  hovered: {
    borderColor: '#94A3B8',
  },
  focused: {
    borderColor: '#2563EB',
    backgroundColor: '#FFFFFF',
  },
  disabled: {
    backgroundColor: '#F1F5F9',
    opacity: 0.6,
  },
  hasError: {
    borderColor: '#DC2626',
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
    paddingVertical: 0,
  },
  leftIconWrapper: {
    marginRight: 8,
  },
  rightIconWrapper: {
    marginLeft: 8,
  },
  errorText: {
    fontSize: 11,
    color: '#DC2626',
    marginTop: 4,
    fontWeight: '600',
  },
});
