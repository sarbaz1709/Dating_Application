import { zodResolver } from '@hookform/resolvers/zod';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { StyleSheet, Text, View, type TextInputInstance } from 'react-native';

import { Button } from '@/components/button';
import { FormMessage } from '@/components/form-message';
import { GlowBackground } from '@/components/glow-background';
import { Screen } from '@/components/screen';
import { TextField } from '@/components/text-field';
import { AuthHeader } from '@/features/authentication/components/auth-header';
import { OtpCodeInput } from '@/features/authentication/components/otp-code-input';
import { PasswordStrengthMeter } from '@/features/authentication/components/password-strength-meter';
import { ResendCodeButton } from '@/features/authentication/components/resend-code-button';
import { useCompletePasswordReset, useRequestPasswordReset } from '@/features/authentication/hooks';
import {
  emailSchema,
  resetPasswordSchema,
  type ResetPasswordInput,
  type ResetPasswordValues,
} from '@/features/authentication/schemas';
import { useSessionStore } from '@/features/authentication/session-store';
import { Colors, Spacing, Type } from '@/theme';

export default function ResetPasswordScreen() {
  const params = useLocalSearchParams<{ email?: string }>();
  const parsedEmail = emailSchema.safeParse(params.email ?? '');
  const email = parsedEmail.success ? parsedEmail.data : null;

  const passwordRef = useRef<TextInputInstance>(null);
  const confirmRef = useRef<TextInputInstance>(null);
  const [errorSignal, setErrorSignal] = useState(0);
  const completeReset = useCompletePasswordReset();
  const resendReset = useRequestPasswordReset();

  // If the person backs out after the code was verified, stop holding them on this flow.
  useEffect(() => () => useSessionStore.getState().endPasswordReset(), []);

  const { control, handleSubmit, setError } = useForm<
    ResetPasswordInput,
    unknown,
    ResetPasswordValues
  >({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { code: '', password: '', confirmPassword: '' },
    mode: 'onTouched',
  });
  const password = useWatch({ control, name: 'password' });

  if (!email) {
    return (
      <Screen>
        <AuthHeader title="Let's start over" subtitle="We lost track of your email address." />
        <Button label="Reset my password" onPress={() => router.replace('/forgot-password')} />
      </Screen>
    );
  }

  const onSubmit = handleSubmit(({ code, password: newPassword }) => {
    completeReset.mutate(
      { email, code, password: newPassword },
      {
        // On success the session is released and the root guard opens the app.
        onError: (error) => {
          if (error.field === 'code') {
            setErrorSignal((signal) => signal + 1);
            setError('code', { message: error.message });
          } else if (error.field === 'password') {
            setError('password', { message: error.message });
          }
        },
      },
    );
  });

  return (
    <Screen
      background={<GlowBackground variant="auth" />}
      footer={
        <Button
          testID="reset-submit"
          label="Save and log in"
          onPress={onSubmit}
          loading={completeReset.isPending}
        />
      }>
      <AuthHeader
        title="Pick a new password"
        subtitle={
          <>
            Enter the code we sent to <Text style={styles.email}>{email}</Text>, then choose
            something new.
          </>
        }
      />

      <View style={styles.form}>
        <Controller
          control={control}
          name="code"
          render={({ field, fieldState }) => (
            <View style={styles.codeGroup}>
              <Text style={styles.label}>Code</Text>
              <OtpCodeInput
                value={field.value}
                onChange={field.onChange}
                onComplete={() => passwordRef.current?.focus()}
                errorSignal={errorSignal}
                hasError={Boolean(fieldState.error)}
              />
              {fieldState.error ? (
                <Text style={styles.error}>{fieldState.error.message}</Text>
              ) : null}
              <ResendCodeButton onResend={() => resendReset.mutateAsync(email)} />
            </View>
          )}
        />

        <View style={styles.passwordGroup}>
          <Controller
            control={control}
            name="password"
            render={({ field, fieldState }) => (
              <TextField
                ref={passwordRef}
                testID="reset-password"
                label="New password"
                placeholder="8+ characters with a number"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={fieldState.error?.message}
                secureToggle
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="new-password"
                textContentType="newPassword"
                returnKeyType="next"
                submitBehavior="submit"
                onSubmitEditing={() => confirmRef.current?.focus()}
              />
            )}
          />
          <PasswordStrengthMeter password={password} />
        </View>

        <Controller
          control={control}
          name="confirmPassword"
          render={({ field, fieldState }) => (
            <TextField
              ref={confirmRef}
              testID="reset-confirm-password"
              label="Confirm new password"
              placeholder="Type it once more"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={fieldState.error?.message}
              secureToggle
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="new-password"
              textContentType="newPassword"
              returnKeyType="done"
              onSubmitEditing={() => onSubmit()}
            />
          )}
        />

        <FormMessage
          message={
            completeReset.error && !completeReset.error.field ? completeReset.error.message : null
          }
        />
        <FormMessage message={resendReset.error?.message} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: Spacing.xl,
  },
  codeGroup: {
    gap: Spacing.md,
  },
  passwordGroup: {
    gap: Spacing.md,
  },
  label: {
    ...Type.small,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  error: {
    ...Type.small,
    color: Colors.danger,
  },
  email: {
    color: Colors.text,
    fontWeight: '700',
  },
});
