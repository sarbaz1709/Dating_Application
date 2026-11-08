import { displayNameSchema, interestedInSchema, profileDetailsSchema } from '../schemas';

describe('displayNameSchema', () => {
  it.each(['Ana', 'Mary-Jane', "O'Brien", 'Zoë', 'José Luis', 'St. John', '王芳'])(
    'accepts %p',
    (name) => {
      expect(displayNameSchema.safeParse(name).success).toBe(true);
    },
  );

  it.each(['', '   ', 'R2D2', 'ana@home', 'x'.repeat(31)])('rejects %p', (name) => {
    expect(displayNameSchema.safeParse(name).success).toBe(false);
  });

  it('trims surrounding spaces', () => {
    expect(displayNameSchema.parse('  Ana  ')).toBe('Ana');
  });
});

describe('interestedInSchema', () => {
  it('requires at least one choice', () => {
    expect(interestedInSchema.safeParse([]).success).toBe(false);
  });

  it('de-duplicates and sorts choices', () => {
    expect(interestedInSchema.parse(['woman', 'man', 'woman'])).toEqual(['man', 'woman']);
  });

  it('rejects unknown values', () => {
    expect(interestedInSchema.safeParse(['robots']).success).toBe(false);
  });
});

describe('profileDetailsSchema', () => {
  it('limits bios to 300 characters', () => {
    const base = { displayName: 'Ana', gender: 'woman', interestedIn: ['man'] };
    expect(profileDetailsSchema.safeParse({ ...base, bio: 'a'.repeat(300) }).success).toBe(true);
    expect(profileDetailsSchema.safeParse({ ...base, bio: 'a'.repeat(301) }).success).toBe(false);
  });
});
