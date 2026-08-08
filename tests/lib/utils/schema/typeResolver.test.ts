import { describe, it, expect } from 'vitest';
import { resolveBaseType, buildNamedTypesMap } from '../../../../src/utils/schema/typeResolver';
import type { RawXsdSimpleType } from '../../../../src/schema/schemaParser';
import type { NamedSimpleType } from '../../../../src/types/interpreterTypes';

describe('resolveBaseType', () => {
	it('should default to string when typeRef undefined', () => {
		const namedTypes = new Map<string, NamedSimpleType>();
		expect(resolveBaseType(undefined, namedTypes)).toBe('string');
	});

	it('should resolve xs: prefixed built-in types', () => {
		const namedTypes = new Map<string, NamedSimpleType>();

		expect(resolveBaseType('xs:string', namedTypes)).toBe('string');
		expect(resolveBaseType('xs:int', namedTypes)).toBe('int');
		expect(resolveBaseType('xs:date', namedTypes)).toBe('date');
		expect(resolveBaseType('xs:boolean', namedTypes)).toBe('boolean');
	});

	it('should resolve named type reference to its base type', () => {
		const namedTypes = new Map<string, NamedSimpleType>([
			['PostcodeType', { name: 'PostcodeType', baseType: 'string', constraints: {} }],
		]);

		expect(resolveBaseType('PostcodeType', namedTypes)).toBe('string');
	});

	it('should default to string for unknown named type', () => {
		const namedTypes = new Map<string, NamedSimpleType>();
		expect(resolveBaseType('UnknownType', namedTypes)).toBe('string');
	});
});

describe('buildNamedTypesMap', () => {
	it('should build empty map from empty array', () => {
		const result = buildNamedTypesMap([]);
		expect(result.size).toBe(0);
	});

	it('should skip types without names', () => {
		const rawTypes: RawXsdSimpleType[] = [
			{
				'xs:restriction': { '@_base': 'xs:string' },
			},
		];

		const result = buildNamedTypesMap(rawTypes);
		expect(result.size).toBe(0);
	});

	it('should build map with single named type', () => {
		const rawTypes: RawXsdSimpleType[] = [
			{
				'@_name': 'PostcodeType',
				'xs:restriction': {
					'@_base': 'xs:string',
					'xs:pattern': { '@_value': '[A-Z]{2}[0-9]{2}' },
				},
			},
		];

		const result = buildNamedTypesMap(rawTypes);

		expect(result.size).toBe(1);
		expect(result.get('PostcodeType')).toEqual({
			name: 'PostcodeType',
			baseType: 'string',
			constraints: { pattern: '[A-Z]{2}[0-9]{2}' },
		});
	});

	it('should resolve xs: prefixed base types', () => {
		const rawTypes: RawXsdSimpleType[] = [
			{
				'@_name': 'AgeType',
				'xs:restriction': {
					'@_base': 'xs:int',
					'xs:minInclusive': { '@_value': '0' },
				},
			},
		];

		const result = buildNamedTypesMap(rawTypes);

		expect(result.get('AgeType')?.baseType).toBe('int');
	});

	it('should resolve chain of named type references', () => {
		const rawTypes: RawXsdSimpleType[] = [
			{
				'@_name': 'RestrictedString',
				'xs:restriction': {
					'@_base': 'xs:string',
				},
			},
			{
				'@_name': 'PostcodeType',
				'xs:restriction': {
					'@_base': 'RestrictedString',
					'xs:pattern': { '@_value': '[A-Z]{2}' },
				},
			},
		];

		const result = buildNamedTypesMap(rawTypes);

		expect(result.get('PostcodeType')?.baseType).toBe('string');
	});

	it('should default to string for unresolvable type reference', () => {
		const rawTypes: RawXsdSimpleType[] = [
			{
				'@_name': 'MyType',
				'xs:restriction': {
					'@_base': 'UnknownType',
				},
			},
		];

		const result = buildNamedTypesMap(rawTypes);

		expect(result.get('MyType')?.baseType).toBe('string');
	});
});
