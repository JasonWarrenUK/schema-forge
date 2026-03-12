/** |===================|| Human-Friendly Name ||==================|
 *  | Explanation
 *  |==============================================================|
 */

/** ====== Schema Module ======
 * XSD-driven schema system for dynamic validation and generation.
 * Exports types, utilities, and (eventually) parser/registry/validator.
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
} from '../types/interpreterTypes';

// === Type Utilities ===
export {
	isRequired,
	isRepeatable,
	isOptional,
	DEFAULT_CARDINALITY,
	EMPTY_CONSTRAINTS,
} from '../types/interpreterTypes';

// === Validation Types ===
export type {
	SchemaValidationSeverity,
	ConstraintViolationType,
	SchemaValidationIssue,
	SchemaValidationResult,
} from '../types/schemaTypes';

// === Validation Utilities ===
export { createIssue, createEmptyResult, computeResultStats } from '../types/schemaTypes';

// === XSD Parser ===
export {
	parseXsd,
	extractNamespace,
	extractElements,
	extractNamedSimpleTypes,
	extractNamedComplexTypes,
	type RawXsdElement,
	type RawXsdSimpleType,
	type RawXsdComplexType,
	type ParsedXsdRoot,
} from './schemaParser';
