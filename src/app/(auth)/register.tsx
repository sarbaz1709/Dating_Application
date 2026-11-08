import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { useRef } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { StyleSheet, View, type TextInputInstance } from 'react-native';

import { Button } from '@/components/button';
import { FormMessage } from '@/components/form-message';
import { GlowBackground } from '@/components/glow-background';
import { Screen } from '@/components/screen';
import { TextField } from '@/components/text-field';
import { TextLink } from '@/components/text-link';
import { AgeCheckbox } from '@/features/authentication/components/age-checkbox';
import { AuthHeader } from '@/features/authentication/components/auth-header';
import { PasswordStrengthMeter } from '@/features/authentication/components/password-strength-meter';
import { useSignUp } from '@/features/authentication/hooks';
import {
  registerSchema,
  type RegisterInput,
  type RegisterValues,
} from '@/features/authentication/schemas';
import { Spacing } from '@/theme';

export default function RegisterScreen() {
  const passwordRef = useRef<TextInputInstance>(null);
  const signUp = useSignUp();

  const { control, handleSubmit, setError } = useForm<RegisterInput, unknown, RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { email: '', password: '', ageConfirmed: false },
    mode: 'onTouched',
  });
  const password = useWatch({ control, name: 'password' });

  const onSubmit = handleSubmit((values) => {
    signUp.mutate(values, {
      onSuccess: (result) => {
        if (result.needsEmailVerification) {
          router.push({ pathname: '/verify-email', params: { email: result.email } });
        }
        // Otherwise a session now exists and the root guard moves us into the app.
      },
      onError: (error) => {
        if (error.field === 'email' || error.field === 'password') {
          setError(error.field, { message: error.message });
        }
      },
    });
  });

  const formError = signUp.error && !signUp.error.field ? signUp.error.message : null;

  return (
    <Screen
      background={<GlowBackground variant="auth" />}
      footer={
        <>
          <Button
            testID="register-submit"
            label="Create account"
            onPress={onSubmit}
            loading={signUp.isPending}
          />
          <TextLink
            prompt="Already on Dialed?"
            label="Log in"
            onPress={() => router.replace('/login')}
          />
        </>
      }>
      <AuthHeader title="Let's get you dialed in" subtitle="30 seconds. Then the fun part." />

      <View style={styles.form}>
        <Controller
          control={control}
          name="email"
          render={({ field, fieldState }) => (
            <TextField
              testID="register-email"
              label="Email"
              placeholder="you@example.com"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={fieldState.error?.message}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              keyboardType="email-address"
              textContentType="emailAddress"
              returnKeyType="next"
              submitBehavior="submit"
              onSubmitEditing={() => passwordRef.current?.focus()}
            />
          )}
        />

        <View style={styles.passwordGroup}>
          <Controller
            control={control}
            name="password"
            render={({ field, fieldState }) => (
              <TextField
                ref={passwordRef}
                testID="register-password"
                label="Password"
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
                passwordRules="minlength: 8; required: lower; required: digit;"
                returnKeyType="done"
              />
            )}
          />
          <PasswordStrengthMeter password={password} />
        </View>

        <Controller
          control={control}
          name="ageConfirmed"
          render={({ field, fieldState }) => (
            <AgeCheckbox
              value={field.value}
              onChange={(checked) => {
                field.onChange(checked);
                field.onBlur();
              }}
              error={fieldState.error?.message}
            />
          )}
        />

        <FormMessage message={formError} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: Spacing.xl,
  },
  passwordGroup: {
    gap: Spacing.md,
  },
});
