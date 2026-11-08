import { useRef, useState } from 'react';
import { StyleSheet, Text, TextInput, View, type TextInputInstance } from 'react-native';

import { Colors, FontFamily, Radius, Spacing, Type } from '@/theme';

import type { BirthdayParts } from '../age';

interface BirthdayInputProps {
  value: BirthdayParts;
  onChange: (value: BirthdayParts) => void;
  error?: string;
  autoFocus?: boolean;
}

const FIELDS = [
  { key: 'month', label: 'Month', placeholder: 'MM', maxLength: 2, flex: 1 },
  { key: 'day', label: 'Day', placeholder: 'DD', maxLength: 2, flex: 1 },
  { key: 'year', label: 'Year', placeholder: 'YYYY', maxLength: 4, flex: 1.5 },
] as const;

/**
 * Month / Day / Year boxes with labels (so the order is never ambiguous). Focus jumps forward as
 * each box fills and back on backspace from an empty box.
 */
export function BirthdayInput({ value, onChange, error, autoFocus = false }: BirthdayInputProps) {
  const refs = useRef<(TextInputInstance | null)[]>([]);
  const [focused, setFocused] = useState<number | null>(null);

  function update(index: number, raw: string) {
    const field = FIELDS[index];
    if (!field) return;
    const digits = raw.replace(/\D/g, '').slice(0, field.maxLength);
    onChange({ ...value, [field.key]: digits });
    if (digits.length === field.maxLength) refs.current[index + 1]?.focus();
  }

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        {FIELDS.map((field, index) => (
          <View key={field.key} style={[styles.field, { flex: field.flex }]}>
            <Text style={styles.label}>{field.label}</Text>
            <TextInput
              ref={(node) => {
                refs.current[index] = node;
              }}
              testID={`birthday-${field.key}`}
              value={value[field.key]}
              onChangeText={(text) => update(index, text)}
              onKeyPress={({ nativeEvent }) => {
                if (nativeEvent.key === 'Backspace' && value[field.key] === '' && index > 0) {
                  refs.current[index - 1]?.focus();
                }
              }}
              onFocus={() => setFocused(index)}
              onBlur={() => setFocused((current) => (current === index ? null : current))}
              placeholder={field.placeholder}
              placeholderTextColor={Colors.textFaint}
              keyboardType="number-pad"
              inputMode="numeric"
              maxLength={field.maxLength}
              autoFocus={autoFocus && index === 0}
              selectionColor={Colors.accent}
              accessibilityLabel={`Birthday ${field.label.toLowerCase()}`}
              style={[
                styles.input,
                focused === index && styles.inputFocused,
                Boolean(error) && styles.inputError,
              ]}
            />
          </View>
        ))}
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
  row: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  field: {
    gap: Spacing.sm,
  },
  label: {
    ...Type.small,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  input: {
    height: 64,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    color: Colors.text,
    fontFamily: FontFamily.display,
    fontSize: 26,
    textAlign: 'center',
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
});
