import { useState, type Ref } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputInstance,
  type TextInputProps,
} from 'react-native';

import { Colors, Radius, Spacing, Type } from '@/theme';

interface TextFieldProps extends Omit<TextInputProps, 'style' | 'placeholderTextColor'> {
  label: string;
  error?: string;
  /** Adds a Show/Hide control and masks the value by default. */
  secureToggle?: boolean;
  ref?: Ref<TextInputInstance>;
}

export function TextField({
  label,
  error,
  secureToggle = false,
  ref,
  onFocus,
  onBlur,
  ...inputProps
}: TextFieldProps) {
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View
        style={[
          styles.inputShell,
          focused && styles.inputShellFocused,
          Boolean(error) && styles.inputShellError,
        ]}>
        <TextInput
          ref={ref}
          style={styles.input}
          placeholderTextColor={Colors.textFaint}
          selectionColor={Colors.accent}
          cursorColor={Colors.accent}
          secureTextEntry={secureToggle && !revealed}
          accessibilityLabel={label}
          accessibilityHint={error}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
          {...inputProps}
        />
        {secureToggle ? (
          <Pressable
            onPress={() => setRevealed((value) => !value)}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={revealed ? 'Hide password' : 'Show password'}>
            <Text style={styles.toggle}>{revealed ? 'Hide' : 'Show'}</Text>
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <Text style={styles.error} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.sm,
  },
  label: {
    ...Type.small,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  inputShell: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  inputShellFocused: {
    borderColor: Colors.accent,
    backgroundColor: Colors.surfaceHigh,
    boxShadow: `0 0 0 4px ${Colors.accentSoft}`,
  },
  inputShellError: {
    borderColor: Colors.danger,
  },
  input: {
    flex: 1,
    ...Type.body,
    color: Colors.text,
    paddingVertical: Spacing.md,
    outlineWidth: 0,
  },
  toggle: {
    ...Type.small,
    color: Colors.accent,
    fontWeight: '700',
  },
  error: {
    ...Type.small,
    color: Colors.danger,
  },
});
