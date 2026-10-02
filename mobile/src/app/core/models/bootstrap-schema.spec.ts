import {
  BOOTSTRAP_SCHEMA_VERSION,
  BootstrapSchemaError,
  assertBootstrapSchema,
  bootstrapSchemaMatches,
} from './bootstrap-schema';

describe('bootstrap schema', () => {
  it('accepts the current version and a publication that predates the field', () => {
    expect(bootstrapSchemaMatches({ schemaVersion: BOOTSTRAP_SCHEMA_VERSION })).toBeTrue();
    expect(bootstrapSchemaMatches({})).toBeTrue();
    expect(bootstrapSchemaMatches({ schemaVersion: null })).toBeTrue();
  });

  it('rejects a different or unreadable version', () => {
    expect(bootstrapSchemaMatches({ schemaVersion: BOOTSTRAP_SCHEMA_VERSION + 1 })).toBeFalse();
    expect(bootstrapSchemaMatches({ schemaVersion: '1' })).toBeFalse();
    expect(bootstrapSchemaMatches(null)).toBeFalse();

    expect(() => assertBootstrapSchema({ schemaVersion: 2 })).toThrowError(BootstrapSchemaError);
    try {
      assertBootstrapSchema({ schemaVersion: 2 });
    } catch (error) {
      expect((error as BootstrapSchemaError).actual).toBe(2);
      expect((error as BootstrapSchemaError).message).toContain('schema 2');
    }
  });
});
