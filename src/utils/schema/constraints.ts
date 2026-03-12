/** |===================|| Constraint Extraction ||==================|
 *  | Extract validation constraints from XSD restriction facets.
 *  |=================================================================|
 */

import { EMPTY_CONSTRAINTS } from '../../types/interpreterTypes';
import type { SchemaConstraints } from '../../types/interpreterTypes';
import type { RawXsdSimpleType } from '../schemaParser';

/**
 * Extract constraints from xs:restriction element
 * @param restriction - Raw restriction object from XSD
 * @returns SchemaConstraints object
 */
export function extractConstraints(
	restriction?: RawXsdSimpleType['xs:restriction']
): SchemaConstraints {
	if (!restriction) return EMPTY_CONSTRAINTS;

	const constraints: SchemaConstraints = {};

	if (restriction['xs:pattern']) {
		const patterns = Array.isArray(restriction['xs:pattern'])
			? restriction['xs:pattern']
			: [restriction['xs:pattern']];
		// Take first pattern (could combine if needed in future)
		constraints.pattern = patterns[0]['@_value'];
	}

	if (restriction['xs:minLength']) {
		constraints.minLength = parseInt(restriction['xs:minLength']['@_value'], 10);
	}
	if (restriction['xs:maxLength']) {
		constraints.maxLength = parseInt(restriction['xs:maxLength']['@_value'], 10);
	}

	if (restriction['xs:minInclusive']) {
		constraints.minInclusive = parseInt(restriction['xs:minInclusive']['@_value'], 10);
	}
	if (restriction['xs:maxInclusive']) {
		constraints.maxInclusive = parseInt(restriction['xs:maxInclusive']['@_value'], 10);
	}
	if (restriction['xs:minExclusive']) {
		constraints.minExclusive = parseInt(restriction['xs:minExclusive']['@_value'], 10);
	}
	if (restriction['xs:maxExclusive']) {
		constraints.maxExclusive = parseInt(restriction['xs:maxExclusive']['@_value'], 10);
	}

	if (restriction['xs:totalDigits']) {
		constraints.totalDigits = parseInt(restriction['xs:totalDigits']['@_value'], 10);
	}
	if (restriction['xs:fractionDigits']) {
		constraints.fractionDigits = parseInt(restriction['xs:fractionDigits']['@_value'], 10);
	}

	if (restriction['xs:enumeration']) {
		const enums = Array.isArray(restriction['xs:enumeration'])
			? restriction['xs:enumeration']
			: [restriction['xs:enumeration']];
		constraints.enumeration = enums.map((e) => e['@_value']);
	}

	return constraints;
}
