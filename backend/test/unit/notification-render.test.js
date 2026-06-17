import { describe, it, expect } from 'vitest';
import { render } from '../../src/modules/notification/catalog.js';

describe('notification render', () => {
  it('replaces placeholders', () => {
    expect(render('Hi {{name}}', { name: 'Ann' })).toBe('Hi Ann');
  });
  it('tolerates spaces inside braces', () => {
    expect(render('{{ name }}', { name: 'Bob' })).toBe('Bob');
  });
  it('renders missing vars as empty', () => {
    expect(render('x {{missing}} y', {})).toBe('x  y');
  });
});
