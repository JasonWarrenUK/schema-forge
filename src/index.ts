/** |===================|| schema-forge ||==================|
 *  | XSD-driven schema system for dynamic validation, XML
 *  | generation and CSV-to-schema mapping.
 *  |
 *  | Public API. Everything a consumer needs is exported here;
 *  | deep imports into src/ are not a supported interface.
 *  |=======================================================|
 */

// === Core Types ===
export type {
	Cardinality,
	XsdBaseType,
	SchemaConstraints,
	SchemaElement,
	NamedSimpleType,
	SchemaRegistry,
	SchemaRegistryOptions,
	ElementLookupResult,
} from './types/interpreterTypes';

export {
	isRequired,
	isRepeatable,
	isOptional,
	isEffectivelyRequired,
	DEFAULT_CARDINALITY,
	EMPTY_CONSTRAINTS,
} from './types/interpreterTypes';

// === Validation & Mapping Types ===
export type {
	SchemaValidationSeverity,
	ConstraintViolationType,
	SchemaValidationIssue,
	SchemaValidationResult,
	ColumnMapping,
	SchemaReference,
	MappingConfig,
} from './types/schemaTypes';

export { createIssue, createEmptyResult, computeResultStats } from './types/schemaTypes';

// === XSD Parsing ===
export type {
	RawXsdElement,
	RawXsdSimpleType,
	RawXsdComplexType,
	RawXsdOccurs,
	RawXsdParticleChildren,
	RawXsdSequence,
	RawXsdChoice,
	RawXsdAll,
	RawXsdGroup,
	ParsedXsdRoot,
} from './schema/schemaParser';

export {
	parseXsd,
	extractNamespace,
	extractVersion,
	extractElements,
	extractNamedSimpleTypes,
	extractNamedComplexTypes,
} from './schema/schemaParser';

// === Registry ===
export { buildSchemaRegistry } from './schema/registryBuilder';

// === Value Validation ===
export { validateValue } from './schema/schemaValidator';

// === Schema Compatibility ===
export type { CompatibilityResult } from './schema/schemaCompatibility';
export { validateSchemaCompatibility, formatCompatibilityError } from './schema/schemaCompatibility';

// === Column Mapping ===
export { mapCsvToSchema } from './schema/columnMapper';

// === Transforms ===
export type { TransformMetadata } from './transforms/registry';
export {
	TRANSFORMS,
	getTransform,
	getTransformsByCategory,
	getTransformMetadata,
} from './transforms/registry';

// === CSV ===
export type { CSVRow, CSVData } from './utils/csv/csvParser';
export { parseCSV, parseCSVContent } from './utils/csv/csvParser';

export type { ValidationSeverity, ValidationIssue, ValidationResult } from './utils/csv/csvValidator';
export { validateRows } from './utils/csv/csvValidator';

// === XML Generation ===
export type {
	GeneratorOptions,
	GeneratorResult,
	GeneratorWarning,
} from './utils/xml/xmlGenerator';
export { generateFromSchema } from './utils/xml/xmlGenerator';

// === Schema Construction Utilities ===
// Lower-level pieces that buildSchemaRegistry composes. Exported so the
// registry can be assembled by hand where the default pipeline does not fit.
export { parseCardinality } from './utils/schema/cardinality';
export { extractConstraints } from './utils/schema/constraints';
export { buildElement, populateLookupMaps } from './utils/schema/elementBuilder';
export { resolveBaseType, buildNamedTypesMap } from './utils/schema/typeResolver';
