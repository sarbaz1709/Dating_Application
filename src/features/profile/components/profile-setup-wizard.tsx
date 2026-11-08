import { useEffect, useRef, useState } from 'react';
import { BackHandler, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInLeft, FadeInRight, ZoomIn } from 'react-native-reanimated';

import { BackButton } from '@/components/back-button';
import { Button } from '@/components/button';
import { ConfettiBurst } from '@/components/confetti-burst';
import { FormMessage } from '@/components/form-message';
import { GlowBackground } from '@/components/glow-background';
import { ProgressBar } from '@/components/progress-bar';
import { Screen } from '@/components/screen';
import { SoundWave } from '@/components/sound-wave';
import { TextField } from '@/components/text-field';
import { useSignOut } from '@/features/authentication/hooks';
import { useSessionStore } from '@/features/authentication/session-store';
import { haptics } from '@/lib/haptics';
import { Colors, Radius, Spacing, Type } from '@/theme';

import { checkBirthday, formatBirthday, type BirthdayParts } from '../age';
import { GENDER_LABELS, GENDERS, INTEREST_LABELS, type Gender } from '../constants';
import { useSaveProfile } from '../hooks';
import type { ProfileErrorField } from '../profile-errors';
import { getProfileStrength } from '../profile-strength';
import { bioSchema, displayNameSchema } from '../schemas';
import type { MyProfile } from '../types';
import { BioInput } from './bio-input';
import { BirthdayInput } from './birthday-input';
import { ChoiceGroup } from './choice-group';
import { ManagedPhotoGrid } from './managed-photo-grid';
import { ProfileCard } from './profile-card';
import { ProfileStrengthCard } from './profile-strength-card';

const STEPS = [
  'intro',
  'name',
  'birthday',
  'gender',
  'interests',
  'photos',
  'bio',
  'preview',
] as const;
type StepId = (typeof STEPS)[number];

const FIELD_STEP: Record<ProfileErrorField, StepId> = {
  displayName: 'name',
  birthday: 'birthday',
  gender: 'gender',
  interestedIn: 'interests',
  bio: 'bio',
};

const GENDER_OPTIONS = GENDERS.map((value) => ({ value, label: GENDER_LABELS[value] }));
const INTEREST_OPTIONS = GENDERS.map((value) => ({ value, label: INTEREST_LABELS[value] }));

function partsFromIso(iso: string | null): BirthdayParts {
  if (!iso) return { month: '', day: '', year: '' };
  const [year = '', month = '', day = ''] = iso.split('-');
  return { month, day, year };
}

function StepTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={styles.titleBlock}>
      <Text style={styles.title} accessibilityRole="header">
        {title}
      </Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

/**
 * First-run profile setup: one question per screen, a progress bar that fills as you go, and a
 * preview of your card before it goes live. Answers are saved together at the end; photos upload
 * as soon as they're picked.
 */
