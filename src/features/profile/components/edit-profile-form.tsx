import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BackButton } from '@/components/back-button';
import { BottomSheet } from '@/components/bottom-sheet';
import { Button } from '@/components/button';
import { FormMessage } from '@/components/form-message';
import { GlowBackground } from '@/components/glow-background';
import { Screen } from '@/components/screen';
import { TextField } from '@/components/text-field';
import { haptics } from '@/lib/haptics';
import { Colors, Radius, Spacing, Type } from '@/theme';

import { formatBirthday } from '../age';
import { GENDER_LABELS, GENDERS, INTEREST_LABELS, type Gender } from '../constants';
import { useSaveProfile } from '../hooks';
import { getProfileStrength } from '../profile-strength';
import {
  profileDetailsSchema,
  type ProfileDetailsInput,
  type ProfileDetailsValues,
} from '../schemas';
import type { MyProfile } from '../types';
import { BioInput } from './bio-input';
import { ChoiceGroup } from './choice-group';
import { ManagedPhotoGrid } from './managed-photo-grid';
import { ProfilePreviewModal } from './profile-preview-modal';
import { ProfileStrengthCard } from './profile-strength-card';

const GENDER_OPTIONS = GENDERS.map((value) => ({ value, label: GENDER_LABELS[value] }));
const INTEREST_OPTIONS = GENDERS.map((value) => ({ value, label: INTEREST_LABELS[value] }));

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {hint ? <Text style={styles.sectionHint}>{hint}</Text> : null}
      </View>
      {children}
    </View>
  );
}

/**
 * Edit everything except the birthday. Photo changes apply instantly; text and choices are
 * saved with the Save button. Leaving with unsaved changes asks first.
 */
