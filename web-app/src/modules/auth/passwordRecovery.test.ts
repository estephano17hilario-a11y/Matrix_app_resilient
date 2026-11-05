import { describe, expect, it } from 'vitest';
import { isRecoveryUrl } from './passwordRecovery';

describe('isRecoveryUrl', () => {
  it('detects a recovery redirect in the hash', () => {
    expect(isRecoveryUrl('com.luxresilient.app://auth/callback#access_token=a&refresh_token=b&type=recovery')).toBe(true);
    expect(isRecoveryUrl('com.luxresilient.app://auth/callback#type=recovery&access_token=a')).toBe(true);
  });
  it('detects it in the query string', () => {
    expect(isRecoveryUrl('com.luxresilient.app://auth/callback?type=recovery')).toBe(true);
  });
  it('ignores normal sign-in redirects and look-alikes', () => {
    expect(isRecoveryUrl('com.luxresilient.app://auth/callback#access_token=a&refresh_token=b&type=magiclink')).toBe(false);
    expect(isRecoveryUrl('com.luxresilient.app://auth/callback#access_token=a&refresh_token=b')).toBe(false);
    expect(isRecoveryUrl('com.luxresilient.app://auth/callback#subtype=recovery')).toBe(false);
  });
});
