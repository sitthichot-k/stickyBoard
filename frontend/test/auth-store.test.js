import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useAuthStore } from '@/modules/auth/stores/auth.js';

beforeEach(() => setActivePinia(createPinia()));

describe('auth store permissions', () => {
  it('admin can do anything', () => {
    const auth = useAuthStore();
    auth.user = { role: 'admin', permissions: {} };
    expect(auth.can('admin-users', 'delete')).toBe(true);
    expect(auth.canAccess('anything-at-all')).toBe(true);
  });

  it('non-admin is limited to its granted capabilities', () => {
    const auth = useAuthStore();
    auth.user = { role: 'user', permissions: { sheets: ['view', 'edit'] } };
    expect(auth.can('sheets', 'view')).toBe(true);
    expect(auth.can('sheets', 'delete')).toBe(false);
    expect(auth.canAccess('sheets')).toBe(true);
    expect(auth.canAccess('admin-users')).toBe(false);
  });

  it('no user → not authenticated, no access', () => {
    const auth = useAuthStore();
    expect(auth.isAuthenticated).toBe(false);
    expect(auth.canAccess('sheets')).toBe(false);
  });
});
