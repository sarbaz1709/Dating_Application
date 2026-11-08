import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeInUp } from 'react-native-reanimated';

import { Button } from '@/components/button';
import { GlowBackground } from '@/components/glow-background';
import { Screen } from '@/components/screen';
import { SoundWave } from '@/components/sound-wave';
import { Brand } from '@/constants/brand';
import { Colors, Radius, Spacing, Type } from '@/theme';

const STEPS = [
  { number: '01', title: 'Match', body: 'Like each other' },
  { number: '02', title: 'Talk', body: '5-min voice call' },
  { number: '03', title: 'Text', body: 'Only if it clicks' },
] as const;

export default function WelcomeScreen() {
  return (
    <Screen
      background={<GlowBackground variant="welcome" />}
      contentStyle={styles.content}
      footer={
        <Animated.View entering={FadeInUp.delay(450).duration(450)} style={styles.actions}>
          <Button
            testID="welcome-create-account"
            label="Create account"
            onPress={() => router.push('/register')}
          />
          <Button
            testID="welcome-log-in"
            label="I already have an account"
            variant="secondary"
            onPress={() => router.push('/login')}
          />
          <Text style={styles.legal}>18+ only. Be kind, be real.</Text>
        </Animated.View>
      }>
      <Animated.View entering={FadeIn.duration(500)} style={styles.brandRow}>
        <View style={styles.brandDot} />
        <Text style={styles.brandName}>{Brand.name}</Text>
      </Animated.View>

      <View style={styles.hero}>
        <Animated.View entering={FadeIn.delay(100).duration(700)}>
          <SoundWave bars={21} height={120} barWidth={7} gap={6} />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200).duration(500)} style={styles.headline}>
          <Text style={styles.heroLine} accessibilityRole="header">
            Talk first.
          </Text>
          <Text style={[styles.heroLine, styles.heroAccent]}>Text if it clicks.</Text>
        </Animated.View>

        <Animated.Text entering={FadeInDown.delay(300).duration(500)} style={styles.pitch}>
          {Brand.pitch}
        </Animated.Text>
      </View>

      <Animated.View entering={FadeInDown.delay(380).duration(500)} style={styles.steps}>
        {STEPS.map((step, index) => (
          <View key={step.number} style={styles.stepWrap}>
            <View style={styles.step}>
              <Text style={styles.stepNumber}>{step.number}</Text>
              <Text style={styles.stepTitle}>{step.title}</Text>
              <Text style={styles.stepBody}>{step.body}</Text>
            </View>
            {index < STEPS.length - 1 ? <View style={styles.connector} /> : null}
          </View>
        ))}
      </Animated.View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    justifyContent: 'space-between',
    gap: Spacing.xl,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  brandDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.accent,
    boxShadow: `0 0 12px 2px ${Colors.accent}`,
  },
  brandName: {
    ...Type.heading,
    color: Colors.text,
  },
  hero: {
    alignItems: 'center',
    gap: Spacing.xl,
    paddingTop: Spacing.lg,
  },
  headline: {
    alignItems: 'center',
  },
  heroLine: {
    ...Type.hero,
    fontSize: 46,
    lineHeight: 50,
    color: Colors.text,
    textAlign: 'center',
  },
  heroAccent: {
    color: Colors.accent,
  },
  pitch: {
    ...Type.body,
    color: Colors.textMuted,
    textAlign: 'center',
    maxWidth: 320,
  },
  steps: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  stepWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  step: {
    flex: 1,
    gap: 2,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: 'rgba(23, 21, 31, 0.85)',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  stepNumber: {
    ...Type.caption,
    color: Colors.accent,
    fontWeight: '800',
  },
  stepTitle: {
    ...Type.bodyStrong,
    color: Colors.text,
  },
  stepBody: {
    ...Type.caption,
    color: Colors.textMuted,
  },
  connector: {
    alignSelf: 'center',
    width: Spacing.sm,
    height: 2,
    backgroundColor: Colors.borderStrong,
  },
  actions: {
    gap: Spacing.sm,
  },
  legal: {
    ...Type.caption,
    color: Colors.textFaint,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
});