export function EditProfileForm({ profile }: { profile: MyProfile }) {
  const save = useSaveProfile();
  const [previewOpen, setPreviewOpen] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const { control, handleSubmit, reset, setError, formState } = useForm<
    ProfileDetailsInput,
    unknown,
    ProfileDetailsValues
  >({
    resolver: zodResolver(profileDetailsSchema),
    defaultValues: {
      displayName: profile.displayName ?? '',
      bio: profile.bio,
      gender: profile.gender ?? undefined,
      interestedIn: profile.interestedIn,
    },
    mode: 'onTouched',
  });
  const values = useWatch({ control });
  const dirty = formState.isDirty;

  // Let the "Saved" confirmation fade away on its own.
  useEffect(() => {
    if (savedAt === null) return;
    const timer = setTimeout(() => setSavedAt(null), 2500);
    return () => clearTimeout(timer);
  }, [savedAt]);

  const onSave = handleSubmit((details) => {
    save.mutate(
      { ...details },
      {
        onSuccess: () => {
          reset(details);
          setSavedAt(Date.now());
        },
        onError: (error) => {
          if (error.field && error.field !== 'birthday') {
            setError(error.field, { message: error.message });
          }
        },
      },
    );
  });

  const strength = getProfileStrength({
    hasBasics: true,
    photoCount: profile.photos.length,
    bio: values.bio ?? '',
  });
  const previewPhotos = profile.photos.map((photo) => ({
    id: photo.id,
    url: photo.url,
    cacheKey: photo.storagePath,
  }));

  function leave() {
    if (dirty) {
      haptics.warning();
      setConfirmLeave(true);
    } else if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  }

  return (
    <Screen
      background={<GlowBackground variant="auth" />}
      footer={
        <>
          <FormMessage message={save.error && !save.error.field ? save.error.message : null} />
          <FormMessage tone="success" message={savedAt ? 'Saved. Looking good.' : null} />
          <Button
            testID="edit-save"
            label={dirty ? 'Save changes' : 'All changes saved'}
            variant={dirty ? 'primary' : 'secondary'}
            onPress={onSave}
            disabled={!dirty}
            loading={save.isPending}
          />
        </>
      }>
      <View style={styles.header}>
        <BackButton onPress={leave} testID="edit-back" />
        <Text style={styles.title} accessibilityRole="header">
          Edit profile
        </Text>
        <Pressable
          testID="edit-preview"
          onPress={() => {
            haptics.tap();
            setPreviewOpen(true);
          }}
          style={styles.previewButton}
          accessibilityRole="button"
          accessibilityLabel="Preview your profile">
          <Text style={styles.previewText}>Preview</Text>
        </Pressable>
      </View>

      <View style={styles.sections}>
        <ProfileStrengthCard strength={strength} />

        <Section
          title="Photos"
          hint="Tap a photo to make it your main one or remove it. Photo changes save instantly.">
          <ManagedPhotoGrid photos={profile.photos} profileComplete={profile.isComplete} />
        </Section>

        <Section title="About you">
          <Controller
            control={control}
            name="displayName"
            render={({ field, fieldState }) => (
              <TextField
                testID="edit-name"
                label="First name"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={fieldState.error?.message}
                autoCapitalize="words"
                autoComplete="given-name"
                maxLength={30}
              />
            )}
          />
          <Controller
            control={control}
            name="bio"
            render={({ field, fieldState }) => (
              <BioInput
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                error={fieldState.error?.message}
              />
            )}
          />
        </Section>

        <Section title="I am">
          <Controller
            control={control}
            name="gender"
            render={({ field, fieldState }) => (
              <>
                <ChoiceGroup
                  variant="chips"
                  options={GENDER_OPTIONS}
                  selected={field.value ? [field.value] : []}
                  onToggle={(value: Gender) => field.onChange(value)}
                  testIDPrefix="edit-gender"
                  accessibilityLabel="Gender"
                />
                {fieldState.error ? (
                  <Text style={styles.error}>{fieldState.error.message}</Text>
                ) : null}
              </>
            )}
          />
        </Section>

        <Section title="I want to meet">
          <Controller
            control={control}
            name="interestedIn"
            render={({ field, fieldState }) => (
              <>
                <ChoiceGroup
                  variant="chips"
                  multiple
                  options={INTEREST_OPTIONS}
                  selected={field.value}
                  onToggle={(value: Gender) =>
                    field.onChange(
                      field.value.includes(value)
                        ? field.value.filter((item) => item !== value)
                        : [...field.value, value],
                    )
                  }
                  testIDPrefix="edit-interest"
                  accessibilityLabel="Who you want to meet"
                />
                {fieldState.error ? (
                  <Text style={styles.error}>{fieldState.error.message}</Text>
                ) : null}
              </>
            )}
          />
        </Section>

        {profile.birthday ? (
          <Section title="Birthday">
            <View style={styles.lockedRow}>
              <Text style={styles.lockedText}>
                {formatBirthday(profile.birthday)}
                {profile.age !== null ? ` · ${profile.age}` : ''}
              </Text>
              <Text style={styles.lockedHint}>Can&apos;t be changed</Text>
            </View>
          </Section>
        ) : null}
      </View>

      <ProfilePreviewModal
        visible={previewOpen}
        onClose={() => setPreviewOpen(false)}
        name={(values.displayName ?? '').trim()}
        age={profile.age}
        bio={values.bio ?? ''}
        photos={previewPhotos}
      />

      <BottomSheet visible={confirmLeave} onClose={() => setConfirmLeave(false)}>
        <Text style={styles.sheetTitle}>Discard your changes?</Text>
        <Text style={styles.sheetBody}>You have edits that haven&apos;t been saved.</Text>
        <Button label="Keep editing" onPress={() => setConfirmLeave(false)} />
        <Button
          testID="edit-discard"
          label="Discard changes"
          variant="secondary"
          onPress={() => {
            setConfirmLeave(false);
            reset();
            if (router.canGoBack()) router.back();
            else router.replace('/');
          }}
        />
      </BottomSheet>
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
  title: {
    ...Type.heading,
    color: Colors.text,
    flex: 1,
  },
  previewButton: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.accent,
    backgroundColor: Colors.accentSoft,
  },
  previewText: {
    ...Type.small,
    fontWeight: '700',
    color: Colors.text,
  },
  sections: {
    gap: Spacing.xxl,
  },
  section: {
    gap: Spacing.lg,
  },
  sectionHeader: {
    gap: Spacing.xs,
  },
  sectionTitle: {
    ...Type.heading,
    fontSize: 19,
    color: Colors.text,
  },
  sectionHint: {
    ...Type.small,
    color: Colors.textMuted,
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
  error: {
    ...Type.small,
    color: Colors.danger,
  },
  sheetTitle: {
    ...Type.heading,
    color: Colors.text,
  },
  sheetBody: {
    ...Type.body,
    color: Colors.textMuted,
    marginBottom: Spacing.sm,
  },
});
