import { PASSWORD_MIN_LENGTH } from './schemas';

export type PasswordStrengthLevel = 0 | 1 | 2 | 3 | 4;

export interface PasswordRequirement {
  id: 'length' | 'letter' | 'number';
  label: string;
  met: boolean;
}

export interface PasswordStrength {
  level: PasswordStrengthLevel;
  label: string;
  /** All server-enforced requirements are met. */
  acceptable: boolean;
  requirements: PasswordRequirement[];
}

const LABELS: Record<PasswordStrengthLevel, string> = {
  0: 'Too weak',
  1: 'Fair',
  2: 'Good',
  3: 'Strong',
  4: 'Unbreakable',
};

const COMMON_FRAGMENTS = ['password', 'qwerty', '12345', 'abc123', 'letmein', 'iloveyou', 'dialed'];

/**
 * A lightweight, explainable strength estimate for the live meter. It rewards length and variety
 * and penalises obvious patterns. It is feedback, not a security control: the server's password
 * policy is the source of truth.
 */
export function getPasswordStrength(password: string): PasswordStrength {
  const requirements: PasswordRequirement[] = [
    {
      id: 'length',
      label: `${PASSWORD_MIN_LENGTH}+ characters`,
      met: password.length >= PASSWORD_MIN_LENGTH,
    },
    { id: 'letter', label: 'A letter', met: /[A-Za-z]/.test(password) },
    { id: 'number', label: 'A number', met: /\d/.test(password) },
  ];
  const acceptable = requirements.every((requirement) => requirement.met);

  if (!password) {
    return { level: 0, label: LABELS[0], acceptable: false, requirements };
  }

  let score = 0;
  if (password.length >= PASSWORD_MIN_LENGTH) score += 1;
  if (password.length >= 12) score += 1;
  if (password.length >= 16) score += 1;

  const classes = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((pattern) =>
    pattern.test(password),
  ).length;
  if (classes >= 3) score += 1;
  if (classes === 4) score += 1;

  const lower = password.toLowerCase();
  if (COMMON_FRAGMENTS.some((fragment) => lower.includes(fragment))) score -= 2;
  if (/(.)\1{2,}/.test(password)) score -= 1;

  // A password the server will reject is always "Too weak"; one it accepts is at least "Fair".
  const level = (acceptable ? Math.max(1, Math.min(4, score)) : 0) as PasswordStrengthLevel;

  return { level, label: LABELS[level], acceptable, requirements };
}
