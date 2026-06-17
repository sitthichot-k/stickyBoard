import { describe, it, expect } from 'vitest';
import { createRateLimiter } from '../../src/middleware/rateLimit.js';

// Drive a limiter `n` times and count allowed vs 429-blocked responses.
function run(limiter, n, req = { ip: '1.2.3.4', originalUrl: '/x' }) {
  let ok = 0;
  let blocked = 0;
  for (let i = 0; i < n; i++) {
    const res = {
      setHeader() {},
      status(c) {
        this._c = c;
        return this;
      },
      json() {
        if (this._c === 429) blocked += 1;
      },
    };
    let nexted = false;
    limiter(req, res, () => {
      nexted = true;
    });
    if (nexted) ok += 1;
  }
  return { ok, blocked };
}

describe('createRateLimiter', () => {
  it('allows up to max, then blocks', () => {
    const rl = createRateLimiter({ windowMs: 1000, max: 3, blockMs: 1000, name: 't1' });
    expect(run(rl, 5)).toEqual({ ok: 3, blocked: 2 });
  });
  it('counts each caller (IP) independently', () => {
    const rl = createRateLimiter({ windowMs: 1000, max: 2, blockMs: 1000, name: 't2' });
    run(rl, 2, { ip: 'a', originalUrl: '/x' });
    expect(run(rl, 1, { ip: 'b', originalUrl: '/x' }).ok).toBe(1);
  });
});
