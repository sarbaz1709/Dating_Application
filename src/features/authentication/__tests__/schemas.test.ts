import { loginSchema, registerSchema, resetPasswordSchema, verifyEmailSchema } from '../schemas';

describe('registerSchema', () => {
  const valid = { email: 'Alex@Example.com ', password: 'sunset42', ageConfirmed: true };

  it('accepts a valid sign-up and normalises the email', () => {
    const result = registerSchema.safeParse(valid);
    expect(result.success).toBe(true);
    expect(result.data?.email).toBe('alex@example.com');
  });

  it('requires the 18+ checkbox', () => {
    const result = registerSchema.safeParse({ ...valid, ageConfirmed: false });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(['ageConfirmed']);
    expect(result.error?.issues[0]?.message).toBe('You need to be 18 or older to join');
  });

  it.each([
    ['too short', 'abc12', 'Use at least 8 characters'],
    ['no number', 'abcdefgh', 'Add at least one number'],
    ['no letter', '12345678', 'Add at least one letter'],
  ])('rejects a password that is %s', (_label, password, message) => {
    const result = registerSchema.safeParse({ ...valid, password });
    expect(result.success).toBe(false);
    expect(result.error?.issues.map((issue) => issue.message)).toContain(message);
  });

  it('rejects passwords longer than bcrypt can use', () => {
    const result = registerSchema.safeParse({ ...valid, password: `a1${'x'.repeat(71)}` });
    expect(result.success).toBe(false);
  });

  it.each(['', 'not-an-email', 'a@b'])('rejects the email %p', (email) => {
    expect(registerSchema.safeParse({ ...valid, email }).success).toBe(false);
  });
});

describe('loginSchema', () => {
  it('does not apply new-password rules to existing passwords', () => {
    expect(loginSchema.safeParse({ email: 'a@example.com', password: 'x' }).success).toBe(true);
  });

  it('requires a password', () => {
    expect(loginSchema.safeParse({ email: 'a@example.com', password: '' }).success).toBe(false);
  });
});

describe('verifyEmailSchema', () => {
  it.each(['123456', ' 123456 '])('accepts %p', (code) => {
    expect(verifyEmailSchema.safeParse({ code }).success).toBe(true);
  });

  it.each(['12345', '1234567', '12a456', ''])('rejects %p', (code) => {
    expect(verifyEmailSchema.safeParse({ code }).success).toBe(false);
  });
});

describe('resetPasswordSchema', () => {
  it('requires matching passwords', () => {
    const result = resetPasswordSchema.safeParse({
      code: '123456',
      password: 'sunset42',
      confirmPassword: 'sunset43',
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(['confirmPassword']);
  });

  it('accepts a valid reset', () => {
    expect(
      resetPasswordSchema.safeParse({
        code: '123456',
        password: 'sunset42',
        confirmPassword: 'sunset42',
      }).success,
    ).toBe(true);
  });
});
