import { describe, it, expect } from 'vitest';
import { createBaseService } from '../../src/helpers/base.service.js';

// buildFilter is model-agnostic — pass a dummy model.
const svc = createBaseService({}, { searchableFields: ['name', 'email'] });

describe('base.service buildFilter', () => {
  it('always scopes to non-deleted docs', () => {
    expect(svc.buildFilter({}).deletedAt).toBe(null);
  });
  it('escapes regex metacharacters in search', () => {
    const f = svc.buildFilter({ search: '(a+)+$' });
    expect(f.$or[0].name.$regex).toBe('\\(a\\+\\)\\+\\$');
    expect(f.$or).toHaveLength(2); // one per searchable field
  });
  it('merges exact-match filters', () => {
    expect(svc.buildFilter({ filters: { role: 'admin' } }).role).toBe('admin');
  });
  it('omits $or when there is no search term', () => {
    expect(svc.buildFilter({}).$or).toBeUndefined();
  });
});
