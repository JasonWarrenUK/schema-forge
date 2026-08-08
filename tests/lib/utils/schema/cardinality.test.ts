import { describe, it, expect } from 'vitest';
import { parseCardinality } from '../../../../src/utils/schema/cardinality';
import type { RawXsdElement } from '../../../../src/schema/schemaParser';

describe('parseCardinality', () => {
	it('should parse minOccurs and maxOccurs from element', () => {
		const element: RawXsdElement = {
			'@_name': 'Test',
			'@_minOccurs': '0',
			'@_maxOccurs': '5',
		};

		expect(parseCardinality(element)).toEqual({ min: 0, max: 5 });
	});

	it('should handle unbounded maxOccurs as Infinity', () => {
		const element: RawXsdElement = {
			'@_name': 'Test',
			'@_minOccurs': '1',
			'@_maxOccurs': 'unbounded',
		};

		expect(parseCardinality(element)).toEqual({ min: 1, max: Infinity });
	});

	it('should use default cardinality when attributes absent', () => {
		const element: RawXsdElement = {
			'@_name': 'Test',
		};

		expect(parseCardinality(element)).toEqual({ min: 1, max: 1 });
	});

	it('should use default min when only maxOccurs present', () => {
		const element: RawXsdElement = {
			'@_name': 'Test',
			'@_maxOccurs': '10',
		};

		expect(parseCardinality(element)).toEqual({ min: 1, max: 10 });
	});

	it('should use default max when only minOccurs present', () => {
		const element: RawXsdElement = {
			'@_name': 'Test',
			'@_minOccurs': '0',
		};

		expect(parseCardinality(element)).toEqual({ min: 0, max: 1 });
	});
});
