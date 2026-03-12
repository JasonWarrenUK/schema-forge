/** |===================|| Schema Compatibility Validation ||==================|
 *  | Validates that a mapping configuration is compatible with a loaded schema
 *  |==========================================================================|
 */

import type { MappingConfig, SchemaReference } from '../types/schemaTypes';
import type { SchemaRegistry } from '../types/interpreterTypes';

export interface CompatibilityResult {
	compatible: boolean;
	errors: string[];
	warnings: string[];
}

/**
 * Check if a mapping config is compatible with a loaded schema registry
 *
 * @param mapping - Mapping configuration to validate
 * @param registry - Schema registry to check against
 * @param additionalPaths - Extra XSD paths to validate exist in registry (e.g. builder paths)
 */
export function validateSchemaCompatibility(
	mapping: MappingConfig,
	registry: SchemaRegistry,
	additionalPaths?: string[]
): CompatibilityResult {
	const errors: string[] = [];
	const warnings: string[] = [];

	const expected = mapping.targetSchema;
	const actual = {
		namespace: registry.namespace,
		schemaVersion: registry.schemaVersion,
		file: registry.sourceFile,
	};

	// Check namespace match (critical)
	if (expected.namespace !== actual.namespace) {
		errors.push(
			`Namespace mismatch: mapping expects "${expected.namespace}" but registry has "${actual.namespace}"`
		);
	}

	// Check version match (warning only - may work across minor versions)
	if (expected.version && actual.schemaVersion && expected.version !== actual.schemaVersion) {
		warnings.push(
			`Version mismatch: mapping expects v${expected.version} but registry has v${actual.schemaVersion}`
		);
	}

	// Validate all XSD paths exist in registry
	for (const columnMapping of mapping.mappings) {
		if (!registry.elementsByPath.has(columnMapping.xsdPath)) {
			errors.push(
				`Invalid XSD path "${columnMapping.xsdPath}" for column "${columnMapping.csvColumn}"`
			);
		}
	}

	// Validate additional paths (e.g. builder paths for domain-specific features)
	for (const path of additionalPaths ?? []) {
		if (!registry.elementsByPath.has(path)) {
			errors.push(`Path not found in schema: ${path}`);
		}
	}

	return {
		compatible: errors.length === 0,
		errors,
		warnings,
	};
}

/**
 * Format compatibility result for display
 */
export function formatCompatibilityError(
	mapping: MappingConfig,
	registry: SchemaRegistry,
	result: CompatibilityResult
): string {
	const lines: string[] = ['❌ Mapping Incompatibility Error\n'];

	lines.push(`Mapping: ${mapping.name} (${mapping.id})`);
	lines.push(`  Expects: ${mapping.targetSchema.displayName || mapping.targetSchema.namespace}`);
	if (mapping.targetSchema.version) {
		lines.push(`  Version: ${mapping.targetSchema.version}`);
	}
	lines.push('');

	lines.push('Currently Loaded:');
	lines.push(`  Namespace: ${registry.namespace}`);
	if (registry.schemaVersion) {
		lines.push(`  Version: ${registry.schemaVersion}`);
	}
	if (registry.sourceFile) {
		lines.push(`  File: ${registry.sourceFile}`);
	}
	lines.push('');

	if (result.errors.length > 0) {
		lines.push('Errors:');
		for (const err of result.errors) lines.push(`  • ${err}`);
		lines.push('');
	}

	if (result.warnings.length > 0) {
		lines.push('Warnings:');
		for (const warn of result.warnings) lines.push(`  ⚠ ${warn}`);
		lines.push('');
	}

	return lines.join('\n');
}
