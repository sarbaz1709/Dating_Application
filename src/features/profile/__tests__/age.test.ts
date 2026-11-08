import { ageOn, checkBirthday, formatBirthday } from '../age';

// A fixed "today" so the tests never depend on the real date: 8 Nov 2026 (local time).
const NOW = new Date(2026, 10, 8, 12, 0, 0);

describe('ageOn', () => {
  it('counts whole years and only ticks over on the birthday itself', () => {
    expect(ageOn({ year: 2000, month: 11, day: 8 }, NOW)).toBe(26);
    expect(ageOn({ year: 2000, month: 11, day: 9 }, NOW)).toBe(25);
    expect(ageOn({ year: 2000, month: 12, day: 1 }, NOW)).toBe(25);
    expect(ageOn({ year: 2000, month: 1, day: 1 }, NOW)).toBe(26);
  });
});

describe('checkBirthday', () => {
  it('accepts a valid adult birthday and returns its ISO date and age', () => {
    expect(checkBirthday({ month: '6', day: '5', year: '1995' }, NOW)).toEqual({
      ok: true,
      age: 31,
      isoDate: '1995-06-05',
    });
  });

  it('treats someone turning 18 today as an adult', () => {
    const result = checkBirthday({ month: '11', day: '08', year: '2008' }, NOW);
    expect(result).toMatchObject({ ok: true, age: 18 });
  });

  it('rejects someone who turns 18 tomorrow', () => {
    const result = checkBirthday({ month: '11', day: '09', year: '2008' }, NOW);
    expect(result).toMatchObject({ ok: false, reason: 'underage' });
  });

  it.each([
    [{ month: '02', day: '30', year: '1995' }],
    [{ month: '13', day: '01', year: '1995' }],
    [{ month: '00', day: '10', year: '1995' }],
    [{ month: '04', day: '31', year: '1995' }],
  ])('rejects impossible dates %p', (parts) => {
    expect(checkBirthday(parts, NOW)).toMatchObject({ ok: false, reason: 'invalid' });
  });

  it('handles leap days', () => {
    expect(checkBirthday({ month: '02', day: '29', year: '1996' }, NOW).ok).toBe(true);
    expect(checkBirthday({ month: '02', day: '29', year: '1995' }, NOW)).toMatchObject({
      ok: false,
      reason: 'invalid',
    });
  });

  it('flags incomplete input and implausible years', () => {
    expect(checkBirthday({ month: '06', day: '05', year: '199' }, NOW)).toMatchObject({
      reason: 'incomplete',
    });
    expect(checkBirthday({ month: '06', day: '05', year: '1890' }, NOW)).toMatchObject({
      reason: 'too_old',
    });
    expect(checkBirthday({ month: '06', day: '05', year: '2030' }, NOW)).toMatchObject({
      reason: 'too_old',
    });
  });
});

describe('formatBirthday', () => {
  it('formats an ISO date without shifting the day', () => {
    expect(formatBirthday('1995-06-05')).toMatch(/1995/);
    expect(formatBirthday('1995-06-05')).toMatch(/5/);
  });
});
