// Pure helpers for the auth screens (no React, no Supabase) so they stay unit-testable.

export const NAME_MIN = 2;
export const NAME_MAX = 12;
export const PASSWORD_MIN = 6; // GoTrue's default minimum

export const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
export const isValidName = (name: string) => {
  const n = name.trim().length;
  return n >= NAME_MIN && n <= NAME_MAX;
};

export type AuthErrorKey =
  | 'invalidCredentials'
  | 'emailInUse'
  | 'weakPassword'
  | 'emailNotConfirmed'
  | 'tooManyRequests'
  | 'invalidEmail'
  | 'network'
  | 'confirmationRequired'
  | 'cancelled'
  | 'generic';

/** Maps Supabase (GoTrue) / Google plugin errors to a translation key under `auth.errors`. */
export const authErrorKey = (err: unknown): AuthErrorKey => {
  const e = (err ?? {}) as { code?: unknown; message?: unknown; status?: unknown };
  const code = String(e.code ?? '').toLowerCase();
  const msg = String(e.message ?? '').toLowerCase();
  const status = Number(e.status ?? 0);

  if (code === 'email_confirmation_required') return 'confirmationRequired';
  if (code === 'invalid_credentials' || msg.includes('invalid login credentials')) return 'invalidCredentials';
  if (code === 'user_already_exists' || code === 'email_exists' || msg.includes('already registered')) return 'emailInUse';
  if (code === 'weak_password' || msg.includes('password should be')) return 'weakPassword';
  if (code === 'email_not_confirmed' || msg.includes('email not confirmed')) return 'emailNotConfirmed';
  if (code.includes('rate_limit') || status === 429 || msg.includes('rate limit')) return 'tooManyRequests';
  if (code === 'email_address_invalid' || (msg.includes('email') && msg.includes('invalid'))) return 'invalidEmail';
  if (code === '12501' || msg.includes('popup_closed') || msg.includes('canceled') || msg.includes('cancelled')) return 'cancelled';
  if (msg.includes('failed to fetch') || msg.includes('network') || code === 'network') return 'network';
  return 'generic';
};

// --- Email typo suggestion ("gmial.com" -> "gmail.com") ---

const KNOWN_DOMAINS = [
  'gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.com', 'icloud.com', 'live.com',
  'hotmail.es', 'outlook.es', 'yahoo.es', 'proton.me', 'protonmail.com', 'msn.com',
];

const distance = (a: string, b: string): number => {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return row[b.length];
};

/** Returns a corrected email when the domain looks like a typo of a popular provider, else null. */
export const suggestEmail = (email: string): string | null => {
  const value = email.trim();
  const at = value.lastIndexOf('@');
  if (at < 1) return null;
  const domain = value.slice(at + 1).toLowerCase();
  if (domain.length < 4 || KNOWN_DOMAINS.includes(domain)) return null;
  let best: string | null = null;
  let bestScore = Infinity;
  for (const candidate of KNOWN_DOMAINS) {
    const d = distance(domain, candidate);
    if (d < bestScore) { bestScore = d; best = candidate; }
  }
  // "gmail" (no TLD) is also a common slip.
  const bare = KNOWN_DOMAINS.find(c => c.split('.')[0] === domain);
  if (bare) return `${value.slice(0, at + 1)}${bare}`;
  return best && bestScore > 0 && bestScore <= 2 ? `${value.slice(0, at + 1)}${best}` : null;
};

// --- Password strength (0 = empty, 1 = too short, 2..4 = acceptable..excellent) ---

export type PasswordScore = 0 | 1 | 2 | 3 | 4;

export const passwordScore = (pw: string): PasswordScore => {
  if (!pw) return 0;
  if (pw.length < PASSWORD_MIN) return 1;
  const classes = [/[a-z]/, /[A-Z]/, /\d/, /[^a-zA-Z0-9]/].filter(r => r.test(pw)).length;
  let score = 2;
  if (pw.length >= 10) score++;
  if (classes >= 3) score++;
  return Math.min(score, 4) as PasswordScore;
};
