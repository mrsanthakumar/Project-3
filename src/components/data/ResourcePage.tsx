"use client";

import { useState, useMemo } from "react";
import { useListApi } from "@/lib/client/useListApi";
import { apiPost, apiPut, apiDelete, qs, ApiClientError } from "@/lib/client/api";
import { useAuth } from "@/components/auth/AuthProvider";
import { Button, PageHeader, Input } from "@/components/ui";
import { Modal } from "@/components/ui/Modal";
import { DataTable, Pagination } from "@/components/data/DataTable";
import { ResourceForm } from "@/components/data/ResourceForm";
import { OptionSelect } from "@/components/data/OptionSelect";
import { BulkUploadButton } from "@/components/data/BulkUploadButton";
import type { ResourceConfig } from "@/components/data/resource-types";

/** Generic CRUD screen: list + search + filters + create/edit/delete + bulk upload. */
export function ResourcePage<T extends Record<string, unknown>>({ config }: { config: ResourceConfig<T> }) {
  const { can } = useAuth();
  const idKey = config.idKey ?? "id";
  const canEdit = config.canEdit ?? true;
  const canDelete = config.canDelete ?? true;

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState<T | null>(null);
  const [creating, setCreating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);

  const path = useMemo(() => {
    const params: Record<string, string | number> = { page, pageSize: 20 };
    if (search) params.search = search;
    for (const [k, v] of Object.entries(filters)) if (v) params[`filter[${k}]`] = v;
    return config.basePath + qs(params);
  }, [config.basePath, page, search, filters]);

  const { data, meta, loading, error, reload } = useListApi<T>(path);

  async function submit(payload: Record<string, unknown>) {
    setSubmitting(true);
    setFormError(null);
    try {
      if (editing) {
        await apiPut(`${config.basePath}/${editing[idKey]}`, payload);
        setBanner("Updated successfully");
      } else {
        await apiPost(config.basePath, payload);
        setBanner("Created successfully");
      }
      setEditing(null);
      setCreating(false);
      reload();
    } catch (e) {
      setFormError(e instanceof ApiClientError ? e.message : "Save failed");
    } finally {
      setSubmitting(false);
    }
  }

  async function remove(row: T) {
    if (!confirm("Delete this record?")) return;
    try {
      await apiDelete(`${config.basePath}/${row[idKey]}`);
      setBanner("Deleted");
      reload();
    } catch (e) {
      setBanner(e instanceof ApiClientError ? e.message : "Delete failed");
    }
  }

  const showCreate = !config.permissionCreate || can(config.permissionCreate);

  return (
    <div>
      <PageHeader
        title={config.title}
        subtitle={config.subtitle}
        actions={
          <div className="flex gap-2">
            {config.bulkUpload && <BulkUploadButton basePath={config.basePath} onDone={reload} />}
            {showCreate && <Button onClick={() => { setCreating(true); setFormError(null); }}>+ New</Button>}
          </div>
        }
      />

      {banner && (
        <div className="mb-4 flex items-center justify-between rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
          {banner}<button onClick={() => setBanner(null)}>✕</button>
        </div>
      )}

      {(config.searchable || config.filters?.length) && (
        <div className="mb-4 flex flex-wrap gap-3">
          {config.searchable && (
            <Input placeholder="Search…" value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="max-w-xs" />
          )}
          {config.filters?.map((f) => (
            <div key={f.name} className="w-48">
              {f.optionsFrom ? (
                <OptionSelect optionsFrom={f.optionsFrom} value={filters[f.name] ?? ""}
                  onChange={(v) => { setFilters((s) => ({ ...s, [f.name]: v })); setPage(1); }} />
              ) : (
                <select value={filters[f.name] ?? ""}
                  onChange={(e) => { setFilters((s) => ({ ...s, [f.name]: e.target.value })); setPage(1); }}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                  <option value="">{f.label}: All</option>
                  {f.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              )}
            </div>
          ))}
        </div>
      )}

      <DataTable
        columns={config.columns}
        rows={data}
        loading={loading}
        error={error}
        onRetry={reload}
        rowActions={
          canEdit || canDelete || config.rowActions
            ? (row) => (
                <div className="flex justify-end gap-2 text-sm">
                  {config.rowActions?.(row)}
                  {canEdit && <button onClick={() => { setEditing(row); setFormError(null); }} className="text-brand hover:underline">Edit</button>}
                  {canDelete && <button onClick={() => remove(row)} className="text-red-600 hover:underline">Delete</button>}
                </div>
              )
            : undefined
        }
      />
      <Pagination page={meta?.page ?? page} totalPages={meta?.totalPages ?? 1} onPage={setPage} />

      <Modal open={creating || !!editing} onClose={() => { setCreating(false); setEditing(null); }}
        title={editing ? `Edit ${config.title}` : `New ${config.title}`}>
        <ResourceForm
          fields={config.fields}
          initial={(editing ?? {}) as Record<string, unknown>}
          isEdit={!!editing}
          submitting={submitting}
          error={formError}
          onSubmit={submit}
        />
      </Modal>
    </div>
  );
}
