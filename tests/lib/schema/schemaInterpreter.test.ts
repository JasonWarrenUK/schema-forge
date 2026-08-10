import { describe, expect, it } from 'vitest';
import {
	isRequired,
	isRepeatable,
	isOptional,
	DEFAULT_CARDINALITY,
	EMPTY_CONSTRAINTS,
} from '../../../src/index';
import * as fixtures from '../../fixtures/lib/schema';

describe('Cardinality utility functions', () => {
	describe('isRequired', () => {
		it('returns true when min >= 1', () => {
			expect(isRequired(fixtures.makeElement(fixtures.requiredSingle))).toBe(true);
			expect(isRequired(fixtures.makeElement(fixtures.requiredMultiple))).toBe(true);
		});

		it('returns false when min === 0', () => {
			expect(isRequired(fixtures.makeElement(fixtures.optionalSingle))).toBe(false);
			expect(isRequired(fixtures.makeElement(fixtures.optionalUnbounded))).toBe(false);
		});
	});

	describe('isOptional', () => {
		it('returns true when min === 0', () => {
			expect(isOptional(fixtures.makeElement(fixtures.optionalSingle))).toBe(true);
			expect(isOptional(fixtures.makeElement(fixtures.optionalUnbounded))).toBe(true);
		});

		it('returns false when min >= 1', () => {
			expect(isOptional(fixtures.makeElement(fixtures.requiredSingle))).toBe(false);
			expect(isOptional(fixtures.makeElement(fixtures.requiredMultiple))).toBe(false);
		});
	});

	describe('isRepeatable', () => {
		it('returns true when max > 1', () => {
			expect(isRepeatable(fixtures.makeElement(fixtures.requiredMultiple))).toBe(true);
			expect(isRepeatable(fixtures.makeElement(fixtures.requiredUnbounded))).toBe(true);
		});

		it('returns false when max === 1', () => {
			expect(isRepeatable(fixtures.makeElement(fixtures.optionalSingle))).toBe(false);
			expect(isRepeatable(fixtures.makeElement(fixtures.requiredSingle))).toBe(false);
		});
	});
});

describe('Constants', () => {
	describe('DEFAULT_CARDINALITY', () => {
		it('represents required single occurrence (min: 1, max: 1)', () => {
			expect(DEFAULT_CARDINALITY).toEqual({ min: 1, max: 1 });
		});
	});

	describe('EMPTY_CONSTRAINTS', () => {
		it('is an empty object', () => {
			expect(EMPTY_CONSTRAINTS).toEqual({});
		});

		it('is frozen, so it cannot be mutated into shared state', () => {
			expect(Object.isFrozen(EMPTY_CONSTRAINTS)).toBe(true);
		});
	});
});
