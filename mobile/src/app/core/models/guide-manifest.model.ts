export interface GuideAssetEntry {
  path: string;
  url: string;
  hash: string | null;
  bytes: number | null;
  missing?: boolean;
}

export interface GuideManifest {
  vesselId: string;
  vesselSlug: string;
  publicationVersion: number;
  contentHash: string;
  publishedAt: string;
  /** Null on publications assembled before the field existed (those are schema 1). */
  schemaVersion?: number | null;
  guide: {
    url: string;
    hash: string;
    bytes: number;
  };
  assets: GuideAssetEntry[];
}

export interface StoredGuideRecord {
  manifest: GuideManifest;
  contentHash: string;
  guide: unknown;
}
