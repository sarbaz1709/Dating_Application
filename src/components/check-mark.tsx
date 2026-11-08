import { StyleSheet, View } from 'react-native';

/** A drawn check mark (no icon font needed). `size` is the bounding box. */
export function CheckMark({
  size = 14,
  color = '#FFFFFF',
  weight,
}: {
  size?: number;
  color?: string;
  weight?: number;
}) {
  const stroke = weight ?? Math.max(2, Math.round(size / 6));
  return (
    <View style={{ width: size, height: size }} accessible={false}>
      <View
        style={[
          styles.check,
          {
            width: size * 0.45,
            height: size * 0.8,
            borderRightWidth: stroke,
            borderBottomWidth: stroke,
            borderColor: color,
            left: size * 0.3,
            top: -size * 0.02,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  check: {
    position: 'absolute',
    transform: [{ rotate: '45deg' }],
    borderBottomRightRadius: 2,
  },
});
