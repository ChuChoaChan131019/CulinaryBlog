'use client';

import { useState } from 'react';
import { ArrowDown, ArrowUp, GripVertical, Plus, Trash2 } from 'lucide-react';

export interface IngredientFieldValue {
  name: string;
  quantity: number | undefined;
  unit: string;
  notes: string;
  orderIndex: number;
}

export interface IngredientsFieldProps {
  value?: IngredientFieldValue[];
  onChange?: (ingredients: IngredientFieldValue[]) => void;
  disabled?: boolean;
}

interface IngredientRow extends IngredientFieldValue {
  id: string;
}

const units = ['g', 'kg', 'ml', 'l', 'thìa cà phê', 'thìa canh', 'quả', 'gói', 'cốc'];
const createId = () => `ingredient-${crypto.randomUUID()}`;
const initialRows = (): IngredientRow[] => [
  { id: createId(), name: '', quantity: undefined, unit: 'g', notes: '', orderIndex: 0 },
];

function withOrder(rows: IngredientRow[]): IngredientRow[] {
  return rows.map((row, orderIndex) => ({ ...row, orderIndex }));
}

export default function IngredientsField({ value, onChange, disabled = false }: IngredientsFieldProps) {
  const [internalRows, setInternalRows] = useState<IngredientRow[]>(initialRows);
  const rows: IngredientRow[] = value === undefined
    ? internalRows
    : value.map((row, index) => ({ ...row, id: `ingredient-${index}` }));

  const update = (next: IngredientRow[]) => {
    const ordered = withOrder(next);
    if (value === undefined) setInternalRows(ordered);
    onChange?.(ordered.map((row) => ({
      name: row.name,
      quantity: row.quantity,
      unit: row.unit,
      notes: row.notes,
      orderIndex: row.orderIndex,
    })));
  };

  const updateRow = (id: string, patch: Partial<IngredientRow>) =>
    update(rows.map((row) => (row.id === id ? { ...row, ...patch } : row)));

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= rows.length) return;
    const next = [...rows];
    [next[index], next[target]] = [next[target], next[index]];
    update(next);
  };

  return (
    <section className="rounded-2xl border border-border bg-card p-6 shadow-card sm:p-8" aria-labelledby="ingredients-title">
      <h2 id="ingredients-title" className="font-display text-xl">Ingredients</h2>
      <p className="mt-1 text-sm text-muted-foreground">Quantities as you&apos;d actually shop for them.</p>
      <div className="mt-6 grid gap-3">
        {rows.map((row, index) => (
          <div key={row.id} className="grid gap-2 rounded-xl border border-border bg-surface p-3 sm:grid-cols-[auto_minmax(0,1fr)_90px_130px_minmax(0,1fr)_auto] sm:items-center">
            <GripVertical className="hidden h-4 w-4 shrink-0 text-muted-foreground sm:block" aria-hidden />
            <label className="sr-only" htmlFor={`${row.id}-name`}>Ingredient name</label>
            <input id={`${row.id}-name`} className="field min-w-0" placeholder="Ingredient name" value={row.name} onChange={(event) => updateRow(row.id, { name: event.target.value })} disabled={disabled} />
            <label className="sr-only" htmlFor={`${row.id}-quantity`}>Quantity</label>
            <input id={`${row.id}-quantity`} className="field" type="number" min="0" step="0.001" placeholder="Qty" value={row.quantity ?? ''} onChange={(event) => updateRow(row.id, { quantity: event.target.value === '' ? undefined : Number(event.target.value) })} disabled={disabled} />
            <label className="sr-only" htmlFor={`${row.id}-unit`}>Unit</label>
            <select id={`${row.id}-unit`} className="field" value={row.unit} onChange={(event) => updateRow(row.id, { unit: event.target.value })} disabled={disabled}>
              {units.map((unit) => <option key={unit}>{unit}</option>)}
            </select>
            <label className="sr-only" htmlFor={`${row.id}-notes`}>Notes</label>
            <input id={`${row.id}-notes`} className="field" placeholder="Notes (optional)" value={row.notes} onChange={(event) => updateRow(row.id, { notes: event.target.value })} disabled={disabled} />
            <div className="flex items-center justify-end gap-1">
              <button type="button" aria-label="Move ingredient up" className="rounded-lg p-1.5 text-muted-foreground hover:bg-card hover:text-foreground disabled:opacity-30" onClick={() => move(index, -1)} disabled={disabled || index === 0}><ArrowUp className="h-4 w-4" /></button>
              <button type="button" aria-label="Move ingredient down" className="rounded-lg p-1.5 text-muted-foreground hover:bg-card hover:text-foreground disabled:opacity-30" onClick={() => move(index, 1)} disabled={disabled || index === rows.length - 1}><ArrowDown className="h-4 w-4" /></button>
              <button type="button" aria-label="Remove ingredient" className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-destructive disabled:opacity-30" onClick={() => update(rows.filter((item) => item.id !== row.id))} disabled={disabled || rows.length === 1}><Trash2 className="h-4 w-4" /></button>
            </div>
          </div>
        ))}
      </div>
      <button type="button" className="mt-4 inline-flex items-center gap-2 rounded-full border border-dashed border-border px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:border-primary hover:text-primary disabled:opacity-50" onClick={() => update([...rows, { id: createId(), name: '', quantity: undefined, unit: 'g', notes: '', orderIndex: rows.length }])} disabled={disabled}>
        <Plus className="h-4 w-4" aria-hidden /> Add ingredient
      </button>
    </section>
  );
}
