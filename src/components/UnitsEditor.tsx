import { Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { ItemUnit } from "@/hooks/use-shared-data";

interface Props {
  baseUnit: string;
  units: ItemUnit[];
  onChange: (units: ItemUnit[]) => void;
}

/**
 * Editor for additional selling units (Box, Carton, Pack, ...) with conversion factor and price.
 * Base unit is shown read-only as the reference unit.
 */
export function UnitsEditor({ baseUnit, units, onChange }: Props) {
  const addRow = () => onChange([...units, { name: "", factor: 1, price: 0, sellable: true }]);
  const update = (i: number, patch: Partial<ItemUnit>) =>
    onChange(units.map((u, idx) => (idx === i ? { ...u, ...patch } : u)));
  const remove = (i: number) => onChange(units.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-muted-foreground">
          Additional Units (1 base = {baseUnit || "pcs"})
        </label>
        <button
          type="button"
          onClick={addRow}
          className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          <Plus className="w-3.5 h-3.5" /> Add Unit
        </button>
      </div>

      {units.length === 0 && (
        <p className="text-xs text-muted-foreground italic px-1">
          No extra units. Item will only sell in {baseUnit || "pcs"}.
        </p>
      )}

      {units.map((u, i) => (
        <div key={i} className="grid grid-cols-[1fr_90px_110px_auto] gap-2 items-end p-2 rounded-md bg-muted/30 border border-border">
          <div>
            <label className="text-[10px] uppercase tracking-wide text-muted-foreground">Unit name</label>
            <Input
              value={u.name}
              onChange={(e) => update(i, { name: e.target.value })}
              placeholder="Box, Carton…"
              className="mt-0.5 h-9"
            />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wide text-muted-foreground">= base × </label>
            <Input
              type="number"
              min={1}
              value={u.factor || ""}
              onChange={(e) => update(i, { factor: Math.max(1, parseInt(e.target.value) || 1) })}
              className="mt-0.5 h-9"
            />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wide text-muted-foreground">Price / unit</label>
            <Input
              type="number"
              min={0}
              value={u.price || ""}
              onChange={(e) => update(i, { price: parseFloat(e.target.value) || 0 })}
              className="mt-0.5 h-9"
            />
          </div>
          <button
            type="button"
            onClick={() => remove(i)}
            className="h-9 w-9 inline-flex items-center justify-center rounded-md border border-border text-destructive hover:bg-destructive/10"
            title="Remove unit"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}