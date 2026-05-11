import { describe, it, expect } from 'vitest';
import {
  generatePayfastSignature,
  verifyPayfastSignature,
  canonicalizeFields,
} from '../signature';

describe('canonicalizeFields', () => {
  it('encodes spaces as + per PayFast spec', () => {
    expect(canonicalizeFields({ name: 'Hello World' })).toBe('name=Hello+World');
  });

  it('preserves field insertion order, not alphabetical', () => {
    const out = canonicalizeFields({ b: '2', a: '1' });
    expect(out).toBe('b=2&a=1');
  });

  it('skips empty values', () => {
    const out = canonicalizeFields({ a: '1', b: '', c: '3' });
    expect(out).toBe('a=1&c=3');
  });

  it('url-encodes special characters', () => {
    expect(canonicalizeFields({ x: 'a&b' })).toBe('x=a%26b');
  });
});

describe('generatePayfastSignature', () => {
  it('appends passphrase before MD5 hash', () => {
    const sig = generatePayfastSignature(
      { merchant_id: '10000100', amount: '100.00' },
      'jt7NOE43FZPn',
    );
    expect(sig).toMatch(/^[a-f0-9]{32}$/);
  });

  it('returns different signatures for different passphrases', () => {
    const a = generatePayfastSignature({ x: '1' }, 'pass-a');
    const b = generatePayfastSignature({ x: '1' }, 'pass-b');
    expect(a).not.toBe(b);
  });
});

describe('verifyPayfastSignature', () => {
  it('returns true for a valid signature', () => {
    const fields = { merchant_id: '10000100', amount: '100.00' };
    const sig = generatePayfastSignature(fields, 'jt7NOE43FZPn');
    expect(
      verifyPayfastSignature({ ...fields, signature: sig }, 'jt7NOE43FZPn'),
    ).toBe(true);
  });

  it('returns false for a tampered field', () => {
    const fields = { merchant_id: '10000100', amount: '100.00' };
    const sig = generatePayfastSignature(fields, 'jt7NOE43FZPn');
    expect(
      verifyPayfastSignature(
        { ...fields, amount: '999.00', signature: sig },
        'jt7NOE43FZPn',
      ),
    ).toBe(false);
  });

  it('returns false for a wrong passphrase', () => {
    const fields = { x: '1' };
    const sig = generatePayfastSignature(fields, 'pass-a');
    expect(
      verifyPayfastSignature({ ...fields, signature: sig }, 'pass-b'),
    ).toBe(false);
  });
});
