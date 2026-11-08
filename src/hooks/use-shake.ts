import {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

/** A quick horizontal "nope" shake for invalid input. */
export function useShake() {
  const offset = useSharedValue(0);

  const style = useAnimatedStyle(() => ({ transform: [{ translateX: offset.get() }] }));

  function shake() {
    offset.set(
      withSequence(
        withTiming(-10, { duration: 50 }),
        withTiming(10, { duration: 70 }),
        withTiming(-7, { duration: 60 }),
        withTiming(7, { duration: 60 }),
        withSpring(0, { damping: 8, stiffness: 300 }),
      ),
    );
  }

  return { style, shake };
}
