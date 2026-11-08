import { getProfileStrength } from '../profile-strength';

describe('getProfileStrength', () => {
  it('scores an empty profile at zero and suggests the most valuable step', () => {
    const strength = getProfileStrength({ hasBasics: false, photoCount: 0, bio: '' });
    expect(strength.score).toBe(0);
    expect(strength.next?.id).toBe('basics');
  });

  it('gives diminishing points for each extra photo', () => {
    const score = (photoCount: number) =>
      getProfileStrength({ hasBasics: true, photoCount, bio: '' }).score;
    expect(score(1)).toBe(50);
    expect(score(2)).toBe(65);
    expect(score(3)).toBe(75);
    expect(score(4)).toBe(80);
    expect(score(9)).toBe(80);
  });

  it('only counts a bio once it says something', () => {
    const short = getProfileStrength({ hasBasics: true, photoCount: 4, bio: 'Hi!' });
    expect(short.score).toBe(80);
    expect(short.next?.label).toBe('Write a little more in your bio');

    const full = getProfileStrength({
      hasBasics: true,
      photoCount: 4,
      bio: 'I will out-talk you about space, tacos and bad movies.',
    });
    expect(full.score).toBe(100);
    expect(full.next).toBeNull();
  });

  it('suggests the bio before a fourth photo, since it is worth more', () => {
    const strength = getProfileStrength({ hasBasics: true, photoCount: 3, bio: '' });
    expect(strength.next?.id).toBe('bio');
  });
});
