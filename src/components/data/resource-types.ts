import type { Column } from "@/components/data/DataTable";

/** Dynamic option source: fetch a list endpoint and map rows to options. */
export interface OptionsFrom {
  path: string; // e.g. "/departments?pageSize=100"
  valueKey?: string; // default "id"
  labelKey: string; // e.g. "name" or "code"
}

export interface FieldDef {
  name: string;
  label: string;
  type: "text" | "number" | "email" | "date" | "checkbox" | "select";
  required?: boolean;
  options?: { value: string; label: string }[]; // static select options
  optionsFrom?: OptionsFrom; // dynamic select options
  createOnly?: boolean; // shown on create, hidden on edit
  placeholder?: string;
}

export interface FilterDef {
  name: string; // maps to filter[name]
  label: string;
  options?: { value: string; label: string }[];
  optionsFrom?: OptionsFrom;
}

export interface ResourceConfig<T> {
  title: string;
  subtitle?: string;
  basePath: string; // e.g. "/students"
  idKey?: string; // default "id"
  columns: Column<T>[];
  fields: FieldDef[];
  searchable?: boolean;
  filters?: FilterDef[];
  permissionCreate?: string; // gate the create button
  bulkUpload?: boolean; // show "Bulk Upload" button → {basePath}/bulk-upload
  canEdit?: boolean; // default true
  canDelete?: boolean; // default true
  rowActions?: (row: T) => React.ReactNode; // extra per-row actions (e.g. links)
}
