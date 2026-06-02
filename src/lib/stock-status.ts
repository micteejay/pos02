export type StockStatus = "critical" | "low" | "ok";

/** Effective low-stock threshold: per-item reorder, or global setting when unset. */
export function getStockThreshold(itemReorder: number, globalThreshold: number): number {
  return itemReorder > 0 ? itemReorder : globalThreshold;
}

export function computeStockStatus(qty: number, threshold: number): StockStatus {
  if (qty <= threshold * 0.3) return "critical";
  if (qty <= threshold) return "low";
  return "ok";
}
