/**
 * Published guide contract generation.
 * Keep this equal to BOOTSTRAP_SCHEMA_VERSION in backend/guide_bootstrap.py.
 * Bump both when the bootstrap JSON shape changes in a way this shell cannot read.
 *
 * Guides assembled before the field existed omit schemaVersion. Those payloads
 * are schema 1, the shape this constant started at. A later shell that expects
 * schema 2 must still treat a missing field as 1 and refuse it.
 */
export const BOOTSTRAP_SCHEMA_VERSION = 1;

export class BootstrapSchemaError extends Error {
  readonly failure = 'schema' as const;

  constructor(
    readonly actual: number | null,
    readonly expected: number = BOOTSTRAP_SCHEMA_VERSION,
  ) {
    super(schemaMismatchMessage(actual, expected));
    this.name = 'BootstrapSchemaError';
  }
}

export function schemaMismatchMessage(actual: number | null, expected: number): string {
  const seen = actual == null ? 'an unrecognized schema' : `schema ${actual}`;
  return `This guide uses ${seen}. This app reads schema ${expected}. Update the app, then open the guide again.`;
}

/** Integer schemaVersion on the payload, or null when the field is missing or not a version. */
export function declaredBootstrapSchemaVersion(content: unknown): number | null {
  if (!content || typeof content !== 'object') {
    return null;
  }
  const raw = (content as { schemaVersion?: unknown }).schemaVersion;
  if (typeof raw === 'number' && Number.isInteger(raw) && raw >= 1) {
    return raw;
  }
  return null;
}

/**
 * True when this shell can render the payload.
 * A missing schemaVersion matches only while the shell still expects schema 1.
 */
export function bootstrapSchemaMatches(content: unknown): boolean {
  if (!content || typeof content !== 'object') {
    return false;
  }
  const raw = (content as { schemaVersion?: unknown }).schemaVersion;
  if (raw == null) {
    return BOOTSTRAP_SCHEMA_VERSION === 1;
  }
  return raw === BOOTSTRAP_SCHEMA_VERSION;
}

export function assertBootstrapSchema(content: unknown): void {
  if (!bootstrapSchemaMatches(content)) {
    throw new BootstrapSchemaError(declaredBootstrapSchemaVersion(content));
  }
}
