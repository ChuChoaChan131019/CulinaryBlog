'use client';

import { useState } from 'react';
import { ArrowDown, ArrowUp, GripVertical, Plus, Trash2 } from 'lucide-react';

export interface StepFieldValue {
  stepNumber: number;
  title: string;
  description: string;
  timerMinutes: number | undefined;
  imageUrl?: string;
}

export interface StepsFieldProps {
  value?: StepFieldValue[];
  onChange?: (steps: StepFieldValue[]) => void;
  disabled?: boolean;
}

interface StepRow extends StepFieldValue {
  id: string;
}

const createId = () => `step-${crypto.randomUUID()}`;
const initialRows = (): StepRow[] => [{ id: createId(), stepNumber: 1, title: '', description: '', timerMinutes: undefined }];

function withOrder(rows: StepRow[]): StepRow[] {
  return rows.map((row, index) => ({ ...row, stepNumber: index + 1 }));
}

export default function StepsField({ value, onChange, disabled = false }: StepsFieldProps) {
  const [internalRows, setInternalRows] = useState<StepRow[]>(initialRows);
  const rows: StepRow[] = value === undefined
    ? internalRows
    : value.map((row, index) => ({ ...row, id: `step-${index}` }));

  const update = (next: StepRow[]) => {
    const ordered = withOrder(next);
    if (value === undefined) setInternalRows(ordered);
    onChange?.(ordered.map((row) => ({
      stepNumber: row.stepNumber,
      title: row.title,
      description: row.description,
      timerMinutes: row.timerMinutes,
      imageUrl: row.imageUrl,
    })));
  };

  const updateRow = (id: string, patch: Partial<StepRow>) =>
    update(rows.map((row) => (row.id === id ? { ...row, ...patch } : row)));

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= rows.length) return;
    const next = [...rows];
    [next[index], next[target]] = [next[target], next[index]];
    update(next);
  };

  return (
    <section className="rounded-2xl border border-border bg-card p-6 shadow-card sm:p-8" aria-labelledby="steps-title">
      <h2 id="steps-title" className="font-display text-xl">Method</h2>
      <p className="mt-1 text-sm text-muted-foreground">One action per step, with a realistic duration.</p>
      <ol className="mt-6 grid gap-4">
        {rows.map((row, index) => (
          <li key={row.id} className="rounded-xl border border-border bg-surface p-4">
            <div className="flex items-center gap-3">
              <GripVertical className="hidden h-4 w-4 shrink-0 text-muted-foreground sm:block" aria-hidden />
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary font-display text-sm font-semibold text-primary-foreground">{row.stepNumber}</span>
              <label className="sr-only" htmlFor={`${row.id}-title`}>Step title</label>
              <input id={`${row.id}-title`} className="field min-w-0 flex-1" placeholder="Step title (optional)" value={row.title} onChange={(event) => updateRow(row.id, { title: event.target.value })} disabled={disabled} />
              <label className="sr-only" htmlFor={`${row.id}-timer`}>Duration in minutes</label>
              <input id={`${row.id}-timer`} className="field w-24 shrink-0" type="number" min="0" placeholder="Min" value={row.timerMinutes ?? ''} onChange={(event) => updateRow(row.id, { timerMinutes: event.target.value === '' ? undefined : Number(event.target.value) })} disabled={disabled} />
              <button type="button" aria-label="Move step up" className="hidden rounded-lg p-1.5 text-muted-foreground hover:bg-card hover:text-foreground disabled:opacity-30 sm:block" onClick={() => move(index, -1)} disabled={disabled || index === 0}><ArrowUp className="h-4 w-4" /></button>
              <button type="button" aria-label="Move step down" className="hidden rounded-lg p-1.5 text-muted-foreground hover:bg-card hover:text-foreground disabled:opacity-30 sm:block" onClick={() => move(index, 1)} disabled={disabled || index === rows.length - 1}><ArrowDown className="h-4 w-4" /></button>
              <button type="button" aria-label="Remove step" className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-destructive disabled:opacity-30" onClick={() => update(rows.filter((item) => item.id !== row.id))} disabled={disabled || rows.length === 1}><Trash2 className="h-4 w-4" /></button>
            </div>
            <label className="sr-only" htmlFor={`${row.id}-description`}>Step description</label>
            <textarea id={`${row.id}-description`} rows={2} className="field mt-3 resize-y" placeholder="Describe what the cook should do, and what it should look like when it&apos;s right." value={row.description} onChange={(event) => updateRow(row.id, { description: event.target.value })} disabled={disabled} />
            <div className="mt-2 flex justify-end gap-1 sm:hidden">
              <button type="button" aria-label="Move step up" className="rounded-lg p-1.5 text-muted-foreground hover:bg-card hover:text-foreground disabled:opacity-30" onClick={() => move(index, -1)} disabled={disabled || index === 0}><ArrowUp className="h-4 w-4" /></button>
              <button type="button" aria-label="Move step down" className="rounded-lg p-1.5 text-muted-foreground hover:bg-card hover:text-foreground disabled:opacity-30" onClick={() => move(index, 1)} disabled={disabled || index === rows.length - 1}><ArrowDown className="h-4 w-4" /></button>
            </div>
          </li>
        ))}
      </ol>
      <button type="button" className="mt-4 inline-flex items-center gap-2 rounded-full border border-dashed border-border px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:border-primary hover:text-primary disabled:opacity-50" onClick={() => update([...rows, { id: createId(), stepNumber: rows.length + 1, title: '', description: '', timerMinutes: undefined }])} disabled={disabled}>
        <Plus className="h-4 w-4" aria-hidden /> Add step
      </button>
    </section>
  );
}
