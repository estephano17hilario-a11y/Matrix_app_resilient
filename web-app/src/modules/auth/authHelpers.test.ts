import { describe, expect, it } from 'vitest';
import { authErrorKey, isValidEmail, isValidName, passwordScore, suggestEmail } from './authHelpers';

describe('authErrorKey', () => {
  it('maps GoTrue codes and messages', () => {
    expect(authErrorKey({ code: 'invalid_credentials' })).toBe('invalidCredentials');
    expect(authErrorKey({ message: 'Invalid login credentials' })).toBe('invalidCredentials');
    expect(authErrorKey({ code: 'user_already_exists' })).toBe('emailInUse');
    expect(authErrorKey({ message: 'User already registered' })).toBe('emailInUse');
    expect(authErrorKey({ code: 'email_not_confirmed' })).toBe('emailNotConfirmed');
    expect(authErrorKey({ status: 429, message: 'x' })).toBe('tooManyRequests');
    expect(authErrorKey({ code: 'over_email_send_rate_limit' })).toBe('tooManyRequests');
    expect(authErrorKey({ code: 'email_confirmation_required' })).toBe('confirmationRequired');
    expect(authErrorKey(new TypeError('Failed to fetch'))).toBe('network');
    expect(authErrorKey({ message: 'popup_closed_by_user' })).toBe('cancelled');
    expect(authErrorKey(null)).toBe('generic');
    expect(authErrorKey({ message: 'boom' })).toBe('generic');
  });
});

describe('suggestEmail', () => {
  it('fixes common provider typos', () => {
    expect(suggestEmail('ana@gmial.com')).toBe('ana@gmail.com');
    expect(suggestEmail('ana@hotmial.com')).toBe('ana@hotmail.com');
    expect(suggestEmail('ana@gmail.co')).toBe('ana@gmail.com');
    expect(suggestEmail('ana@gmail')).toBe('ana@gmail.com');
  });
  it('leaves correct or unknown domains alone', () => {
    expect(suggestEmail('ana@gmail.com')).toBeNull();
    expect(suggestEmail('ana@empresa-propia.io')).toBeNull();
    expect(suggestEmail('ana')).toBeNull();
    expect(suggestEmail('ana@g')).toBeNull();
  });
});

describe('validation', () => {
  it('validates email and name', () => {
    expect(isValidEmail('a@b.co')).toBe(true);
    expect(isValidEmail('a@b')).toBe(false);
    expect(isValidName(' A ')).toBe(false);
    expect(isValidName('Al')).toBe(true);
    expect(isValidName('1234567890123')).toBe(false);
  });
  it('scores passwords', () => {
    expect(passwordScore('')).toBe(0);
    expect(passwordScore('abc')).toBe(1);
    expect(passwordScore('abcdef')).toBe(2);
    expect(passwordScore('abcdefghijk')).toBe(3);
    expect(passwordScore('Abcdefghij1!')).toBe(4);
  });
});
