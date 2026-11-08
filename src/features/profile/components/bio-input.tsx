import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputInstance } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { haptics } from '@/lib/haptics';
import { Colors, Radius, Spacing, Type } from '@/theme';

import { BIO_MAX_LENGTH, BIO_STARTERS } from '../constants';

interface BioInputProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  error?: string;
  label?: string;
  autoFocus?: boolean;
}

/** Multi-line bio with a live character count and tappable openers when it's empty. */
export function BioInput({
  value,
  onChange,
  onBlur,
  error,
  label = 'Bio',
  autoFocus = false,
}: BioInputProps) {
  const inputRef = useRef<TextInputInstance>(null);
  const [focused, setFocused] = useState(false);
  const remaining = BIO_MAX_LENGTH - value.length;
  const nearLimit = remaining <= 30;

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        <Text
          style={[styles.counter, nearLimit && styles.counterWarning]}
          accessibilityLabel={`${remaining} characters left`}>
          {value.length}/{BIO_MAX_LENGTH}
        </Text>
      </View>
      <TextInput
        ref={inputRef}
        testID="bio-input"
        value={value}
        onChangeText={(text) => onChange(text.slice(0, BIO_MAX_LENGTH))}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false);
          onBlur?.();
        }}
        multiline
        maxLength={BIO_MAX_LENGTH}
        autoFocus={autoFocus}
        placeholder="A line or two about you, and what a great first call sounds like."
        placeholderTextColor={Colors.textFaint}
        selectionColor={Colors.accent}
        accessibilityLabel={label}
        textAlignVertical="top"
        style={[styles.input, focused && styles.inputFocused, Boolean(error) && styles.inputError]}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {value.trim().length === 0 ? (
        <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.starters}>
          <Text style={styles.startersLabel}>Need a nudge?</Text>
          <View style={styles.starterRow}>
            {BIO_STARTERS.map((starter) => (
              <Pressable
                key={starter}
                onPress={() => {
                  haptics.select();
                  onChange(`${starter.replace(/…$/, '')} `);
                  inputRef.current?.focus();
                }}
                style={styles.starter}
                accessibilityRole="button"
                accessibilityLabel={`Start with: ${starter}`}>
                <Text style={styles.starterText}>{starter}</Text>
              </Pressable>
            ))}
          </View>
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.sm,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  label: {
    ...Type.small,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  counter: {
    ...Type.caption,
    color: Colors.textFaint,
    fontWeight: '700',
  },
  counterWarning: {
    color: Colors.warning,
  },
  input: {
    minHeight: 132,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    color: Colors.text,
    ...Type.body,
    padding: Spacing.lg,
    outlineWidth: 0,
  },
  inputFocused: {
    borderColor: Colors.accent,
    backgroundColor: Colors.surfaceHigh,
    boxShadow: `0 0 0 4px ${Colors.accentSoft}`,
  },
  inputError: {
    borderColor: Colors.danger,
  },
  error: {
    ...Type.small,
    color: Colors.danger,
  },
  starters: {
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  startersLabel: {
    ...Type.caption,
    color: Colors.textFaint,
    fontWeight: '700',
  },
  starterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  starter: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.borderStrong,
    backgroundColor: Colors.surface,
  },
  starterText: {
    ...Type.caption,
    color: Colors.text,
    fontWeight: '600',
  },
});
