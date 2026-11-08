import { zodResolver } from '@hookform/resolvers/zod';
import { router, useLocalSearchParams } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { FormMessage } from '@/components/form-message';
import { GlowBackground } from '@/components/glow-background';
import { Screen } from '@/components/screen';
import { TextField } from '@/components/text-field';
import { AuthHeader } from '@/features/authentication/components/auth-header';
import { useRequestPasswordReset } from '@/features/authentication/hooks';
import {
  forgotPasswordSchema,
  type ForgotPasswordInput,
  type ForgotPasswordValues,
} from '@/features/authentication/schemas';
import { Spacing } from '@/theme';

export default function ForgotPasswordScreen() {
  const params = useLocalSearchParams<{ email?: string }>();
  const requestReset = useRequestPasswordReset();

  const { control, handleSubmit, setError } = useForm<
    ForgotPasswordInput,
    unknown,
    ForgotPasswordValues
  >({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: params.email ?? '' },
    mode: 'onTouched',
  });

  const onSubmit = handleSubmit(({ email }) => {
    requestReset.mutate(email, {
      onSuccess: () => router.push({ pathname: '/reset-password', params: { email } }),
      onError: (error) => {
        if (error.field === 'email') setError('email', { message: error.message });
      },
    });
  });

  return (
    <Screen
      background={<GlowBackground variant="auth" />}
      footer={
        <Button
          testID="forgot-submit"
          label="Send me a code"
          onPress={onSubmit}
          loading={requestReset.isPending}
        />
      }>
      <AuthHeader
        title="Forgot your password?"
        subtitle="Happens to the best of us. We'll email you a code to set a new one."
      />

      <View style={styles.form}>
        <Controller
          control={control}
          name="email"
          render={({ field, fieldState }) => (
            <TextField
              testID="forgot-email"
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
              returnKeyType="send"
              onSubmitEditing={() => onSubmit()}
            />
          )}
        />
        <FormMessage
          message={
            requestReset.error && !requestReset.error.field ? requestReset.error.message : null
          }
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: Spacing.xl,
  },
});
