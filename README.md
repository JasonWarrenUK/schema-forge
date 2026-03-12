# schema-forge

An XSD-driven schema system for dynamic validation, XML generation, and CSV-to-schema mapping. Built with TypeScript for the Bun runtime.

## Overview

schema-forge parses XSD (XML Schema Definition) files into queryable registries, then uses those registries to validate data, map CSV rows to nested schema objects, and generate valid XML output.

### Core capabilities

- **XSD parsing** — Transforms XSD files into `SchemaRegistry` objects with element trees and lookup maps
- **Data validation** — Validates values against XSD-defined constraints (types, patterns, cardinality, ranges, enumerations)
- **CSV-to-schema mapping** — Maps flat CSV columns to nested XSD paths with optional transformations
- **XML generation** — Produces valid XML from data objects using the schema structure and namespace information
- **Schema compatibility checking** — Verifies that mapping configurations are compatible with loaded schemas
- **Built-in transforms** — 17+ transformation functions for data normalization (type conversions, string formatting, date handling)

## Project structure

```
src/
├── schema/
│   ├── index.ts                 # Module exports
│   ├── schemaParser.ts          # XSD parsing (fast-xml-parser)
│   ├── registryBuilder.ts       # Builds SchemaRegistry from parsed XSD
│   ├── schemaValidator.ts       # Value validation against constraints
│   ├── columnMapper.ts          # CSV row → nested schema object mapping
│   └── schemaCompatibility.ts   # Mapping-to-schema compatibility checks
├── types/
│   ├── interpreterTypes.ts      # Core types: SchemaElement, SchemaRegistry, Cardinality
│   └── schemaTypes.ts           # Validation types: issues, results, mapping configs
├── transforms/
│   └── registry.ts              # 17 built-in transformation functions
└── utils/
    ├── csv/
    │   ├── csvParser.ts         # Header-based CSV parsing (papaparse)
    │   └── csvValidator.ts      # CSV validation against schema
    ├── schema/
    │   ├── elementBuilder.ts    # Recursive SchemaElement tree construction
    │   ├── typeResolver.ts      # XSD type reference resolution
    │   ├── constraints.ts       # XSD restriction facet extraction
    │   └── cardinality.ts       # minOccurs/maxOccurs parsing
    └── xml/
        └── xmlGenerator.ts      # Schema-driven XML generation
```

## Usage

### Parse an XSD and build a registry

```ts
import { parseXsd } from "./src/schema";
import { buildSchemaRegistry } from "./src/schema/registryBuilder";

const registry = await buildSchemaRegistry(xsdContent);
```

### Validate CSV data against a schema

```ts
import { parseCSVContent } from "./src/utils/csv/csvParser";
import { validateRows } from "./src/utils/csv/csvValidator";

const { headers, rows } = parseCSVContent(csvString);
const result = validateRows(rows, headers, registry, mappingConfig);
```

### Map CSV rows to schema objects

```ts
import { mapCsvToSchema } from "./src/schema/columnMapper";

const nestedObject = mapCsvToSchema(csvRow, mappings, registry);
```

### Generate XML from data

```ts
import { generateFromSchema } from "./src/utils/xml/xmlGenerator";

const { xml, warnings } = generateFromSchema(data, registry);
```

## Supported XSD features

| Feature | Details |
|---|---|
| Base types | `string`, `int`, `integer`, `long`, `decimal`, `date`, `dateTime`, `boolean` |
| Constraints | `pattern`, `minLength`, `maxLength`, `minInclusive`, `maxInclusive`, `minExclusive`, `maxExclusive`, `totalDigits`, `fractionDigits`, `enumeration` |
| Complex types | `xs:sequence` with nested elements |
| Cardinality | `minOccurs`, `maxOccurs` (including `unbounded`) |
| Named types | Simple type reuse and inheritance |
| Namespaces | `targetNamespace` extraction and preservation |

## Built-in transforms

**Type conversions:** `stringToInt`, `stringToFloat`, `stringToBoolean`, `boolToInt`, `constant(value)`

**String:** `trim`, `uppercase`, `lowercase`, `uppercaseTrim`, `uppercaseNoSpaces`, `postcode`, `removeSpaces`, `digitsOnly`, `normalizeAddress`

**Date/time:** `isoDate`, `isoDateTime`

**Conditional:** `nullIfEmpty`

## Dependencies

- [fast-xml-parser](https://github.com/NaturalIntelligence/fast-xml-parser) — XSD/XML parsing
- [papaparse](https://www.papaparse.com/) — CSV parsing
