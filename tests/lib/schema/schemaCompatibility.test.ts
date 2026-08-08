import { describe, it, expect } from 'vitest';
import {
      validateSchemaCompatibility,
      formatCompatibilityError,
} from '../../../src/schema/schemaCompatibility';
import type { MappingConfig } from '../../../src/types/schemaTypes';
import type { SchemaRegistry } from '../../../src/types/interpreterTypes';
import { FAM_PATHS } from '../../fixtures/lib/builderPaths';

describe('schema/schemaCompatibility', () => {
      const mockRegistry: SchemaRegistry = {
              namespace: 'ESFA/ILR/2025-26',
              schemaVersion: '1.0',
              sourceFile: 'schemafile25.xsd',
              rootElement: {
                      name: 'Message',
                      path: 'Message',
                      baseType: 'string',
                      constraints: {},
                      cardinality: { min: 1, max: 1 },
                      children: [],
                      isComplex: true,
              },
              elementsByPath: new Map([
                      ['Message.Learner.LearnRefNumber', {} as any],
                      ['Message.Learner.ULN', {} as any],
                      ['Message.Learner.LLDDHealthProb', {} as any],
                      ['Message.Learner.LLDDandHealthProblem.LLDDCat', {} as any],
                      ['Message.Learner.LLDDandHealthProblem.PrimaryLLDD', {} as any],
              ]),
              elementsByName: new Map(),
              namedTypes: new Map(),
      };

      const mockMapping: MappingConfig = {
              id: 'test-mapping',
              name: 'Test Mapping',
              mappingVersion: '1.0.0',
              targetSchema: {
                      namespace: 'ESFA/ILR/2025-26',
                      version: '1.0',
                      displayName: 'Test Schema',
              },
              mappings: [
                      {
                              csvColumn: 'LearnRef',
                              xsdPath: 'Message.Learner.LearnRefNumber',
                      },
              ],
      };

      describe('validateSchemaCompatibility', () => {
              it('should pass for compatible mapping and registry', () => {
                      const result = validateSchemaCompatibility(mockMapping, mockRegistry);

                      expect(result.compatible).toBe(true);
                      expect(result.errors).toHaveLength(0);
              });

              it('should fail for namespace mismatch', () => {
                      const incompatibleMapping = {
                              ...mockMapping,
                              targetSchema: {
                                      ...mockMapping.targetSchema,
                                      namespace: 'ESFA/ILR/2024-25',
                              },
                      };

                      const result = validateSchemaCompatibility(incompatibleMapping, mockRegistry);

                      expect(result.compatible).toBe(false);
                      expect(result.errors).toHaveLength(1);
                      expect(result.errors[0]).toContain('Namespace mismatch');
              });

              it('should warn for version mismatch', () => {
                      const versionMismatchMapping = {
                              ...mockMapping,
                              targetSchema: {
                                      ...mockMapping.targetSchema,
                                      version: '2.0',
                              },
                      };

                      const result = validateSchemaCompatibility(versionMismatchMapping, mockRegistry);

                      expect(result.compatible).toBe(true); // Just a warning
                      expect(result.warnings).toHaveLength(1);
                      expect(result.warnings[0]).toContain('Version mismatch');
              });

              it('should fail for invalid XSD path', () => {
                      const invalidPathMapping = {
                              ...mockMapping,
                              mappings: [
                                      {
                                              csvColumn: 'Invalid',
                                              xsdPath: 'Message.Learner.InvalidField',
                                      },
                              ],
                      };

                      const result = validateSchemaCompatibility(invalidPathMapping, mockRegistry);

                      expect(result.compatible).toBe(false);
                      expect(result.errors).toHaveLength(1);
                      expect(result.errors[0]).toContain('Invalid XSD path');
                      expect(result.errors[0]).toContain('InvalidField');
              });

              it('should handle multiple errors', () => {
                      const multiErrorMapping = {
                              ...mockMapping,
                              targetSchema: {
                                      ...mockMapping.targetSchema,
                                      namespace: 'WRONG',
                              },
                              mappings: [
                                      {
                                              csvColumn: 'Field1',
                                              xsdPath: 'Invalid.Path.One',
                                      },
                                      {
                                              csvColumn: 'Field2',
                                              xsdPath: 'Invalid.Path.Two',
                                      },
                              ],
                      };

                      const result = validateSchemaCompatibility(multiErrorMapping, mockRegistry);

                      expect(result.compatible).toBe(false);
                      expect(result.errors.length).toBeGreaterThan(2);
              });

              it('should validate additional paths when provided', () => {
                      const registryWithFamPaths: SchemaRegistry = {
                              ...mockRegistry,
                              elementsByPath: new Map([
                                      ...mockRegistry.elementsByPath,
                                      ['Message.Learner.LearningDelivery.LearningDeliveryFAM.LearnDelFAMType', {} as any],
                                      ['Message.Learner.LearningDelivery.LearningDeliveryFAM.LearnDelFAMCode', {} as any],
                                      ['Message.Learner.LearningDelivery.LearningDeliveryFAM.LearnDelFAMDateFrom', {} as any],
                                      ['Message.Learner.LearningDelivery.LearningDeliveryFAM.LearnDelFAMDateTo', {} as any],
                              ]),
                      };

                      const result = validateSchemaCompatibility(
                              mockMapping,
                              registryWithFamPaths,
                              [...FAM_PATHS]
                      );

                      expect(result.compatible).toBe(true);
                      expect(result.errors).toHaveLength(0);
              });

              it('should fail when additional paths are missing from registry', () => {
                      const result = validateSchemaCompatibility(
                              mockMapping,
                              mockRegistry,
                              [...FAM_PATHS]
                      );

                      expect(result.compatible).toBe(false);
                      expect(result.errors.some((e) => e.includes('LearnDelFAMType'))).toBe(true);
              });

              it('should pass when no additional paths provided', () => {
                      const result = validateSchemaCompatibility(mockMapping, mockRegistry);

                      expect(result.compatible).toBe(true);
                      expect(result.errors).toHaveLength(0);
              });
      });

      describe('formatCompatibilityError', () => {
              it('should format error message with all details', () => {
                      const incompatibleMapping = {
                              ...mockMapping,
                              targetSchema: {
                                      ...mockMapping.targetSchema,
                                      namespace: 'ESFA/ILR/2024-25',
                              },
                      };

                      const result = validateSchemaCompatibility(incompatibleMapping, mockRegistry);
                      const formatted = formatCompatibilityError(incompatibleMapping, mockRegistry, result);

                      expect(formatted).toContain('Mapping Incompatibility Error');
                      expect(formatted).toContain('Test Mapping');
                      expect(formatted).toContain('ESFA/ILR/2024-25');
                      expect(formatted).toContain('ESFA/ILR/2025-26');
                      expect(formatted).toContain('Namespace mismatch');
              });

              it('should include warnings in formatted output', () => {
                      const versionMismatchMapping = {
                              ...mockMapping,
                              targetSchema: {
                                      ...mockMapping.targetSchema,
                                      version: '2.0',
                              },
                      };

                      const result = validateSchemaCompatibility(versionMismatchMapping, mockRegistry);
                      const formatted = formatCompatibilityError(versionMismatchMapping, mockRegistry, result);

                      expect(formatted).toContain('Warnings:');
                      expect(formatted).toContain('Version mismatch');
              });
      });
});
