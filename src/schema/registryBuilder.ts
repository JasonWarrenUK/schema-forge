/** |===================|| Schema Registry Builder ||===================|
 *  | Main orchestrator: transforms raw XSD parser output into a
 *  | queryable SchemaRegistry with full element trees and lookups.
 *  |===================================================================|
 */

import {
	parseXsd,
	extractNamespace,
	extractVersion,
	extractElements,
	extractNamedSimpleTypes,
} from './schemaParser';
import type {
	SchemaRegistry,
	SchemaRegistryOptions,
	SchemaElement,
} from '../types/interpreterTypes';
import { buildNamedTypesMap } from '../utils/schema/typeResolver';
import { buildElement, populateLookupMaps } from '../utils/schema/elementBuilder';

/**
 * Build a queryable SchemaRegistry from XSD content
 * @param xsdContent - Raw XSD file content as string
 * @param options - Optional configuration
 * @returns Complete SchemaRegistry with lookup maps
 */
export function buildSchemaRegistry(
	xsdContent: string,
	options?: SchemaRegistryOptions
): SchemaRegistry {
	const parsed = parseXsd(xsdContent);
	const namespace = extractNamespace(parsed);
	const schemaVersion = extractVersion(parsed);
	const rawElements = extractElements(parsed);
	const rawSimpleTypes = extractNamedSimpleTypes(parsed);

	const namedTypes = buildNamedTypesMap(rawSimpleTypes);

	if (rawElements.length === 0) {
		throw new Error('Invalid XSD: no root element found');
	} else if (rawElements.length > 1) {
		throw new Error('Multiple root elements not supported. XSD should have a single root element.');
	}

	const rootElement = buildElement(rawElements[0], '', namedTypes);

	const elementsByPath = new Map<string, SchemaElement>();
	const elementsByName = new Map<string, SchemaElement[]>();

	populateLookupMaps(rootElement, elementsByPath, elementsByName);

	return {
		namespace,
		schemaVersion,
		rootElement,
		elementsByPath,
		elementsByName,
		namedTypes,
	};
}