export function ProfileSetupWizard({ profile }: { profile: MyProfile }) {
  const [stepIndex, setStepIndex] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [name, setName] = useState(profile.displayName ?? '');
  const [birthday, setBirthday] = useState<BirthdayParts>(() => partsFromIso(profile.birthday));
  const [gender, setGender] = useState<Gender | null>(profile.gender);
  const [interestedIn, setInterestedIn] = useState<Gender[]>(profile.interestedIn);
  const [bio, setBio] = useState(profile.bio);
  const [errors, setErrors] = useState<Partial<Record<StepId, string>>>({});

  const celebration = useSessionStore((state) => state.celebration);
  const clearCelebration = useSessionStore((state) => state.clearCelebration);
  const [celebrateAccount] = useState(celebration === 'account');
  const save = useSaveProfile({ goLive: true });
  const signOut = useSignOut();

  const step: StepId = STEPS[stepIndex] ?? 'intro';
  const birthdayLocked = profile.birthday !== null;
  const birthdayCheck = checkBirthday(birthday);
  const age = birthdayLocked ? profile.age : birthdayCheck.ok ? birthdayCheck.age : null;

  useEffect(() => {
    if (celebrateAccount) {
      haptics.success();
      clearCelebration();
    }
  }, [celebrateAccount, clearCelebration]);

  // A small reward the moment a valid birthday is entered.
  const birthdayWasValid = useRef(birthdayCheck.ok);
  useEffect(() => {
    if (birthdayCheck.ok && !birthdayWasValid.current) haptics.success();
    birthdayWasValid.current = birthdayCheck.ok;
  }, [birthdayCheck.ok]);

  function goTo(index: number) {
    setDirection(index > stepIndex ? 1 : -1);
    setStepIndex(Math.max(0, Math.min(STEPS.length - 1, index)));
  }

  function back() {
    if (stepIndex > 0) goTo(stepIndex - 1);
  }

  // Android's back button steps backwards through setup instead of leaving the app.
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (stepIndex === 0) return false;
      setDirection(-1);
      setStepIndex(stepIndex - 1);
      return true;
    });
    return () => subscription.remove();
  }, [stepIndex]);

  function fail(stepId: StepId, message: string) {
    haptics.error();
    setErrors((current) => ({ ...current, [stepId]: message }));
  }

  function clearError(stepId: StepId) {
    if (errors[stepId]) setErrors((current) => ({ ...current, [stepId]: undefined }));
  }

  function submit() {
    // Each step validates as you go; these guards just make sure nothing incomplete is sent.
    if (!gender) return goTo(STEPS.indexOf('gender'));
    if (!birthdayLocked && !birthdayCheck.ok) return goTo(STEPS.indexOf('birthday'));

    save.mutate(
      {
        displayName: name.trim(),
        bio: bio.trim(),
        gender,
        interestedIn,
        birthday: !birthdayLocked && birthdayCheck.ok ? birthdayCheck.isoDate : undefined,
      },
      {
        // On success the profile becomes complete and the app moves to the home screen.
        onError: (error) => {
          if (error.field) {
            const target = FIELD_STEP[error.field];
            setErrors((current) => ({ ...current, [target]: error.message }));
            goTo(STEPS.indexOf(target));
          }
        },
      },
    );
  }

  function next() {
    switch (step) {
      case 'name': {
        const result = displayNameSchema.safeParse(name);
        if (!result.success)
          return fail('name', result.error.issues[0]?.message ?? 'Check your name');
        setName(result.data);
        break;
      }
      case 'birthday':
        if (!birthdayLocked && !birthdayCheck.ok) return fail('birthday', birthdayCheck.message);
        break;
      case 'gender':
        if (!gender) return fail('gender', 'Pick the option that fits best');
        break;
      case 'interests':
        if (interestedIn.length === 0) return fail('interests', 'Pick at least one');
        break;
      case 'photos':
        if (profile.photos.length === 0) return fail('photos', 'Add at least one photo');
        break;
      case 'bio': {
        const result = bioSchema.safeParse(bio);
        if (!result.success)
          return fail('bio', result.error.issues[0]?.message ?? 'Check your bio');
        break;
      }
      case 'preview':
        return submit();
      default:
        break;
    }
    clearError(step);
    goTo(stepIndex + 1);
  }

  const primaryLabel =
    step === 'intro'
      ? "Let's go"
      : step === 'preview'
        ? 'Go live'
        : step === 'bio' && bio.trim() === ''
          ? 'Skip for now'
          : 'Next';
  const primaryDisabled =
    (step === 'gender' && !gender) ||
    (step === 'interests' && interestedIn.length === 0) ||
    (step === 'photos' && profile.photos.length === 0);

  const strength = getProfileStrength({
    hasBasics: true,
    photoCount: profile.photos.length,
    bio,
  });
  const entering = (direction === 1 ? FadeInRight : FadeInLeft).duration(260);

  return (
    <Screen
      background={<GlowBackground variant={step === 'intro' ? 'welcome' : 'auth'} />}
      footer={
        <>
          <FormMessage message={step === 'preview' ? save.error?.message : null} />
          <Button
            testID="setup-next"
            label={primaryLabel}
            onPress={next}
            disabled={primaryDisabled}
            loading={save.isPending}
          />
          {step === 'intro' ? (
            <Button
              testID="setup-log-out"
              label="Not you? Log out"
              variant="ghost"
              onPress={() => signOut.mutate()}
              loading={signOut.isPending}
            />
          ) : null}
        </>
      }>
      {step !== 'intro' ? (
        <View style={styles.header}>
          <BackButton onPress={back} testID="setup-back" />
          <View style={styles.progress}>
            <ProgressBar
              progress={stepIndex / (STEPS.length - 1)}
              height={6}
              accessibilityLabel="Profile setup progress"
            />
          </View>
          <Text style={styles.stepCount}>
            {stepIndex}/{STEPS.length - 1}
          </Text>
        </View>
      ) : null}

      <Animated.View key={step} entering={entering} style={styles.body}>
        {step === 'intro' ? (
          <View style={styles.intro}>
            <View style={styles.introBadge}>
              <SoundWave bars={13} height={84} barWidth={6} gap={5} />
              {celebrateAccount ? <ConfettiBurst /> : null}
            </View>
            <StepTitle
              title={celebrateAccount ? "You're in." : "Let's finish your profile."}
              subtitle="Now let's make a profile worth calling. Six quick steps, about two minutes."
            />
            <View style={styles.introList}>
              {[
                'Your name',
                'Your birthday',
                'Who you are',
                'Who you want to meet',
                'Photos',
                'A short bio',
              ].map((item, index) => (
                <View key={item} style={styles.introItem}>
                  <Text style={styles.introNumber}>{index + 1}</Text>
                  <Text style={styles.introText}>{item}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {step === 'name' ? (
          <>
            <StepTitle
              title="What's your first name?"
              subtitle="It's how you'll show up. You can change it later."
            />
            <TextField
              testID="setup-name"
              label="First name"
              placeholder="Your first name"
              value={name}
              onChangeText={(text) => {
                setName(text);
                clearError('name');
              }}
              error={errors.name}
              autoFocus
              autoCapitalize="words"
              autoComplete="given-name"
              textContentType="givenName"
              returnKeyType="next"
              onSubmitEditing={next}
              maxLength={30}
            />
          </>
        ) : null}

        {step === 'birthday' ? (
          <>
            <StepTitle
              title="When's your birthday?"
              subtitle="We show your age, never your birthday."
            />
            {birthdayLocked && profile.birthday ? (
              <View style={styles.lockedRow}>
                <Text style={styles.lockedText}>{formatBirthday(profile.birthday)}</Text>
                <Text style={styles.lockedHint}>Locked</Text>
              </View>
            ) : (
              <BirthdayInput
                value={birthday}
                onChange={(value) => {
                  setBirthday(value);
                  clearError('birthday');
                }}
                error={errors.birthday}
                autoFocus
              />
            )}
            {age !== null ? (
              <Animated.View
                key={age}
                entering={ZoomIn.springify().damping(11)}
                style={styles.ageBadge}
                testID="age-badge">
                <Text style={styles.ageText}>You&apos;re {age}</Text>
              </Animated.View>
            ) : null}
            {!birthdayLocked ? (
              <Text style={styles.footnote}>
                You won&apos;t be able to change this later, so double-check it.
              </Text>
            ) : null}
          </>
        ) : null}

        {step === 'gender' ? (
          <>
            <StepTitle title="Which best describes you?" />
            <ChoiceGroup
              options={GENDER_OPTIONS}
              selected={gender ? [gender] : []}
              onToggle={(value) => {
                setGender(value);
                clearError('gender');
              }}
              testIDPrefix="gender"
              accessibilityLabel="Gender"
            />
            <FormMessage message={errors.gender} />
          </>
        ) : null}

        {step === 'interests' ? (
          <>
            <StepTitle title="Who do you want to meet?" subtitle="Pick as many as you like." />
            <ChoiceGroup
              options={INTEREST_OPTIONS}
              selected={interestedIn}
              multiple
              onToggle={(value) => {
                setInterestedIn((current) =>
                  current.includes(value)
                    ? current.filter((item) => item !== value)
                    : [...current, value],
                );
                clearError('interests');
              }}
              testIDPrefix="interest"
              accessibilityLabel="Who you want to meet"
            />
            <FormMessage message={errors.interests} />
          </>
        ) : null}

        {step === 'photos' ? (
          <>
            <StepTitle
              title="Show them your best side"
              subtitle="Add up to 4 photos. Your first one is your main photo."
            />
            <ManagedPhotoGrid photos={profile.photos} profileComplete={false} />
            <Text style={styles.footnote}>
              Tip: a clear, well-lit photo of just you makes the best main photo.
            </Text>
            <FormMessage message={errors.photos} />
          </>
        ) : null}

        {step === 'bio' ? (
          <>
            <StepTitle
              title="Say something worth calling about"
              subtitle="A line or two is plenty. Optional, but it gives people something to ask you about."
            />
            <BioInput
              value={bio}
              onChange={(value) => {
                setBio(value);
                clearError('bio');
              }}
              error={errors.bio}
            />
          </>
        ) : null}

        {step === 'preview' ? (
          <>
            <StepTitle title="This is you on Dialed" subtitle="Tap the photo to flip through." />
            <ProfileCard
              testID="setup-preview"
              name={name.trim()}
              age={age}
              bio={bio}
              photos={profile.photos.map((photo) => ({
                id: photo.id,
                url: photo.url,
                cacheKey: photo.storagePath,
              }))}
            />
            <ProfileStrengthCard strength={strength} />
          </>
        ) : null}
      </Animated.View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  progress: {
    flex: 1,
  },
  stepCount: {
    ...Type.caption,
    color: Colors.textMuted,
    fontWeight: '700',
    minWidth: 28,
    textAlign: 'right',
  },
  body: {
    gap: Spacing.xl,
  },
  titleBlock: {
    gap: Spacing.sm,
  },
  title: {
    ...Type.title,
    color: Colors.text,
  },
  subtitle: {
    ...Type.body,
    color: Colors.textMuted,
  },
  intro: {
    gap: Spacing.xl,
    paddingTop: Spacing.xxl,
  },
  introBadge: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.lg,
  },
  introList: {
    gap: Spacing.md,
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    backgroundColor: 'rgba(23, 21, 31, 0.85)',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  introItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  introNumber: {
    ...Type.caption,
    width: 24,
    height: 24,
    borderRadius: 12,
    overflow: 'hidden',
    textAlign: 'center',
    lineHeight: 24,
    fontWeight: '800',
    color: Colors.accent,
    backgroundColor: Colors.accentSoft,
  },
  introText: {
    ...Type.body,
    color: Colors.text,
  },
  lockedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.lg,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  lockedText: {
    ...Type.bodyStrong,
    color: Colors.text,
  },
  lockedHint: {
    ...Type.caption,
    color: Colors.textFaint,
    fontWeight: '700',
  },
  ageBadge: {
    alignSelf: 'flex-start',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.pill,
    backgroundColor: Colors.successSoft,
    borderWidth: 1,
    borderColor: Colors.success,
  },
  ageText: {
    ...Type.bodyStrong,
    color: Colors.success,
  },
  footnote: {
    ...Type.caption,
    color: Colors.textFaint,
  },
});
