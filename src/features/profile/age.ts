import { MAX_AGE, MIN_AGE } from './constants';

export interface BirthdayParts {
  month: string;
  day: string;
  year: string;
}

export type BirthdayCheck =
  | { ok: true; isoDate: string; age: number }
  | { ok: false; reason: 'incomplete' | 'invalid' | 'underage' | 'too_old'; message: string };

interface CalendarDate {
  year: number;
  month: number;
  day: number;
}

function today(now: Date): CalendarDate {
  return { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() };
}

function isRealDate({ year, month, day }: CalendarDate) {
  if (month < 1 || month > 12 || day < 1) return false;
  // Day 0 of the next month is the last day of this month.
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return day <= daysInMonth;
}

/** Whole years between a birth date and `now`, using calendar dates (no timezone drift). */
export function ageOn(birth: CalendarDate, now: Date = new Date()): number {
  const current = today(now);
  let age = current.year - birth.year;
  if (current.month < birth.month || (current.month === birth.month && current.day < birth.day)) {
    age -= 1;
  }
  return age;
}

const pad = (value: number, length: number) => value.toString().padStart(length, '0');

/** Validates the birthday entered during profile setup and works out the age it implies. */
export function checkBirthday(parts: BirthdayParts, now: Date = new Date()): BirthdayCheck {
  const { month, day, year } = parts;
  if (month.length < 1 || day.length < 1 || year.length < 4) {
    return { ok: false, reason: 'incomplete', message: 'Enter your full birthday' };
  }

  const date: CalendarDate = {
    year: Number.parseInt(year, 10),
    month: Number.parseInt(month, 10),
    day: Number.parseInt(day, 10),
  };
  if ([date.year, date.month, date.day].some((value) => Number.isNaN(value)) || !isRealDate(date)) {
    return { ok: false, reason: 'invalid', message: "That date doesn't exist" };
  }

  const age = ageOn(date, now);
  if (age < 0 || age > MAX_AGE) {
    return { ok: false, reason: 'too_old', message: 'Double-check the year' };
  }
  if (age < MIN_AGE) {
    return {
      ok: false,
      reason: 'underage',
      message: `You need to be ${MIN_AGE} or older to use Dialed`,
    };
  }

  return {
    ok: true,
    age,
    isoDate: `${pad(date.year, 4)}-${pad(date.month, 2)}-${pad(date.day, 2)}`,
  };
}

/** "1995-06-15" -> "June 15, 1995" (for the locked birthday row). */
export function formatBirthday(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map((part) => Number.parseInt(part, 10));
  if (!year || !month || !day) return isoDate;
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}
