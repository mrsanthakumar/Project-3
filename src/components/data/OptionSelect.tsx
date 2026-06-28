"use client";

import { useApi } from "@/lib/client/useApi";
import type { OptionsFrom } from "@/components/data/resource-types";

/** A <select> whose options are loaded from an API list endpoint. */
export function OptionSelect({
  optionsFrom, value, onChange, includeBlank = true, required,
}: {
  optionsFrom: OptionsFrom;
  value: string;
  onChange: (v: string) => void;
  includeBlank?: boolean;
  required?: boolean;
}) {
  const { data, loading } = useApi<Record<string, unknown>[]>(optionsFrom.path);
  const valueKey = optionsFrom.valueKey ?? "id";

  return (
    <select
      value={value}
      required={required}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
    >
      {includeBlank && <option value="">{loading ? "Loading…" : "— Select —"}</option>}
      {(data ?? []).map((row) => (
        <option key={String(row[valueKey])} value={String(row[valueKey])}>
          {String(row[optionsFrom.labelKey] ?? row[valueKey])}
        </option>
      ))}
    </select>
  );
}
