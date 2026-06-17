import { describe, it, expect } from 'vitest';
import { encrypt, decrypt } from '../../src/helpers/crypto.js';

describe('crypto (secrets at rest)', () => {
  it('round-trips a secret and hides the plaintext', () => {
    const cipher = encrypt('s3cret-pass');
    expect(cipher).not.toContain('s3cret');
    expect(decrypt(cipher)).toBe('s3cret-pass');
  });
  it('treats empty values as empty', () => {
    expect(encrypt('')).toBe('');
    expect(decrypt('')).toBe('');
  });
  it('returns empty for corrupted ciphertext instead of throwing', () => {
    expect(decrypt('not-a-valid-blob')).toBe('');
  });
});
