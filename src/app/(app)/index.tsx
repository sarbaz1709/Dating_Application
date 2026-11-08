import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  FadeInDown,
  ZoomIn,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { Button } from '@/components/button';
import { CheckMark } from '@/components/check-mark';
import { ConfettiBurst } from '@/components/confetti-burst';
import { FormMessage } from '@/components/form-message';
import { GlowBackground } from '@/components/glow-background';
import { Screen } from '@/components/screen';
import { SoundWave } from '@/components/sound-wave';
import { Brand } from '@/constants/brand';
import { useSignOut } from '@/features/authentication/hooks';
import { useSessionStore } from '@/features/authentication/session-store';
import { haptics } from '@/lib/haptics';
import { Colors, Radius, SignalGradient, Spacing, Type } from '@/theme';

type StepState = 'done' | 'next' | 'locked';

/**
 * The road to a first call. Only the account step is real today; the others become live as each
 * MVP feature ships (profile, vibe check, discovery and calls). They are display-only, not
 * buttons, so nothing here pretends to work before it does.
 */
const JOURNEY: { title: string; body: string; state: StepState }[] = [
  { title: 'Create your account', body: "You're in. Nice.", state: 'done' },
  {
    title: 'Build your profile',
    body: 'Photos, a short bio, who you want to meet.',
    state: 'next',
  },
  { title: 'Take the vibe check', body: 'Five quick questions.', state: 'locked' },
  { title: 'Make your first call', body: 'Five minutes. Then decide.', state: 'locked' },
];

function ProgressBar({ progress }: { progress: number }) {
  const width = useSharedValue(0);
  useEffect(() => {
    width.set(
      withDelay(350, withTiming(progress, { duration: 900, easing: Easing.out(Easing.cubic) })),
    );
  }, [progress, width]);
  const style = useAnimatedStyle(() => ({ width: `${width.get() * 100}%` }));

  return (
    <View
      style={styles.progressTrack}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(progress * 100) }}>
      <Animated.View style={[styles.progressFill, style]}>
        <LinearGradient
          colors={SignalGradient}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
}

function StepBadge({ state, index }: { state: StepState; index: number }) {
  if (state === 'done') {
    return (
      <Animated.View entering={ZoomIn.delay(500).springify().damping(10)} style={styles.badgeDone}>
        <CheckMark size={12} color={Colors.background} weight={2.5} />
      </Animated.View>
    );
  }
  return (
    <View style={[styles.badge, state === 'next' && styles.badgeNext]}>
      <Text style={[styles.badgeText, state === 'next' && styles.badgeTextNext]}>{index + 1}</Text>
    </View>
  );
}

