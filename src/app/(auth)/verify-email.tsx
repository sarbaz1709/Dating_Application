import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { FormMessage } from '@/components/form-message';
import { GlowBackground } from '@/components/glow-background';
import { Screen } from '@/components/screen';
import { TextLink } from '@/components/text-link';
import { EMAIL_OTP_LENGTH } from '@/constants/brand';
import { AuthHeader } from '@/features/authentication/components/auth-header';
import { OtpCodeInput } from '@/features/authentication/components/otp-code-input';
import { ResendCodeButton } from '@/features/authentication/components/resend-code-button';
import { useResendSignUpCode, useVerifySignUpCode } from '@/features/authentication/hooks';
import { emailSchema } from '@/features/authentication/schemas';
import { Colors, Spacing, Type } from '@/theme';

export default function VerifyEmailScreen() {
  const params = useLocalSearchParams<{ email?: string; reason?: string }>();
  const parsedEmail = emailSchema.safeParse(params.email ?? '');
  const email = parsedEmail.success ? parsedEmail.data : null;

  const [code, setCode] = useState('');
  const [errorSignal, setErrorSignal] = useState(0);
  const verify = useVerifySignUpCode();
  const resend = useResendSignUpCode();

  if (!email) {
    // Reached without an email (e.g. a stale link). Nothing to verify: start over.
    return (
      <Screen>
        <AuthHeader title="Let's start over" subtitle="We lost track of your email address." />
        <Button label="Back to start" onPress={() => router.replace('/')} />
      </Screen>
    );
  }

  function submit(value: string) {
    if (!email || value.length !== EMAIL_OTP_LENGTH || verify.isPending) return;
    verify.mutate(
      { email, code: value },
      {
        // On success the session lands and the root guard opens the app (with confetti).
        onError: () => {
          setErrorSignal((signal) => signal + 1);
          setCode('');
        },
      },
    );
  }

  const unconfirmedLogin = params.reason === 'unconfirmed';

  return (
    <Screen
      background={<GlowBackground variant="auth" />}
      footer={
        <>
          <Button
            testID="verify-submit"
            label="Verify"
            onPress={() => submit(code)}
            loading={verify.isPending}
            disabled={code.length !== EMAIL_OTP_LENGTH}
          />
          <TextLink
            prompt="Already have an account?"
            label="Log in"
            onPress={() => router.replace('/login')}
          />
        </>
      }>
      <AuthHeader
        title="Check your inbox"
        subtitle={
          <>
            {unconfirmedLogin ? 'Confirm your email to log in. ' : ''}
            We sent a {EMAIL_OTP_LENGTH}-digit code to <Text style={styles.email}>{email}</Text>
          </>
        }
      />

      <View style={styles.body}>
        <OtpCodeInput
          value={code}
          onChange={(value) => {
            setCode(value);
            if (verify.isError) verify.reset();
          }}
          onComplete={submit}
          errorSignal={errorSignal}
          hasError={verify.isError}
          disabled={verify.isPending}
        />

        <FormMessage message={verify.error?.message} />
        <FormMessage
          tone="success"
          message={resend.isSuccess && !verify.isError ? 'Fresh code on its way.' : null}
        />
        <FormMessage message={resend.error?.message} />

        <ResendCodeButton onResend={() => resend.mutateAsync(email)} />

        <Text style={styles.hint}>
          Can&apos;t find it? Check spam, or make sure the address above is right.
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: {
    gap: Spacing.xl,
  },
  email: {
    color: Colors.text,
    fontWeight: '700',
  },
  hint: {
    ...Type.caption,
    color: Colors.textFaint,
    textAlign: 'center',
  },
});
