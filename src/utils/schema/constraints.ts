/** |===================|| Constraint Extraction ||==================|
 *  | Extract validation constraints from XSD restriction facets.
 *  |=================================================================|
 */

import { EMPTY_CONSTRAINTS } from '../../types/interpreterTypes';
import type { SchemaConstraints } from '../../types/interpreterTypes';
import type { RawXsdSimpleType } from '../../schema/schemaParser';

/**
 * Extract constraints from xs:restriction element
 * @param restriction - Raw restriction object from XSD
 * @returns SchemaConstraints object
 */
export function extractConstraints(
	restriction?: RawXsdSimpleType['xs:restriction']
): SchemaConstraints {
	if (!restriction) return { ...EMPTY_CONSTRAINTS };

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

	// Range facets bound a value, so they carry the value's precision:
	// maxInclusive="99.5" truncated to 99 wrongly rejects 99.5. The digit and
	// length facets below are counts, so parseInt is correct for those.
	if (restriction['xs:minInclusive']) {
		constraints.minInclusive = parseFloat(restriction['xs:minInclusive']['@_value']);
	}
	if (restriction['xs:maxInclusive']) {
		constraints.maxInclusive = parseFloat(restriction['xs:maxInclusive']['@_value']);
	}
	if (restriction['xs:minExclusive']) {
		constraints.minExclusive = parseFloat(restriction['xs:minExclusive']['@_value']);
	}
	if (restriction['xs:maxExclusive']) {
		constraints.maxExclusive = parseFloat(restriction['xs:maxExclusive']['@_value']);
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
