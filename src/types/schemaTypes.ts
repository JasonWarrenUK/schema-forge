/** |===================|| Schema Validation Types ||==================|
 *  | Types for validation results when validating data against a
 *  | schema. These are separate from the existing validator types to
 *  | provide richer context about schema-specific validation failures.
 *  |==================================================================|
 */

import type { SchemaConstraints, SchemaElement } from './interpreterTypes';

export type SchemaValidationSeverity = 'error' | 'warning' | 'info';

export type ConstraintViolationType =
	| 'required' // minOccurs >= 1 but element missing
	| 'pattern' // value doesn't match regex pattern
	| 'minLength' // string too short
	| 'maxLength' // string too long
	| 'minInclusive' // number below minimum
	| 'maxInclusive' // number above maximum
	| 'minExclusive' // number at or below minimum
	| 'maxExclusive' // number at or above maximum
	| 'enumeration' // value not in allowed set
	| 'type' // value doesn't match base type (e.g., "abc" for int)
	| 'cardinality' // wrong number of occurrences
	| 'unexpected' // element not defined in schema
	| 'ordering'; // elements in wrong order (xs:sequence violation)

// |------------------------|| xxx ||-------------------------|

export interface SchemaValidationIssue {
	severity: SchemaValidationSeverity;
	type: ConstraintViolationType;
	message: string;
	code: string;
	elementPath: string;
	dataPath?: string;
	actualValue?: unknown;
	constraint?: Partial<SchemaConstraints>;
	element?: SchemaElement;
	rowIndex?: number;
	sourceField?: string;
}

export interface SchemaValidationResult {
	valid: boolean;
	issues: SchemaValidationIssue[];
	errorCount: number;
	warningCount: number;
	infoCount: number;
	schemaNamespace: string;
	schemaVersion?: string;
	duration?: number;
	validatedPaths?: string[];
}

// |------------------------|| xxx ||-------------------------|

// TODO: Extract `function createIssue()` to util
export function createIssue(
	type: ConstraintViolationType,
	elementPath: string,
	message: string,
	options: Partial<Omit<SchemaValidationIssue, 'type' | 'elementPath' | 'message'>> = {}
): SchemaValidationIssue {
	return {
		severity: options.severity ?? 'error',
		type,
		elementPath,
		message,
		code: options.code ?? `SCHEMA_${type.toUpperCase()}`,
		...options,
	};
}

// TODO: Extract `function createEmptyResult()` to util
export function createEmptyResult(
	schemaNamespace: string,
	schemaVersion?: string
): SchemaValidationResult {
	return {
		valid: true,
		issues: [],
		errorCount: 0,
		warningCount: 0,
		infoCount: 0,
		schemaNamespace,
		schemaVersion,
	};
}

// |------------------------|| xxx ||-------------------------|

// TODO: Extract `function computeResultStats()` to util
export function computeResultStats(
	issues: SchemaValidationIssue[],
	schemaNamespace: string,
	schemaVersion?: string
): SchemaValidationResult {
	const errorCount = issues.filter((i) => i.severity === 'error').length;
	const warningCount = issues.filter((i) => i.severity === 'warning').length;
	const infoCount = issues.filter((i) => i.severity === 'info').length;

	return {
		valid: errorCount === 0,
		issues,
		errorCount,
		warningCount,
		infoCount,
		schemaNamespace,
		schemaVersion,
	};
}

// |------------------------|| CSV -> XML Mapping ||-------------------------|
/** Maps a CSV column to an XSD path in the schema registry */
export interface ColumnMapping {
	/** CSV column header (case-insensitive match) */
	csvColumn: string;
	/** XSD path in dot notation (e.g., "Root.Parent.Field") */
	xsdPath: string;
	/** Optional transformation function applied before validation */
	transform?: string;
	/** Group identifier for repeating-group partitioning */
	group?: number;
}

/** Schema reference for mapping compatibility validation */
export interface SchemaReference {
	/** Expected namespace */
	namespace: string;
	/** Expected XSD version attribute */
	version?: string;
	/** Human-readable schema identifier */
	displayName?: string;
}

/** Complete mapping configuration for CSV→schema conversion */
export interface MappingConfig {
	/** Unique identifier for this mapping */
	id: string;
	/** Human-readable name */
	name: string;
	/** Mapping content version (semver) */
	mappingVersion: string;
	/** Target schema reference */
	targetSchema: SchemaReference;
	/** Column mappings */
	mappings: ColumnMapping[];
}
