/** |===================|| Type Resolution ||==================|
 *  | Resolve type references to base XSD types and build named
 *  | type registries.
 *  |===========================================================|
 */

import type { XsdBaseType, NamedSimpleType } from '../../types/interpreterTypes';
import type { RawXsdSimpleType } from '../schemaParser';
import { extractConstraints } from './constraints';

/**
 * Resolve a type reference to its base XSD type
 * @param typeRef - Type reference (e.g., "xs:string", "PostcodeType")
 * @param namedTypesMap - Map of named simple types
 * @returns Resolved XsdBaseType
 */
export function resolveBaseType(
	typeRef: string | undefined,
	namedTypesMap: Map<string, NamedSimpleType>
): XsdBaseType {
	if (!typeRef) return 'string';

	if (typeRef.startsWith('xs:')) {
		const baseType = typeRef.slice(3) as XsdBaseType;
		return baseType;
	}

	const namedType = namedTypesMap.get(typeRef);
	if (namedType) {
		return namedType.baseType;
	}

	return 'string';
}

/**
 * Build map of named simple types from raw XSD types
 * @param rawSimpleTypes - Array of raw simple type definitions
 * @returns Map of type name to NamedSimpleType
 */
export function buildNamedTypesMap(
	rawSimpleTypes: RawXsdSimpleType[]
): Map<string, NamedSimpleType> {
	const namedTypes = new Map<string, NamedSimpleType>();

	for (const rawType of rawSimpleTypes) {
		const name = rawType['@_name'];
		if (!name) continue;

		const restriction = rawType['xs:restriction'];
		const baseTypeRef = restriction?.['@_base'];
		const constraints = extractConstraints(restriction);

		let baseType: XsdBaseType = 'string';
		if (baseTypeRef?.startsWith('xs:')) {
			baseType = baseTypeRef.slice(3) as XsdBaseType;
		} else if (baseTypeRef) {
			const referencedType = namedTypes.get(baseTypeRef);
			baseType = referencedType?.baseType ?? 'string';
		}

		namedTypes.set(name, { name, baseType, constraints });
	}

	return namedTypes;
}
