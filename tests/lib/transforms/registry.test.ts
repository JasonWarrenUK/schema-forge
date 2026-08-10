import { describe, it, expect } from 'vitest';
import { TRANSFORMS, getTransform, getTransformsByCategory, getTransformMetadata } from
'../../../src/transforms/registry';

describe('transforms/registry', () => {
  describe('TRANSFORMS', () => {
          it('should contain all expected transforms', () => {
                  const transformNames = Object.keys(TRANSFORMS);

                  expect(transformNames).toContain('stringToInt');
                  expect(transformNames).toContain('stringToIntOptional');
                  expect(transformNames).toContain('isoDate');
                  expect(transformNames).toContain('uppercase');
                  expect(transformNames).toContain('trim');
                  expect(transformNames).toContain('uppercaseNoSpaces');
                  expect(transformNames).toContain('digitsOnly');
                  expect(transformNames).toContain('boolToInt');
          });

          it('should have metadata for each transform', () => {
                  for (const [name, transform] of Object.entries(TRANSFORMS)) {
                          expect(transform.fn).toBeTypeOf('function');
                          expect(transform.description).toBeTypeOf('string');
                          expect(transform.example).toBeTypeOf('string');
                          expect(transform.category).toBeTypeOf('string');
                  }
          });
  });

  describe('getTransform', () => {
          it('should return transform function by name', () => {
                  const transform = getTransform('stringToInt');

                  expect(transform).toBeTypeOf('function');
                  expect(transform('123')).toBe(123);
                  expect(transform('invalid')).toBe(0);
          });

          it('should throw error for unknown transform', () => {
                  expect(() => getTransform('nonexistent')).toThrow(/Unknown transform/);
          });
  });

  describe('getTransformsByCategory', () => {
          it('should group transforms by category', () => {
                  const grouped = getTransformsByCategory();

                  expect(grouped.type).toContain('stringToInt');
                  expect(grouped.type).toContain('stringToIntOptional');
                  expect(grouped.date).toContain('isoDate');
                  expect(grouped.string).toContain('uppercase');
                  expect(grouped.string).toContain('trim');
          });
  });

  describe('getTransformMetadata', () => {
          it('should return metadata for valid transform', () => {
                  const meta = getTransformMetadata('stringToInt');

                  expect(meta).toBeDefined();
                  expect(meta?.description).toContain('integer');
                  expect(meta?.example).toBeDefined();
          });

          it('should return null for unknown transform', () => {
                  const meta = getTransformMetadata('nonexistent');

                  expect(meta).toBeNull();
          });
  });

  describe('transform functions', () => {
          describe('stringToInt', () => {
                  it('should convert valid strings to integers', () => {
                          const fn = getTransform('stringToInt');
                          expect(fn('123')).toBe(123);
                          expect(fn('0')).toBe(0);
                          expect(fn('-456')).toBe(-456);
                  });

                  it('should default to 0 for invalid strings', () => {
                          const fn = getTransform('stringToInt');
                          expect(fn('invalid')).toBe(0);
                          expect(fn('')).toBe(0);
                  });
          });

          describe('stringToIntOptional', () => {
                  it('should convert valid strings to integers', () => {
                          const fn = getTransform('stringToIntOptional');
                          expect(fn('123')).toBe(123);
                  });

                  it('should return undefined for empty strings', () => {
                          const fn = getTransform('stringToIntOptional');
                          expect(fn('')).toBeUndefined();
                  });
          });

          describe('uppercase', () => {
                  it('should convert to uppercase', () => {
                          const fn = getTransform('uppercase');
                          expect(fn('hello')).toBe('HELLO');
                          expect(fn('MiXeD')).toBe('MIXED');
                  });
          });

          describe('uppercaseNoSpaces', () => {
                  it('should convert to uppercase and remove spaces', () => {
                          const fn = getTransform('uppercaseNoSpaces');
                          expect(fn('sw1a 1aa')).toBe('SW1A1AA');
                          expect(fn('hello world')).toBe('HELLOWORLD');
                  });
          });

          describe('trim', () => {
                  it('should remove leading and trailing whitespace', () => {
                          const fn = getTransform('trim');
                          expect(fn('  hello  ')).toBe('hello');
                          expect(fn('\ttext\n')).toBe('text');
                  });
          });

          describe('isoDate', () => {
                  it('should pass through ISO date strings', () => {
                          const fn = getTransform('isoDate');
                          expect(fn('2025-01-28')).toBe('2025-01-28');
                  });
          });

          describe('digitsOnly', () => {
                  it('should extract only digit characters', () => {
                          const fn = getTransform('digitsOnly');
                          expect(fn('Tel: 020-1234-5678')).toBe('02012345678');
                          expect(fn('abc123def456')).toBe('123456');
                          expect(fn('   789   ')).toBe('789');
                  });

                  it('should return empty string when no digits present', () => {
                          const fn = getTransform('digitsOnly');
                          expect(fn('no digits here')).toBe('');
                  });
          });

          describe('boolToInt', () => {
                  it('should convert truthy values to 1', () => {
                          const fn = getTransform('boolToInt');
                          expect(fn('true')).toBe(1);
                          expect(fn('True')).toBe(1);
                          expect(fn('TRUE')).toBe(1);
                          expect(fn('1')).toBe(1);
                          expect(fn('yes')).toBe(1);
                          expect(fn('Yes')).toBe(1);
                  });

                  it('should convert falsy values to 0', () => {
                          const fn = getTransform('boolToInt');
                          expect(fn('false')).toBe(0);
                          expect(fn('False')).toBe(0);
                          expect(fn('0')).toBe(0);
                          expect(fn('no')).toBe(0);
                          expect(fn('')).toBe(0);
                          expect(fn('anything else')).toBe(0);
                  });
          });

          describe('constant (parameterized)', () => {
                  it('should return numeric constant when number provided', () => {
                          const fn = getTransform('constant(1)');
                          expect(fn('ignored')).toBe(1);
                          expect(fn('also ignored')).toBe(1);
                  });

                  it('should return string constant when non-number provided', () => {
                          const fn = getTransform('constant(SEI)');
                          expect(fn('ignored')).toBe('SEI');
                  });

                  it('should return numeric constant for valid number strings', () => {
                          const fn = getTransform('constant(42)');
                          expect(fn('input')).toBe(42);
                  });

                  it('should throw error when no argument provided', () => {
                          expect(() => getTransform('constant()')).toThrow(/requires an argument/);
                  });
          });

          describe('strict numeric transforms', () => {
                  it('distinguishes invalid input from a genuine zero', () => {
                          const toInt = getTransform('stringToIntStrict');

                          expect(toInt('0')).toBe(0);
                          expect(toInt('42')).toBe(42);
                          expect(toInt('invalid')).toBeUndefined();
                          expect(toInt('12abc')).toBeUndefined();
                          expect(toInt('')).toBeUndefined();
                  });

                  it('does the same for floats', () => {
                          const toFloat = getTransform('stringToFloatStrict');

                          expect(toFloat('0')).toBe(0);
                          expect(toFloat('1.5')).toBe(1.5);
                          expect(toFloat('1.5xyz')).toBeUndefined();
                          expect(toFloat('nonsense')).toBeUndefined();
                  });
          });

          describe('parameterised normalizeAddress', () => {
                  it('truncates to the given length', () => {
                          const long = 'x'.repeat(80);

                          expect(getTransform('normalizeAddress(30)')(long)).toHaveLength(30);
                          expect(getTransform('normalizeAddress(100)')(long)).toHaveLength(80);
                  });

                  it('keeps the historical 50-character default', () => {
                          expect(getTransform('normalizeAddress')('x'.repeat(80))).toHaveLength(50);
                  });
          });

          describe('passthrough date transforms', () => {
                  it('exposes the honest names', () => {
                          expect(getTransform('passthroughDate')('28/01/2025')).toBe('28/01/2025');
                          expect(getTransform('passthroughDateTime')('whatever')).toBe('whatever');
                  });

                  it('keeps the old names working', () => {
                          expect(getTransform('isoDate')('2025-01-28')).toBe('2025-01-28');
                          expect(getTransform('isoDateTime')('2025-01-28T10:30:00Z')).toBe('2025-01-28T10:30:00Z');
                  });
          });
  });
});