export default function HomeScreen() {
  const email = useSessionStore((state) => state.session?.user.email);
  const celebrationPending = useSessionStore((state) => state.celebrationPending);
  const clearCelebration = useSessionStore((state) => state.clearCelebration);
  // Snapshot on first render: brand-new accounts get the welcome party exactly once.
  const [isNewAccount] = useState(celebrationPending);
  const signOut = useSignOut();

  useEffect(() => {
    if (isNewAccount) {
      haptics.success();
      clearCelebration();
    }
  }, [isNewAccount, clearCelebration]);

  const completed = JOURNEY.filter((step) => step.state === 'done').length;
  const progress = completed / JOURNEY.length;

  return (
    <Screen
      background={<GlowBackground variant="home" />}
      footer={
        <>
          <FormMessage message={signOut.error?.message} />
          <Button
            testID="home-log-out"
            label="Log out"
            variant="secondary"
            onPress={() => signOut.mutate()}
            loading={signOut.isPending}
          />
        </>
      }>
      <View style={styles.header}>
        <View style={styles.brandRow}>
          <View style={styles.brandDot} />
          <Text style={styles.brandName}>{Brand.name}</Text>
        </View>
        <SoundWave bars={9} height={22} barWidth={3} gap={3} />
      </View>

      <View style={styles.hero}>
        <View style={styles.badgeHeroWrap}>
          <Animated.View entering={ZoomIn.springify().damping(9)} style={styles.heroBadge}>
            <LinearGradient
              colors={SignalGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[StyleSheet.absoluteFill, styles.heroBadgeFill]}
            />
            <CheckMark size={34} color={Colors.textOnAccent} weight={5} />
          </Animated.View>
          {isNewAccount ? <ConfettiBurst /> : null}
        </View>
        <Animated.Text
          entering={FadeInDown.delay(150).duration(450)}
          style={styles.heroTitle}
          accessibilityRole="header">
          {isNewAccount ? "You're in." : 'Welcome back.'}
        </Animated.Text>
        <Animated.Text entering={FadeInDown.delay(250).duration(450)} style={styles.heroBody}>
          {isNewAccount
            ? 'Your account is live. Next up: a profile worth calling.'
            : 'Pick up where you left off.'}
        </Animated.Text>
        {email ? (
          <Animated.View entering={FadeInDown.delay(320).duration(450)} style={styles.emailPill}>
            <Text style={styles.emailText} numberOfLines={1}>
              {email}
            </Text>
          </Animated.View>
        ) : null}
      </View>

      <Animated.View entering={FadeInDown.delay(400).duration(500)} style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Road to your first call</Text>
          <Text style={styles.cardMeta}>
            {completed}/{JOURNEY.length}
          </Text>
        </View>
        <ProgressBar progress={progress} />
        <View style={styles.steps}>
          {JOURNEY.map((step, index) => (
            <View key={step.title} style={styles.step}>
              <StepBadge state={step.state} index={index} />
              <View style={styles.stepCopy}>
                <Text style={[styles.stepTitle, step.state === 'locked' && styles.stepTitleLocked]}>
                  {step.title}
                </Text>
                <Text style={styles.stepBody}>{step.body}</Text>
              </View>
              {step.state === 'next' ? <Text style={styles.upNext}>Up next</Text> : null}
            </View>
          ))}
        </View>
      </Animated.View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    gap: Spacing.md,
    paddingVertical: Spacing.xxl,
  },
  badgeHeroWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  heroBadge: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: `0 10px 40px 0 rgba(255, 77, 141, 0.45)`,
  },
  heroBadgeFill: {
    borderRadius: 42,
  },
  heroTitle: {
    ...Type.title,
    fontSize: 40,
    lineHeight: 44,
    color: Colors.text,
    textAlign: 'center',
  },
  heroBody: {
    ...Type.body,
    color: Colors.textMuted,
    textAlign: 'center',
    maxWidth: 300,
  },
  emailPill: {
    marginTop: Spacing.xs,
    paddingVertical: 6,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.pill,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    maxWidth: '100%',
  },
  emailText: {
    ...Type.caption,
    color: Colors.textMuted,
  },
  card: {
    gap: Spacing.lg,
    padding: Spacing.xl,
    borderRadius: Radius.lg,
    backgroundColor: 'rgba(23, 21, 31, 0.9)',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  cardTitle: {
    ...Type.heading,
    fontSize: 19,
    color: Colors.text,
  },
  cardMeta: {
    ...Type.small,
    color: Colors.textMuted,
    fontWeight: '700',
  },
  progressTrack: {
    height: 8,
    borderRadius: Radius.pill,
    backgroundColor: Colors.surfaceHigh,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: Radius.pill,
    overflow: 'hidden',
  },
  steps: {
    gap: Spacing.lg,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  badge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeNext: {
    borderColor: Colors.accent,
  },
  badgeDone: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    ...Type.caption,
    color: Colors.textFaint,
    fontWeight: '800',
  },
  badgeTextNext: {
    color: Colors.accent,
  },
  stepCopy: {
    flex: 1,
    gap: 2,
  },
  stepTitle: {
    ...Type.bodyStrong,
    color: Colors.text,
  },
  stepTitleLocked: {
    color: Colors.textMuted,
  },
  stepBody: {
    ...Type.caption,
    color: Colors.textMuted,
  },
  upNext: {
    ...Type.caption,
    color: Colors.accent,
    fontWeight: '800',
  },
});
