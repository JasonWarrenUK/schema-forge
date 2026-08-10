/** |===================|| Schema Validator ||==================|
 *  | Validates values against SchemaElement constraints.
 *  | Provides detailed validation issues for each constraint type.
 *  |=============================================================|
 */

import type { SchemaElement, SchemaConstraints, XsdBaseType } from '../types/interpreterTypes';
import { isRequired } from '../types/interpreterTypes';
import type { SchemaValidationIssue } from '../types/schemaTypes';
import { createIssue } from '../types/schemaTypes';

/* <<--------------------------------------------------------------------->> */

interface ValidateValueOptions {
	rowIndex?: number;
	sourceField?: string;
}

/**
 * xs:decimal lexical space: an optional sign then digits with an optional
 * fractional part. Exponent notation belongs to xs:double, not xs:decimal.
 */
const DECIMAL_LEXICAL = /^[+-]?(\d+(\.\d*)?|\.\d+)$/;

const NUMERIC_TYPES = new Set<XsdBaseType>(['int', 'integer', 'long', 'decimal']);

/** Whether the schema declares this element as numeric, regardless of how the caller passed the value. */
function isNumericType(baseType: XsdBaseType): boolean {
	return NUMERIC_TYPES.has(baseType);
}

/**
 * ISO 8601 dateTime. Captures the date parts so the calendar can be checked
 * separately; 24:00:00 is legal in XSD and permitted here.
 */
const DATETIME_LEXICAL =
	/^(\d{4})-(\d{2})-(\d{2})T(?:([01]\d|2[0-3]):([0-5]\d):([0-5]\d)(?:\.\d+)?|24:00:00(?:\.0+)?)(Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)?$/;

/**
 * True when the parts describe a day that actually exists.
 *
 * A shape check alone is not enough: Date.parse rolls 2024-02-31 forward to
 * 2 March rather than rejecting it, so impossible dates validated. Building
 * the date and requiring every component to survive the round trip catches
 * day-of-month overflow, which is the likelier data-entry error.
 */
