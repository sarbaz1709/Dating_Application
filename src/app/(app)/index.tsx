import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';

import { Button } from '@/components/button';
import { CheckMark } from '@/components/check-mark';
import { ConfettiBurst } from '@/components/confetti-burst';
import { FormMessage } from '@/components/form-message';
import { GlowBackground } from '@/components/glow-background';
import { ProgressBar } from '@/components/progress-bar';
import { Screen } from '@/components/screen';
import { SoundWave } from '@/components/sound-wave';
import { Brand } from '@/constants/brand';
import { useSignOut } from '@/features/authentication/hooks';
import { useSessionStore } from '@/features/authentication/session-store';
import { ProfilePreviewModal } from '@/features/profile/components/profile-preview-modal';
import { ProfileStrengthCard } from '@/features/profile/components/profile-strength-card';
import { useMyProfile } from '@/features/profile/hooks';
import { getProfileStrength } from '@/features/profile/profile-strength';
import { haptics } from '@/lib/haptics';
import { Colors, FontFamily, Radius, SignalGradient, Spacing, Type } from '@/theme';

type StepState = 'done' | 'next' | 'locked';

/**
 * The road to a first call. Account and profile are real today; the vibe check and calls arrive
 * with the next MVP features. Display-only, so nothing pretends to work before it does.
 */
const JOURNEY: { title: string; body: string; state: StepState }[] = [
  { title: 'Create your account', body: "You're in.", state: 'done' },
  { title: 'Build your profile', body: 'Looking good.', state: 'done' },
  { title: 'Take the vibe check', body: 'Five quick questions.', state: 'next' },
  { title: 'Make your first call', body: 'Five minutes. Then decide.', state: 'locked' },
];

function StepBadge({ state, index }: { state: StepState; index: number }) {
  if (state === 'done') {
    return (
      <Animated.View
        entering={ZoomIn.delay(400 + index * 120)
          .springify()
          .damping(10)}
        style={styles.badgeDone}>
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
  const { data: profile } = useMyProfile();
  const celebration = useSessionStore((state) => state.celebration);
  const clearCelebration = useSessionStore((state) => state.clearCelebration);
  // Snapshot on first render so the party plays exactly once, and ends when you navigate away.
  const [justWentLive, setJustWentLive] = useState(celebration === 'profile');
  useFocusEffect(useCallback(() => () => setJustWentLive(false), []));
  const [previewOpen, setPreviewOpen] = useState(false);
  const signOut = useSignOut();

  useEffect(() => {
    if (justWentLive) {
      haptics.success();
      clearCelebration();
    }
  }, [justWentLive, clearCelebration]);

  if (!profile) return null;

  const name = profile.displayName ?? '';
  const mainPhoto = profile.photos[0];
  const strength = getProfileStrength({
    hasBasics: true,
    photoCount: profile.photos.length,
    bio: profile.bio,
  });
  const completed = JOURNEY.filter((step) => step.state === 'done').length;

  return (
    <Screen
      background={<GlowBackground variant="home" />}
      footer={
        <>
          <FormMessage message={signOut.error?.message} />
          <Button
            testID="home-log-out"
            label="Log out"
            variant="ghost"
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
        <View style={styles.avatarWrap}>
          <Animated.View entering={ZoomIn.springify().damping(10)} style={styles.avatarRing}>
            <LinearGradient
              colors={SignalGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[StyleSheet.absoluteFill, styles.avatarRingFill]}
            />
            <View style={styles.avatarInner}>
              {mainPhoto?.url ? (
                <Image
                  source={{ uri: mainPhoto.url, cacheKey: mainPhoto.storagePath }}
                  style={StyleSheet.absoluteFill}
                  contentFit="cover"
                  accessibilityLabel="Your main photo"
                />
              ) : (
                <Text style={styles.avatarInitial}>{name.charAt(0).toUpperCase()}</Text>
              )}
            </View>
          </Animated.View>
          {justWentLive ? <ConfettiBurst /> : null}
        </View>
        <Animated.Text
          entering={FadeInDown.delay(150).duration(450)}
          style={styles.heroTitle}
          accessibilityRole="header">
          {justWentLive ? "You're live." : `Hey, ${name}.`}
        </Animated.Text>
        <Animated.Text entering={FadeInDown.delay(250).duration(450)} style={styles.heroBody}>
          {justWentLive
            ? 'Your profile is ready. Next up: the vibe check.'
            : strength.next
              ? 'Your profile is live. A couple of touches would make it even better.'
              : 'Your profile is fully dialed in.'}
        </Animated.Text>
      </View>

      <Animated.View entering={FadeInDown.delay(320).duration(450)} style={styles.stack}>
        <ProfileStrengthCard strength={strength} onNextPress={() => router.push('/edit-profile')} />
        <View style={styles.actions}>
          <View style={styles.action}>
            <Button
              testID="home-edit-profile"
              label="Edit profile"
              variant="secondary"
              onPress={() => router.push('/edit-profile')}
            />
          </View>
          <View style={styles.action}>
            <Button
              testID="home-preview"
              label="Preview"
              variant="secondary"
              onPress={() => setPreviewOpen(true)}
            />
          </View>
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(420).duration(500)} style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Road to your first call</Text>
          <Text style={styles.cardMeta}>
            {completed}/{JOURNEY.length}
          </Text>
        </View>
        <ProgressBar progress={completed / JOURNEY.length} delay={350} />
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

      <ProfilePreviewModal
        visible={previewOpen}
        onClose={() => setPreviewOpen(false)}
        name={name}
        age={profile.age}
        bio={profile.bio}
        photos={profile.photos.map((photo) => ({
          id: photo.id,
          url: photo.url,
          cacheKey: photo.storagePath,
        }))}
      />
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
    paddingTop: Spacing.xxl,
    paddingBottom: Spacing.xl,
  },
  avatarWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  avatarRing: {
    width: 112,
    height: 112,
    borderRadius: 56,
    padding: 4,
    boxShadow: '0 10px 40px 0 rgba(255, 77, 141, 0.4)',
  },
  avatarRingFill: {
    borderRadius: 56,
  },
  avatarInner: {
    flex: 1,
    borderRadius: 52,
    overflow: 'hidden',
    backgroundColor: Colors.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: Colors.background,
  },
  avatarInitial: {
    fontFamily: FontFamily.display,
    fontSize: 44,
    color: Colors.text,
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
    maxWidth: 320,
  },
  stack: {
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  action: {
    flex: 1,
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
