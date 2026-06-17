import { describe, it, expect } from 'vitest';
import { checkRegistrationEmail } from '../../src/modules/auth/email-policy.js';

describe('checkRegistrationEmail', () => {
  it('accepts a normal email', () => {
    expect(checkRegistrationEmail('a@gmail.com').ok).toBe(true);
  });
  it('rejects malformed addresses', () => {
    expect(checkRegistrationEmail('nope').ok).toBe(false);
    expect(checkRegistrationEmail('a@b').ok).toBe(false);
  });
  it('rejects reserved domains (example.com/test)', () => {
    expect(checkRegistrationEmail('x@example.com').ok).toBe(false);
    expect(checkRegistrationEmail('x@test').ok).toBe(false);
  });
  it('rejects disposable providers', () => {
    expect(checkRegistrationEmail('x@mailinator.com').ok).toBe(false);
  });
  it('is case-insensitive on the domain', () => {
    expect(checkRegistrationEmail('X@EXAMPLE.COM').ok).toBe(false);
  });
});