function isRealCalendarDate(year: string, month: string, day: string): boolean {
	const y = Number(year);
	const m = Number(month);
	const d = Number(day);

	if (m < 1 || m > 12 || d < 1 || d > 31) return false;

	const date = new Date(Date.UTC(y, m - 1, d));

	return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

/* <<--------------------------------------------------------------------->> */

/**
 * Validate a value against a schema element's constraints
 * @param value - The value to validate (can be undefined/null for presence check)
 * @param element - The schema element defining constraints
 * @param options - Optional context (row index, source field name)
 * @returns Array of validation issues (empty if valid)
 */
export function validateValue(
	value: unknown,
	element: SchemaElement,
	options: ValidateValueOptions = {}
): SchemaValidationIssue[] {
	const issues: SchemaValidationIssue[] = [];
	const { rowIndex, sourceField } = options;

	// Trim strings to detect whitespace-only values as empty
	const trimmedValue = typeof value === 'string' ? value.trim() : value;

	// Check for required value
	if (trimmedValue === undefined || trimmedValue === null || trimmedValue === '') {
		if (isRequired(element)) {
			issues.push(
				createIssue('required', element.path, `Required field "${element.name}" is missing`, {
					rowIndex,
					sourceField,
					element,
				})
			);
		}
		// No further validation needed for missing optional values
		return issues;
	}

	// Validate type
	const typeIssue = validateType(trimmedValue, element.baseType, element, options);
	if (typeIssue) {
		issues.push(typeIssue);
		// If type is wrong, skip constraint validation
		return issues;
	}

	// Apply constraint validators
	const constraints = element.constraints;

	// Which facets apply is a property of the schema, not of how the caller
	// happened to represent the value. Branching on `typeof` meant range facets
	// never ran for CSV data, which is always strings, unless a mapping
	// configured a numeric transform.
	if (isNumericType(element.baseType)) {
		const numericValue = typeof trimmedValue === 'number' ? trimmedValue : Number(trimmedValue);

		// validateType has already run, so a non-finite value here would mean an
		// unvalidated code path rather than bad user input.
		if (Number.isFinite(numericValue)) {
			issues.push(...validateRange(numericValue, constraints, element, options));
		}

		// Digit facets count the written form, so they are checked against the
		// lexical value rather than the parsed number: 1.2300 has two significant
		// fraction digits, not four.
		issues.push(
			...validateDigits(
				typeof trimmedValue === 'string' ? trimmedValue : String(trimmedValue),
				constraints,
				element,
				options
			)
		);
	} else {
		const stringValue = typeof trimmedValue === 'string' ? trimmedValue : String(trimmedValue);

		if (constraints.pattern) {
			const patternIssue = validatePattern(stringValue, constraints.pattern, element, options);
			if (patternIssue) issues.push(patternIssue);
		}

		issues.push(...validateLength(stringValue, constraints, element, options));

		if (constraints.enumeration) {
			const enumIssue = validateEnumeration(stringValue, constraints.enumeration, element, options);
			if (enumIssue) issues.push(enumIssue);
		}
	}

	return issues;
}

/* <<--------------------------------------------------------------------->> */

/**
 * Validate value matches expected base type
 */
function validateType(
	value: unknown,
	baseType: XsdBaseType,
	element: SchemaElement,
	options: ValidateValueOptions
): SchemaValidationIssue | null {
	const { rowIndex, sourceField } = options;

	switch (baseType) {
		case 'string':
			// Accept any value as string (will be coerced)
			return null;

		case 'int':
		case 'integer':
		case 'long':
			if (typeof value === 'number') {
				if (!Number.isInteger(value)) {
					return createIssue(
						'type',
						element.path,
						`Field "${element.name}" must be an integer, got decimal ${value}`,
						{ rowIndex, sourceField, element, actualValue: value }
					);
				}
				return null;
			}
			if (typeof value === 'string') {
				const parsed = parseInt(value, 10);
				if (isNaN(parsed) || parsed.toString() !== value.trim()) {
					return createIssue(
						'type',
						element.path,
						`Field "${element.name}" must be an integer, got "${value}"`,
						{ rowIndex, sourceField, element, actualValue: value }
					);
				}
				return null;
			}
			return createIssue('type', element.path, `Field "${element.name}" must be an integer`, {
				rowIndex,
				sourceField,
				element,
				actualValue: value,
			});

		case 'decimal':
			if (typeof value === 'number') {
				if (!Number.isFinite(value)) {
					return createIssue(
						'type',
						element.path,
						`Field "${element.name}" must be a decimal number, got ${value}`,
						{ rowIndex, sourceField, element, actualValue: value }
					);
				}
				return null;
			}
			if (typeof value === 'string') {
				// Checked lexically rather than with parseFloat, which stops at the
				// first invalid character and so accepted "12abc" and "Infinity".
				// Exponent notation is deliberately rejected: it is valid xs:double
				// but not xs:decimal.
				if (!DECIMAL_LEXICAL.test(value.trim())) {
					return createIssue(
						'type',
						element.path,
						`Field "${element.name}" must be a decimal number, got "${value}"`,
						{ rowIndex, sourceField, element, actualValue: value }
					);
				}
				return null;
			}
			return createIssue('type', element.path, `Field "${element.name}" must be a decimal number`, {
				rowIndex,
				sourceField,
				element,
				actualValue: value,
			});

		case 'boolean':
			if (typeof value === 'boolean') return null;
			if (typeof value === 'string') {
				const lower = value.toLowerCase();
				if (['true', 'false', '1', '0'].includes(lower)) return null;
			}
			return createIssue(
				'type',
				element.path,
				`Field "${element.name}" must be a boolean, got "${value}"`,
				{ rowIndex, sourceField, element, actualValue: value }
			);

		case 'date':
			if (typeof value === 'string') {
				const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
				if (match && isRealCalendarDate(match[1], match[2], match[3])) return null;
			}
			return createIssue(
				'type',
				element.path,
				`Field "${element.name}" must be a date (YYYY-MM-DD), got "${value}"`,
				{ rowIndex, sourceField, element, actualValue: value }
			);

		case 'dateTime':
			if (typeof value === 'string') {
				// Date.parse alone accepted "Dec 25 2024" and "3/4/2024"; the latter
				// resolves by US month-first convention, so a UK date silently became
				// a different day. Require ISO 8601 shape, then check the calendar.
				const match = DATETIME_LEXICAL.exec(value);
				if (match && isRealCalendarDate(match[1], match[2], match[3])) return null;
			}
			return createIssue(
				'type',
				element.path,
				`Field "${element.name}" must be an ISO 8601 dateTime, got "${value}"`,
				{ rowIndex, sourceField, element, actualValue: value }
			);

		default:
			return null;
	}
}

/* <<--------------------------------------------------------------------->> */

/**
 * Validate string matches pattern constraint
 */
function validatePattern(
	value: string,
	pattern: string,
	element: SchemaElement,
	options: ValidateValueOptions
): SchemaValidationIssue | null {
	const { rowIndex, sourceField } = options;

	let regex: RegExp;

	try {
		// XSD patterns are implicitly anchored to the whole value. The group is
		// required: bare `^...$` binds tighter than top-level alternation, so a
		// facet of "M|F" would compile to (^M)|(F$) and accept "MALE".
		regex = new RegExp(`^(?:${pattern})$`);
	} catch {
		// XSD's regex grammar is not a subset of JavaScript's: character-class
		// subtraction and \p{IsBasicLatin} are legal XSD and throw here. Silently
		// returning null read as "valid", so the constraint vanished with no
		// diagnostic. Report it instead, as a warning rather than an error: the
		// value may well be fine, we just cannot tell.
		return createIssue(
			'pattern',
			element.path,
			`Pattern "${pattern}" on field "${element.name}" could not be compiled, so it was not checked`,
			{
				severity: 'warning',
				rowIndex,
				sourceField,
				element,
				actualValue: value,
				constraint: { pattern },
			}
		);
	}

	if (!regex.test(value)) {
		return createIssue(
			'pattern',
			element.path,
			`Field "${element.name}" value "${value}" does not match pattern "${pattern}"`,
			{
				rowIndex,
				sourceField,
				element,
				actualValue: value,
				constraint: { pattern },
			}
		);
	}

	return null;
}

/* <<--------------------------------------------------------------------->> */

/**
 * Validate string length constraints
 */
/**
 * Validates xs:totalDigits and xs:fractionDigits.
 *
 * Both count the lexical form, so the check works on the written string and
 * not the parsed number. Leading zeros in the integer part and trailing zeros
 * in the fraction are not significant, so "0012.3400" is four total digits.
 */
function validateDigits(
	value: string,
	constraints: SchemaConstraints,
	element: SchemaElement,
	options: ValidateValueOptions
): SchemaValidationIssue[] {
	const { rowIndex, sourceField } = options;
	const issues: SchemaValidationIssue[] = [];

	if (constraints.totalDigits === undefined && constraints.fractionDigits === undefined) {
		return issues;
	}

	// Only meaningful for values that are lexically decimal; validateType has
	// already reported anything that is not.
	if (!DECIMAL_LEXICAL.test(value.trim())) return issues;

	const unsigned = value.trim().replace(/^[+-]/, '');
	const [integerPart = '', fractionPart = ''] = unsigned.split('.');

	const significantInteger = integerPart.replace(/^0+/, '');
	const significantFraction = fractionPart.replace(/0+$/, '');

	const fractionDigits = significantFraction.length;
	const totalDigits = significantInteger.length + fractionDigits;

	if (constraints.totalDigits !== undefined && totalDigits > constraints.totalDigits) {
		issues.push(
			createIssue(
				'totalDigits',
				element.path,
				`Field "${element.name}" must have at most ${constraints.totalDigits} digits, got ${totalDigits}`,
				{
					rowIndex,
					sourceField,
					element,
					actualValue: value,
					constraint: { totalDigits: constraints.totalDigits },
				}
			)
		);
	}

	if (constraints.fractionDigits !== undefined && fractionDigits > constraints.fractionDigits) {
		issues.push(
			createIssue(
				'fractionDigits',
				element.path,
				`Field "${element.name}" must have at most ${constraints.fractionDigits} decimal places, got ${fractionDigits}`,
				{
					rowIndex,
					sourceField,
					element,
					actualValue: value,
					constraint: { fractionDigits: constraints.fractionDigits },
				}
			)
		);
	}

	return issues;
}

function validateLength(
	value: string,
	constraints: SchemaConstraints,
	element: SchemaElement,
	options: ValidateValueOptions
): SchemaValidationIssue[] {
	const { rowIndex, sourceField } = options;
	const issues: SchemaValidationIssue[] = [];

	// XSD counts characters; String.length counts UTF-16 code units, so any
	// value outside the BMP was measured at roughly double its real length.
	const length = [...value].length;

	if (constraints.length !== undefined && length !== constraints.length) {
		issues.push(
			createIssue(
				'length',
				element.path,
				`Field "${element.name}" must be exactly ${constraints.length} characters, got ${length}`,
				{
					rowIndex,
					sourceField,
					element,
					actualValue: value,
					constraint: { length: constraints.length },
				}
			)
		);
	}

	if (constraints.minLength !== undefined && length < constraints.minLength) {
		issues.push(
			createIssue(
				'minLength',
				element.path,
				`Field "${element.name}" must be at least ${constraints.minLength} characters, got ${length}`,
				{
					rowIndex,
					sourceField,
					element,
					actualValue: value,
					constraint: { minLength: constraints.minLength },
				}
			)
		);
	}

	if (constraints.maxLength !== undefined && length > constraints.maxLength) {
		issues.push(
			createIssue(
				'maxLength',
				element.path,
				`Field "${element.name}" must be at most ${constraints.maxLength} characters, got ${length}`,
				{
					rowIndex,
					sourceField,
					element,
					actualValue: value,
					constraint: { maxLength: constraints.maxLength },
				}
			)
		);
	}

	return issues;
}

/* <<--------------------------------------------------------------------->> */

/**
 * Validate numeric range constraints
 */
function validateRange(
	value: number,
	constraints: SchemaConstraints,
	element: SchemaElement,
	options: ValidateValueOptions
): SchemaValidationIssue[] {
	const { rowIndex, sourceField } = options;
	const issues: SchemaValidationIssue[] = [];

	if (constraints.minInclusive !== undefined && value < constraints.minInclusive) {
		issues.push(
			createIssue(
				'minInclusive',
				element.path,
				`Field "${element.name}" must be at least ${constraints.minInclusive}, got ${value}`,
				{
					rowIndex,
					sourceField,
					element,
					actualValue: value,
					constraint: { minInclusive: constraints.minInclusive },
				}
			)
		);
	}

	if (constraints.maxInclusive !== undefined && value > constraints.maxInclusive) {
		issues.push(
			createIssue(
				'maxInclusive',
				element.path,
				`Field "${element.name}" must be at most ${constraints.maxInclusive}, got ${value}`,
				{
					rowIndex,
					sourceField,
					element,
					actualValue: value,
					constraint: { maxInclusive: constraints.maxInclusive },
				}
			)
		);
	}

	if (constraints.minExclusive !== undefined && value <= constraints.minExclusive) {
		issues.push(
			createIssue(
				'minExclusive',
				element.path,
				`Field "${element.name}" must be greater than ${constraints.minExclusive}, got ${value}`,
				{
					rowIndex,
					sourceField,
					element,
					actualValue: value,
					constraint: { minExclusive: constraints.minExclusive },
				}
			)
		);
	}

	if (constraints.maxExclusive !== undefined && value >= constraints.maxExclusive) {
		issues.push(
			createIssue(
				'maxExclusive',
				element.path,
				`Field "${element.name}" must be less than ${constraints.maxExclusive}, got ${value}`,
				{
					rowIndex,
					sourceField,
					element,
					actualValue: value,
					constraint: { maxExclusive: constraints.maxExclusive },
				}
			)
		);
	}

	return issues;
}

/* <<--------------------------------------------------------------------->> */

/**
 * Validate value is in enumeration list
 */
function validateEnumeration(
	value: string,
	enumeration: string[],
	element: SchemaElement,
	options: ValidateValueOptions
): SchemaValidationIssue | null {
	const { rowIndex, sourceField } = options;

	if (!enumeration.includes(value)) {
		return createIssue(
			'enumeration',
			element.path,
			`Field "${element.name}" value "${value}" is not in allowed values: ${enumeration.join(', ')}`,
			{
				rowIndex,
				sourceField,
				element,
				actualValue: value,
				constraint: { enumeration },
			}
		);
	}

	return null;
}
