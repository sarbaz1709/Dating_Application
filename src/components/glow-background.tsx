import { StyleSheet, View } from 'react-native';

type GlowVariant = 'welcome' | 'auth' | 'home';

interface Glow {
  top: `${number}%`;
  left: `${number}%`;
  /** "r, g, b" */
  rgb: string;
  /** Opacity at the centre of the glow. */
  peak: number;
  radius: number;
}

const LAYOUTS: Record<GlowVariant, Glow[]> = {
  welcome: [
    { top: '20%', left: '15%', rgb: '255, 77, 141', peak: 0.3, radius: 220 },
    { top: '34%', left: '88%', rgb: '139, 92, 255', peak: 0.28, radius: 200 },
    { top: '96%', left: '50%', rgb: '255, 138, 61', peak: 0.14, radius: 240 },
  ],
  auth: [
    { top: '0%', left: '95%', rgb: '255, 77, 141', peak: 0.22, radius: 220 },
    { top: '100%', left: '0%', rgb: '139, 92, 255', peak: 0.16, radius: 220 },
  ],
  home: [
    { top: '12%', left: '50%', rgb: '61, 220, 151', peak: 0.14, radius: 220 },
    { top: '75%', left: '100%', rgb: '255, 77, 141', peak: 0.16, radius: 220 },
  ],
};

/** Concentric layers per glow. More layers means a smoother falloff. */
const LAYERS = 18;

function GlowSpot({ glow }: { glow: Glow }) {
  // Stacking N layers of alpha `a` gives 1 - (1 - a)^N at the centre: solve for the peak.
  const layerAlpha = 1 - Math.pow(1 - glow.peak, 1 / LAYERS);
  return (
    <View style={[styles.anchor, { top: glow.top, left: glow.left }]}>
      {Array.from({ length: LAYERS }, (_, index) => {
        // Ease the radii so the light fades gently instead of in visible steps.
        const size = 2 * glow.radius * Math.pow(1 - index / LAYERS, 1.35);
        return (
          <View
            key={index}
            style={[
              styles.layer,
              {
                width: size,
                height: size,
                borderRadius: size / 2,
                marginLeft: -size / 2,
                marginTop: -size / 2,
                backgroundColor: `rgba(${glow.rgb}, ${layerAlpha.toFixed(4)})`,
              },
            ]}
          />
        );
      })}
    </View>
  );
}

/**
 * Soft ambient light behind a screen: stacked translucent circles approximate a radial gradient.
 * Plain Views only, so it looks identical on iOS, Android and web and costs almost nothing.
 */
export function GlowBackground({ variant }: { variant: GlowVariant }) {
  return (
    <View style={styles.container} pointerEvents="none">
      {LAYOUTS[variant].map((glow, index) => (
        <GlowSpot key={index} glow={glow} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    overflow: 'hidden',
  },
  anchor: {
    position: 'absolute',
    width: 0,
    height: 0,
  },
  layer: {
    position: 'absolute',
  },
});
