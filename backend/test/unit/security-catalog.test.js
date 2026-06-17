import { describe, it, expect } from 'vitest';
import { pageForApiPath } from '../../src/modules/security/catalog.js';

describe('pageForApiPath', () => {
  it('maps board data routes to the sheets page', () => {
    expect(pageForApiPath('/api/v1/notes/123')?.key).toBe('sheets');
    expect(pageForApiPath('/api/v1/strokes?sheetId=1')?.key).toBe('sheets');
  });
  it('resolves by longest matching prefix', () => {
    expect(pageForApiPath('/api/v1/settings/runtime')?.key).toBe('admin-config');
    expect(pageForApiPath('/api/v1/settings/all')?.key).toBe('admin-settings');
  });
  it('returns null for an uncatalogued path', () => {
    expect(pageForApiPath('/api/v1/nope')).toBe(null);
  });
});
