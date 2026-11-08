import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { useRef } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet, View, type TextInputInstance } from 'react-native';

import { Button } from '@/components/button';
import { FormMessage } from '@/components/form-message';
import { GlowBackground } from '@/components/glow-background';
import { Screen } from '@/components/screen';
import { TextField } from '@/components/text-field';
import { TextLink } from '@/components/text-link';
import { AuthHeader } from '@/features/authentication/components/auth-header';
import { useSignIn } from '@/features/authentication/hooks';
import { loginSchema, type LoginInput, type LoginValues } from '@/features/authentication/schemas';
import { Spacing } from '@/theme';

export default function LoginScreen() {
  const passwordRef = useRef<TextInputInstance>(null);
  const signIn = useSignIn();

  const { control, handleSubmit, setError, getValues } = useForm<LoginInput, unknown, LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
    mode: 'onTouched',
  });

  const onSubmit = handleSubmit((values) => {
    signIn.mutate(values, {
      onError: (error) => {
        if (error.kind === 'email_not_confirmed') {
          router.push({
            pathname: '/verify-email',
            params: { email: values.email, reason: 'unconfirmed' },
          });
          return;
        }
        if (error.field === 'email' || error.field === 'password') {
          setError(error.field, { message: error.message });
        }
      },
      // On success the session lands and the root guard moves us into the app.
    });
  });

  const formError =
    signIn.error && !signIn.error.field && signIn.error.kind !== 'email_not_confirmed'
      ? signIn.error.message
      : null;

  return (
    <Screen
      background={<GlowBackground variant="auth" />}
      footer={
        <>
          <Button
            testID="login-submit"
            label="Log in"
            onPress={onSubmit}
            loading={signIn.isPending}
          />
          <TextLink
            prompt="New to Dialed?"
            label="Create an account"
            onPress={() => router.replace('/register')}
          />
        </>
      }>
      <AuthHeader title="Welcome back" subtitle="Good to hear from you again." />

      <View style={styles.form}>
        <Controller
          control={control}
          name="email"
          render={({ field, fieldState }) => (
            <TextField
              testID="login-email"
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
                testID="login-password"
                label="Password"
                placeholder="Your password"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={fieldState.error?.message}
                secureToggle
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="current-password"
                textContentType="password"
                returnKeyType="go"
                onSubmitEditing={() => onSubmit()}
              />
            )}
          />
          <TextLink
            testID="login-forgot-password"
            label="Forgot password?"
            align="right"
            onPress={() =>
              router.push({ pathname: '/forgot-password', params: { email: getValues('email') } })
            }
          />
        </View>

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
