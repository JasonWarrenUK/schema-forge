import { describe, it, expect } from 'vitest';
import { validateValue } from '../../../src/schema/schemaValidator';
import type { SchemaElement } from '../../../src/types/interpreterTypes';

// Helper to create test elements
function createElement(overrides: Partial<SchemaElement> = {}): SchemaElement {
	return {
		name: 'TestField',
		path: 'Test/TestField',
		baseType: 'string',
		constraints: {},
		cardinality: { min: 1, max: 1 },
		children: [],
		isComplex: false,
		...overrides,
	};
}

describe('validateValue', () => {
	describe('required field validation', () => {
		it('should return error for missing required field', () => {
			const element = createElement({ cardinality: { min: 1, max: 1 } });

			const issues = validateValue(undefined, element);

			expect(issues).toHaveLength(1);
			expect(issues[0].type).toBe('required');
			expect(issues[0].message).toContain('Required field');
		});

		it('should return error for empty string on required field', () => {
			const element = createElement({ cardinality: { min: 1, max: 1 } });

			const issues = validateValue('', element);

			expect(issues).toHaveLength(1);
			expect(issues[0].type).toBe('required');
		});

		it('should return error for null on required field', () => {
			const element = createElement({ cardinality: { min: 1, max: 1 } });

			const issues = validateValue(null, element);

			expect(issues).toHaveLength(1);
			expect(issues[0].type).toBe('required');
		});

		it('should not return error for missing optional field', () => {
			const element = createElement({ cardinality: { min: 0, max: 1 } });

			const issues = validateValue(undefined, element);

			expect(issues).toHaveLength(0);
		});

		it('should include rowIndex and sourceField in issue', () => {
			const element = createElement({ cardinality: { min: 1, max: 1 } });

			const issues = validateValue(undefined, element, { rowIndex: 5, sourceField: 'ULN' });

			expect(issues[0].rowIndex).toBe(5);
			expect(issues[0].sourceField).toBe('ULN');
		});
	});

	describe('type validation', () => {
		it('should accept any value as string type', () => {
			const element = createElement({ baseType: 'string' });

			expect(validateValue('hello', element)).toHaveLength(0);
			expect(validateValue(123, element)).toHaveLength(0);
		});

		it('should validate integer type from number', () => {
			const element = createElement({ baseType: 'int' });

			expect(validateValue(42, element)).toHaveLength(0);

			const issues = validateValue(42.5, element);
			expect(issues).toHaveLength(1);
			expect(issues[0].type).toBe('type');
			expect(issues[0].message).toContain('integer');
		});

		it('should validate integer type from string', () => {
			const element = createElement({ baseType: 'int' });

			expect(validateValue('42', element)).toHaveLength(0);

			const issues = validateValue('abc', element);
			expect(issues).toHaveLength(1);
			expect(issues[0].type).toBe('type');
		});

		it('should validate long type', () => {
			const element = createElement({ baseType: 'long' });

			expect(validateValue(1234567890, element)).toHaveLength(0);
			expect(validateValue('1234567890', element)).toHaveLength(0);
		});

		it('should validate decimal type', () => {
			const element = createElement({ baseType: 'decimal' });

			expect(validateValue(42.5, element)).toHaveLength(0);
			expect(validateValue('42.5', element)).toHaveLength(0);

			const issues = validateValue('not-a-number', element);
			expect(issues).toHaveLength(1);
			expect(issues[0].type).toBe('type');
		});

		it('should validate boolean type', () => {
			const element = createElement({ baseType: 'boolean' });

			expect(validateValue(true, element)).toHaveLength(0);
			expect(validateValue('true', element)).toHaveLength(0);
			expect(validateValue('false', element)).toHaveLength(0);
			expect(validateValue('1', element)).toHaveLength(0);
			expect(validateValue('0', element)).toHaveLength(0);

			const issues = validateValue('maybe', element);
			expect(issues).toHaveLength(1);
			expect(issues[0].type).toBe('type');
		});

		it('should validate date type (YYYY-MM-DD)', () => {
			const element = createElement({ baseType: 'date' });

			expect(validateValue('2024-01-15', element)).toHaveLength(0);

			const issues = validateValue('15/01/2024', element);
			expect(issues).toHaveLength(1);
			expect(issues[0].type).toBe('type');
			expect(issues[0].message).toContain('YYYY-MM-DD');
		});

		it('should validate dateTime type', () => {
			const element = createElement({ baseType: 'dateTime' });

			expect(validateValue('2024-01-15T10:30:00', element)).toHaveLength(0);
			expect(validateValue('2024-01-15T10:30:00Z', element)).toHaveLength(0);

			const issues = validateValue('not-a-date', element);
			expect(issues).toHaveLength(1);
			expect(issues[0].type).toBe('type');
		});

		it('rejects decimals with trailing garbage or non-finite values', () => {
			const element = createElement({ baseType: 'decimal' });

			// parseFloat stops at the first invalid character, so these parsed.
			expect(validateValue('12abc', element)).toHaveLength(1);
			expect(validateValue('1.5xyz', element)).toHaveLength(1);
			expect(validateValue('Infinity', element)).toHaveLength(1);
			expect(validateValue('1e5', element)).toHaveLength(1); // not valid xs:decimal

			expect(validateValue('1.50', element)).toHaveLength(0);
			expect(validateValue('+1.5', element)).toHaveLength(0);
			expect(validateValue('-0.25', element)).toHaveLength(0);
			expect(validateValue('.5', element)).toHaveLength(0);
		});

		it('rejects dates that match the shape but are not real days', () => {
			const element = createElement({ baseType: 'date' });

			// Date.parse rolls these over instead of rejecting them.
			expect(validateValue('2024-02-31', element)).toHaveLength(1);
			expect(validateValue('2023-02-29', element)).toHaveLength(1);
			expect(validateValue('2023-04-31', element)).toHaveLength(1);

			expect(validateValue('2024-02-29', element)).toHaveLength(0); // leap year
			expect(validateValue('2023-02-28', element)).toHaveLength(0);
		});

		it('requires ISO 8601 shape for dateTime', () => {
			const element = createElement({ baseType: 'dateTime' });

			// Bare Date.parse accepted all of these. "3/4/2024" is the dangerous
			// one: it silently resolves via US month-first convention.
			expect(validateValue('Dec 25 2024', element)).toHaveLength(1);
			expect(validateValue('3/4/2024', element)).toHaveLength(1);
			expect(validateValue('2024', element)).toHaveLength(1);
			expect(validateValue('2024-02-31T10:00:00', element)).toHaveLength(1);

			expect(validateValue('2024-01-15T10:30:00', element)).toHaveLength(0);
			expect(validateValue('2024-01-15T10:30:00Z', element)).toHaveLength(0);
			expect(validateValue('2024-01-15T10:30:00.123+01:00', element)).toHaveLength(0);
		});
	});

	describe('pattern validation', () => {
		it('should pass when value matches pattern', () => {
			const element = createElement({
				constraints: { pattern: '[A-Z]{2}[0-9]{4}' },
			});

			const issues = validateValue('AB1234', element);

			expect(issues).toHaveLength(0);
		});

		it('should fail when value does not match pattern', () => {
			const element = createElement({
				constraints: { pattern: '[A-Z]{2}[0-9]{4}' },
			});

			const issues = validateValue('123456', element);

			expect(issues).toHaveLength(1);
			expect(issues[0].type).toBe('pattern');
			expect(issues[0].constraint?.pattern).toBe('[A-Z]{2}[0-9]{4}');
		});

		it('should include actual value in issue', () => {
			const element = createElement({
				constraints: { pattern: '[A-Z]+' },
			});

			const issues = validateValue('123', element);

			expect(issues[0].actualValue).toBe('123');
		});

		it('anchors the whole value when the pattern uses alternation', () => {
			const element = createElement({ constraints: { pattern: 'M|F' } });

			// `^M|F$` parses as `(^M)|(F$)`, so these all slipped through.
			expect(validateValue('MALE', element)).toHaveLength(1);
			expect(validateValue('FEMALE', element)).toHaveLength(1);
			expect(validateValue('ZZF', element)).toHaveLength(1);

			expect(validateValue('M', element)).toHaveLength(0);
			expect(validateValue('F', element)).toHaveLength(0);
		});

		it('reports an unusable pattern instead of silently passing', () => {
			const element = createElement({ constraints: { pattern: '[unclosed' } });

			const issues = validateValue('anything', element);

			expect(issues).toHaveLength(1);
			expect(issues[0].severity).toBe('warning');
			expect(issues[0].message).toMatch(/could not be compiled/i);
		});
	});

	describe('length validation', () => {
		it('should pass when length is within range', () => {
			const element = createElement({
				constraints: { minLength: 2, maxLength: 10 },
			});

			const issues = validateValue('hello', element);

			expect(issues).toHaveLength(0);
		});

		it('should fail when string is too short', () => {
			const element = createElement({
				constraints: { minLength: 5 },
			});

			const issues = validateValue('hi', element);

			expect(issues).toHaveLength(1);
			expect(issues[0].type).toBe('minLength');
			expect(issues[0].message).toContain('at least 5');
		});

		it('should fail when string is too long', () => {
			const element = createElement({
				constraints: { maxLength: 5 },
			});

			const issues = validateValue('hello world', element);

			expect(issues).toHaveLength(1);
			expect(issues[0].type).toBe('maxLength');
			expect(issues[0].message).toContain('at most 5');
		});

		it('should return multiple issues for both violations', () => {
			const element = createElement({
				constraints: { minLength: 10, maxLength: 5 }, // Impossible range
			});

			const issues = validateValue('hello', element);

			// String length 5 is less than minLength 10
			expect(issues.some((i) => i.type === 'minLength')).toBe(true);
		});
	});

	describe('range validation (inclusive)', () => {
		it('should pass when number is within range', () => {
			const element = createElement({
				baseType: 'int',
				constraints: { minInclusive: 10, maxInclusive: 100 },
			});

			const issues = validateValue(50, element);

			expect(issues).toHaveLength(0);
		});

		it('should pass at boundary values (inclusive)', () => {
			const element = createElement({
				baseType: 'int',
				constraints: { minInclusive: 10, maxInclusive: 100 },
			});

			expect(validateValue(10, element)).toHaveLength(0);
			expect(validateValue(100, element)).toHaveLength(0);
		});

		it('should fail when number is below minimum', () => {
			const element = createElement({
				baseType: 'int',
				constraints: { minInclusive: 10000000 },
			});

			const issues = validateValue(999999, element);

			expect(issues).toHaveLength(1);
			expect(issues[0].type).toBe('minInclusive');
			expect(issues[0].constraint?.minInclusive).toBe(10000000);
		});

		it('should fail when number is above maximum', () => {
			const element = createElement({
				baseType: 'int',
				constraints: { maxInclusive: 99999999 },
			});

			const issues = validateValue(100000000, element);

			expect(issues).toHaveLength(1);
			expect(issues[0].type).toBe('maxInclusive');
		});
	});

	describe('range validation (exclusive)', () => {
		it('should fail at boundary for exclusive constraints', () => {
			const element = createElement({
				baseType: 'int',
				constraints: { minExclusive: 0, maxExclusive: 100 },
			});

			expect(validateValue(0, element)).toHaveLength(1);
			expect(validateValue(100, element)).toHaveLength(1);
			expect(validateValue(1, element)).toHaveLength(0);
			expect(validateValue(99, element)).toHaveLength(0);
		});
	});

	describe('enumeration validation', () => {
		it('should pass when value is in enumeration', () => {
			const element = createElement({
				constraints: { enumeration: ['ILR', 'OTHER'] },
			});

			const issues = validateValue('ILR', element);

			expect(issues).toHaveLength(0);
		});

		it('should fail when value is not in enumeration', () => {
			const element = createElement({
				constraints: { enumeration: ['ILR', 'OTHER'] },
			});

			const issues = validateValue('INVALID', element);

			expect(issues).toHaveLength(1);
			expect(issues[0].type).toBe('enumeration');
			expect(issues[0].message).toContain('ILR, OTHER');
		});

		it('should include enumeration values in constraint', () => {
			const element = createElement({
				constraints: { enumeration: ['Active', 'Inactive'] },
			});

			const issues = validateValue('Pending', element);

			expect(issues[0].constraint?.enumeration).toEqual(['Active', 'Inactive']);
		});
	});

	describe('multiple constraint violations', () => {
		it('should return all applicable issues', () => {
			const element = createElement({
				constraints: {
					pattern: '[A-Z]+',
					minLength: 5,
				},
			});

			// '123' fails both pattern and minLength
			const issues = validateValue('123', element);

			expect(issues.length).toBeGreaterThanOrEqual(2);
			expect(issues.some((i) => i.type === 'pattern')).toBe(true);
			expect(issues.some((i) => i.type === 'minLength')).toBe(true);
		});
	});

	describe('valid values with all constraints', () => {
		it('should return no issues for fully valid value', () => {
			const element = createElement({
				name: 'UKPRN',
				path: 'Message.Header/Source/UKPRN',
				baseType: 'int',
				constraints: {
					minInclusive: 10000000,
					maxInclusive: 99999999,
				},
			});

			const issues = validateValue(12345678, element);

			expect(issues).toHaveLength(0);
		});

		it('should validate ILR Collection field correctly', () => {
			const element = createElement({
				name: 'Collection',
				path: 'Message.Header/CollectionDetails/Collection',
				baseType: 'string',
				constraints: { enumeration: ['ILR'] },
			});

			expect(validateValue('ILR', element)).toHaveLength(0);
			expect(validateValue('NOTILR', element)).toHaveLength(1);
		});

		it('should validate LearnRefNumber pattern', () => {
			const element = createElement({
				name: 'LearnRefNumber',
				path: 'Message.Learner.LearnRefNumber',
				baseType: 'string',
				constraints: { pattern: '[A-Za-z0-9 ]{1,12}' },
			});

			expect(validateValue('ABC123', element)).toHaveLength(0);
			expect(validateValue('Valid Ref', element)).toHaveLength(0);
			expect(validateValue('TooLongReference!', element)).toHaveLength(1);
		});
	});
});
