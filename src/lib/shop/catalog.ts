export type CatalogLike = {
  id?: string;
  name?: string;
  fullName?: string;
  description?: string;
  tag?: string;
};

const BLOCKED =
  /\b(dma(\s|-)?card|\bdma\b|xc7a100t|100t\s*fpga|\bbo7\b|bo&|cheat[\s-]?hardware|artix-7|fpga\s+programmer|custom firmware)\b/i;

export function isBlockedCatalogItem(item: CatalogLike): boolean {
  const id = item.id ?? "";
  const name = item.name ?? "";
  if (/dma/i.test(id) || /dma/i.test(name)) return true;
  const hay = [id, name, item.fullName, item.description, item.tag].filter(Boolean).join(" ");
  return BLOCKED.test(hay);
}

export function splitTags(tag: string): string[] {
  return tag
    .split(/[,·|/]+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

export function isCustomProductPhoto(url: string | null | undefined): boolean {
  if (!url) return false;
  if (url.startsWith("data:")) return true;
  if (url.startsWith("/api/product-image/")) return true;
  if (/^https?:\/\//i.test(url)) return true;
  return false;
}

export function slugFromName(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}
