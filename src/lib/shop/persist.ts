/**
 * Durable catalog writes — shared by admin save/upload and tests.
 *
 * Production must persist to Postgres (and Vercel Blob when configured), never
 * to the serverless filesystem. Seed accessories stay in migrations; admin
 * creates/edits are upserts on `products`.
 */
import { isBlockedCatalogItem, slugFromName } from "./catalog.ts";

export type ProductWriteInput = {
  id: string;
  name: string;
  fullName: string;
  tag: string;
  description: string;
  priceCents: number;
  weightLb: number;
  imageUrl: string;
  stock: number;
  active?: boolean;
  sortOrder?: number;
};

export type ProductWrite = {
  id: string;
  name: string;
  fullName: string;
  tag: string;
  description: string;
  priceCents: number;
  weightLb: number;
  imageUrl: string;
  stock: number;
  active: boolean;
  sortOrder: number;
};

export function normalizeProductWrite(input: ProductWriteInput): ProductWrite {
  const id = (input.id.trim() || slugFromName(input.name))
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "");
  const name = input.name.trim();
  return {
    id,
    name,
    fullName: input.fullName.trim() || name,
    tag: input.tag.trim(),
    description: input.description.trim(),
    priceCents: Math.round(Number(input.priceCents) || 0),
    weightLb: Number(input.weightLb) || 0.5,
    imageUrl: input.imageUrl.trim(),
    stock: Math.max(0, Math.round(Number(input.stock) || 0)),
    active: input.active !== false,
    sortOrder: Number.isFinite(Number(input.sortOrder)) ? Number(input.sortOrder) : 99,
  };
}

export function assertWritableCatalogItem(item: ProductWrite): void {
  if (!item.id) throw new Error("Product id required");
  if (!item.name) throw new Error("Product name required");
  if (
    isBlockedCatalogItem({
      id: item.id,
      name: item.name,
      fullName: item.fullName,
      description: item.description,
      tag: item.tag,
    })
  ) {
    throw new Error(
      "This shop only lists gaming accessories — DMA / firmware hardware is not allowed.",
    );
  }
}

/** Public URL for an uploaded photo. Prefer Blob CDN; always keep a Postgres copy. */
export function productPhotoPublicUrl(opts: {
  blobUrl?: string | null;
  photoId: string;
}): string {
  const blob = opts.blobUrl?.trim();
  if (blob) return blob;
  return `/api/product-image/${opts.photoId}`;
}
