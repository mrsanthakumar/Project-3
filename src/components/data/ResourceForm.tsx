"use client";

import { useState } from "react";
import { Button, Input, Field } from "@/components/ui";
import { OptionSelect } from "@/components/data/OptionSelect";
import type { FieldDef } from "@/components/data/resource-types";

type Values = Record<string, unknown>;

/** Builds a typed payload from form values, coercing per field type. */
function buildPayload(fields: FieldDef[], values: Values, isEdit: boolean): Values {
  const out: Values = {};
  for (const f of fields) {
    if (isEdit && f.createOnly) continue;
    const raw = values[f.name];
    if (raw === "" || raw === undefined) continue;
    out[f.name] = f.type === "number" ? Number(raw) : f.type === "checkbox" ? !!raw : raw;
  }
  return out;
}

export function ResourceForm({
  fields, initial, isEdit, submitting, error, onSubmit,
}: {
  fields: FieldDef[];
  initial: Values;
  isEdit: boolean;
  submitting: boolean;
  error: string | null;
  onSubmit: (payload: Values) => void;
}) {
  const [values, setValues] = useState<Values>(initial);
  const set = (name: string, v: unknown) => setValues((s) => ({ ...s, [name]: v }));
  const visible = fields.filter((f) => !(isEdit && f.createOnly));

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); onSubmit(buildPayload(fields, values, isEdit)); }}
      className="space-y-4"
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {visible.map((f) => (
          <div key={f.name} className={f.type === "checkbox" ? "flex items-center gap-2 pt-6" : ""}>
            {f.type === "checkbox" ? (
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={!!values[f.name]} onChange={(e) => set(f.name, e.target.checked)} />
                {f.label}
              </label>
            ) : (
              <Field label={f.label + (f.required ? " *" : "")}>
                {f.type === "select" && f.optionsFrom ? (
                  <OptionSelect optionsFrom={f.optionsFrom} required={f.required}
                    value={String(values[f.name] ?? "")} onChange={(v) => set(f.name, v)} />
                ) : f.type === "select" ? (
                  <select
                    value={String(values[f.name] ?? "")} required={f.required}
                    onChange={(e) => set(f.name, e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                  >
                    <option value="">— Select —</option>
                    {f.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                ) : (
                  <Input
                    type={f.type} required={f.required} placeholder={f.placeholder}
                    value={String(values[f.name] ?? "")}
                    onChange={(e) => set(f.name, e.target.value)}
                  />
                )}
              </Field>
            )}
          </div>
        ))}
      </div>
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <div className="flex justify-end gap-2">
        <Button type="submit" loading={submitting}>{isEdit ? "Save changes" : "Create"}</Button>
      </div>
    </form>
  );
}
