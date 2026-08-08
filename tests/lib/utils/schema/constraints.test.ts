import { describe, it, expect } from 'vitest';
import { extractConstraints } from '../../../../src/utils/schema/constraints';
import type { RawXsdSimpleType } from '../../../../src/schema/schemaParser';

describe('extractConstraints', () => {
	it('should return empty constraints when restriction undefined', () => {
		expect(extractConstraints(undefined)).toEqual({});
	});

	it('should extract pattern from single pattern facet', () => {
		const restriction: RawXsdSimpleType['xs:restriction'] = {
			'@_base': 'xs:string',
			'xs:pattern': { '@_value': '[A-Z]{3}' },
		};

		expect(extractConstraints(restriction)).toEqual({
			pattern: '[A-Z]{3}',
		});
	});

	it('should extract pattern from array of patterns (takes first)', () => {
		const restriction: RawXsdSimpleType['xs:restriction'] = {
			'@_base': 'xs:string',
			'xs:pattern': [{ '@_value': '[A-Z]{3}' }, { '@_value': '[0-9]{3}' }],
		};

		expect(extractConstraints(restriction)).toEqual({
			pattern: '[A-Z]{3}',
		});
	});

	it('should extract length constraints', () => {
		const restriction: RawXsdSimpleType['xs:restriction'] = {
			'@_base': 'xs:string',
			'xs:minLength': { '@_value': '5' },
			'xs:maxLength': { '@_value': '10' },
		};

		expect(extractConstraints(restriction)).toEqual({
			minLength: 5,
			maxLength: 10,
		});
	});

	it('should extract numeric range constraints', () => {
		const restriction: RawXsdSimpleType['xs:restriction'] = {
			'@_base': 'xs:int',
			'xs:minInclusive': { '@_value': '100' },
			'xs:maxInclusive': { '@_value': '999' },
		};

		expect(extractConstraints(restriction)).toEqual({
			minInclusive: 100,
			maxInclusive: 999,
		});
	});

	it('should extract exclusive range constraints', () => {
		const restriction: RawXsdSimpleType['xs:restriction'] = {
			'@_base': 'xs:int',
			'xs:minExclusive': { '@_value': '0' },
			'xs:maxExclusive': { '@_value': '100' },
		};

		expect(extractConstraints(restriction)).toEqual({
			minExclusive: 0,
			maxExclusive: 100,
		});
	});

	it('should extract digit constraints', () => {
		const restriction: RawXsdSimpleType['xs:restriction'] = {
			'@_base': 'xs:decimal',
			'xs:totalDigits': { '@_value': '8' },
			'xs:fractionDigits': { '@_value': '2' },
		};

		expect(extractConstraints(restriction)).toEqual({
			totalDigits: 8,
			fractionDigits: 2,
		});
	});

	it('should extract enumeration from single value', () => {
		const restriction: RawXsdSimpleType['xs:restriction'] = {
			'@_base': 'xs:string',
			'xs:enumeration': { '@_value': 'Active' },
		};

		expect(extractConstraints(restriction)).toEqual({
			enumeration: ['Active'],
		});
	});

	it('should extract enumeration from array of values', () => {
		const restriction: RawXsdSimpleType['xs:restriction'] = {
			'@_base': 'xs:string',
			'xs:enumeration': [
				{ '@_value': 'Active' },
				{ '@_value': 'Inactive' },
				{ '@_value': 'Pending' },
			],
		};

		expect(extractConstraints(restriction)).toEqual({
			enumeration: ['Active', 'Inactive', 'Pending'],
		});
	});

	it('should extract multiple constraint types together', () => {
		const restriction: RawXsdSimpleType['xs:restriction'] = {
			'@_base': 'xs:string',
			'xs:pattern': { '@_value': '[A-Z]{2}[0-9]{4}' },
			'xs:minLength': { '@_value': '6' },
			'xs:maxLength': { '@_value': '6' },
		};

		expect(extractConstraints(restriction)).toEqual({
			pattern: '[A-Z]{2}[0-9]{4}',
			minLength: 6,
			maxLength: 6,
		});
	});
});
