import { getPasswordStrength } from '../password-strength';

describe('getPasswordStrength', () => {
  it('reports an empty password as too weak with no requirements met', () => {
    const strength = getPasswordStrength('');
    expect(strength.level).toBe(0);
    expect(strength.acceptable).toBe(false);
    expect(strength.requirements.every((requirement) => !requirement.met)).toBe(true);
  });

  it('tracks each server-enforced requirement', () => {
    const met = (password: string) =>
      Object.fromEntries(getPasswordStrength(password).requirements.map((r) => [r.id, r.met]));

    expect(met('abc')).toEqual({ length: false, letter: true, number: false });
    expect(met('12345678')).toEqual({ length: true, letter: false, number: true });
    expect(met('sunset42')).toEqual({ length: true, letter: true, number: true });
  });

  it('rates any password the server would reject as "Too weak"', () => {
    const strength = getPasswordStrength('ThisIsAVeryLongPassphrase!');
    expect(strength.level).toBe(0);
    expect(strength.label).toBe('Too weak');
  });

  it('rates any acceptable password at least "Fair"', () => {
    expect(getPasswordStrength('aaaaaaa1').level).toBe(1);
    expect(getPasswordStrength('sunset42').label).toBe('Fair');
  });

  it('rewards length and variety', () => {
    const basic = getPasswordStrength('sunset42').level;
    const better = getPasswordStrength('Sunset-42-Tacos').level;
    const best = getPasswordStrength('Sunset-42-Tacos-At-Midnight').level;
    expect(better).toBeGreaterThan(basic);
    expect(best).toBe(4);
    expect(getPasswordStrength('Sunset-42-Tacos-At-Midnight').label).toBe('Unbreakable');
  });

  it('penalises common passwords and repeated characters', () => {
    expect(getPasswordStrength('Password1234!').level).toBeLessThan(
      getPasswordStrength('Pineapple1234!').level,
    );
    expect(getPasswordStrength('Aaaa-aaaa-1').level).toBeLessThan(
      getPasswordStrength('Abcd-efgh-1').level,
    );
  });
});
