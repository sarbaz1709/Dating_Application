import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  ZoomIn,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { CheckMark } from '@/components/check-mark';
import { haptics } from '@/lib/haptics';
import { Colors, Radius, Spacing, Type } from '@/theme';

export interface ChoiceOption<T extends string> {
  value: T;
  label: string;
}

interface ChoiceGroupProps<T extends string> {
  options: readonly ChoiceOption<T>[];
  selected: readonly T[];
  onToggle: (value: T) => void;
  /** Checkboxes when true, radio buttons when false. */
  multiple?: boolean;
  /** Big tappable cards (setup) or compact chips (edit screen). */
  variant?: 'cards' | 'chips';
  testIDPrefix?: string;
  accessibilityLabel?: string;
}

function Choice<T extends string>({
  option,
  checked,
  multiple,
  variant,
  onPress,
  testID,
}: {
  option: ChoiceOption<T>;
  checked: boolean;
  multiple: boolean;
  variant: 'cards' | 'chips';
  onPress: () => void;
  testID?: string;
}) {
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));

  function press() {
    haptics.select();
    scale.set(
      withSequence(
        withTiming(0.96, { duration: 70 }),
        withSpring(1, { damping: 10, stiffness: 320 }),
      ),
    );
    onPress();
  }

  const isCard = variant === 'cards';
  return (
    <Pressable
      testID={testID}
      onPress={press}
      role={multiple ? 'checkbox' : 'radio'}
      aria-checked={checked}
      accessibilityLabel={option.label}>
      <Animated.View
        style={[
          isCard ? styles.card : styles.chip,
          checked && (isCard ? styles.cardChecked : styles.chipChecked),
          style,
        ]}>
        <Text
          style={[isCard ? styles.cardLabel : styles.chipLabel, checked && styles.labelChecked]}>
          {option.label}
        </Text>
        {isCard ? (
          <View
            style={[
              styles.indicator,
              multiple ? styles.indicatorSquare : styles.indicatorRound,
              checked && styles.indicatorChecked,
            ]}>
            {checked ? (
              <Animated.View entering={ZoomIn.springify().damping(12)}>
                <CheckMark size={12} color={Colors.textOnAccent} weight={2.5} />
              </Animated.View>
            ) : null}
          </View>
        ) : null}
      </Animated.View>
    </Pressable>
  );
}

/** Single- or multi-select options as cards or chips, with a little bounce on every tap. */
export function ChoiceGroup<T extends string>({
  options,
  selected,
  onToggle,
  multiple = false,
  variant = 'cards',
  testIDPrefix,
  accessibilityLabel,
}: ChoiceGroupProps<T>) {
  return (
    <View
      style={variant === 'cards' ? styles.cards : styles.chips}
      role={multiple ? 'group' : 'radiogroup'}
      accessibilityLabel={accessibilityLabel}>
      {options.map((option) => (
        <Choice
          key={option.value}
          option={option}
          checked={selected.includes(option.value)}
          multiple={multiple}
          variant={variant}
          onPress={() => onToggle(option.value)}
          testID={testIDPrefix ? `${testIDPrefix}-${option.value}` : undefined}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  cards: {
    gap: Spacing.md,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 64,
    paddingHorizontal: Spacing.xl,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  cardChecked: {
    borderColor: Colors.accent,
    backgroundColor: Colors.accentSoft,
  },
  cardLabel: {
    ...Type.bodyStrong,
    fontSize: 18,
    color: Colors.text,
  },
  chip: {
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.pill,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  chipChecked: {
    borderColor: Colors.accent,
    backgroundColor: Colors.accentSoft,
  },
  chipLabel: {
    ...Type.small,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  labelChecked: {
    color: Colors.text,
  },
  indicator: {
    width: 26,
    height: 26,
    borderWidth: 2,
    borderColor: Colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indicatorRound: {
    borderRadius: 13,
  },
  indicatorSquare: {
    borderRadius: 8,
  },
  indicatorChecked: {
    borderColor: Colors.accent,
    backgroundColor: Colors.accent,
  },
});
