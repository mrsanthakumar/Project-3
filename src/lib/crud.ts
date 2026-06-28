import { z, type ZodTypeAny } from "zod";
import { query, queryOne } from "@/lib/db";
import { handle, ok, created, noContent, ApiError } from "@/lib/http";
import { parseListParams } from "@/lib/query";
import {
  getAuthContext,
  requirePermission,
  resolveInstitutionScope,
} from "@/lib/auth/context";
import { recordAudit, clientIp } from "@/lib/audit";

/**
 * Column mapping between the API (camelCase) and the DB (snake_case),
 * declaring which columns can be set on insert/update.
 */
export interface ColumnDef {
  api: string;
  db: string;
  insertable?: boolean;
  updatable?: boolean;
}

export interface ResourceConfig {
  table: string;
  entity: string; // for audit logs
  permissionView: string;
  permissionWrite: string;
  // Optional per-action overrides; fall back to permissionWrite.
  permissionCreate?: string;
  permissionUpdate?: string;
  permissionDelete?: string;
  columns: ColumnDef[];
  searchable?: string[]; // db columns matched with ILIKE
  filterable?: Record<string, string>; // api filter key -> db column
  sortable?: Record<string, string>; // api sort field -> db column
  defaultSort?: string; // db column, e.g. "created_at DESC"
  softDelete?: boolean; // table has deleted_at
  jsonColumns?: string[]; // api fields stored as jsonb (JSON.stringify on write)
  createSchema: ZodTypeAny;
  updateSchema: ZodTypeAny;
}

/** jsonb columns must be stringified before being sent to pg. */
function serialiseValue(cfg: ResourceConfig, api: string, value: unknown): unknown {
  if (cfg.jsonColumns?.includes(api) && value !== null && value !== undefined) {
    return JSON.stringify(value);
  }
  return value;
}

const rowToApi = (cfg: ResourceConfig, row: Record<string, unknown>) => {
  const out: Record<string, unknown> = {};
  for (const c of cfg.columns) {
    if (c.db in row) out[c.api] = row[c.db];
  }
  if ("id" in row) out.id = row.id;
  return out;
};

function tenantClause(cfg: ResourceConfig, idx: number) {
  // institutions table is itself the tenant root — no institution_id column.
  const parts: string[] = [];
  if (cfg.table !== "institutions") parts.push(`institution_id = $${idx}`);
  if (cfg.softDelete) parts.push(`deleted_at IS NULL`);
  return parts;
}

export function crudRoutes(cfg: ResourceConfig) {
  // ---- LIST ----
  const list = handle(async (req) => {
    const ctx = getAuthContext(req);
    requirePermission(ctx, cfg.permissionView);
    const institutionId =
      cfg.table === "institutions" ? null : resolveInstitutionScope(ctx, req);
    const params = parseListParams(req);

    const where: string[] = [];
    const values: unknown[] = [];
    let i = 1;

    if (cfg.table !== "institutions") {
      where.push(`institution_id = $${i++}`);
      values.push(institutionId);
    }
    if (cfg.softDelete) where.push(`deleted_at IS NULL`);

    if (params.search && cfg.searchable?.length) {
      const ors = cfg.searchable.map((col) => `${col} ILIKE $${i}`);
      values.push(`%${params.search}%`);
      i++;
      where.push(`(${ors.join(" OR ")})`);
    }

    for (const [key, val] of Object.entries(params.filters)) {
      const col = cfg.filterable?.[key];
      if (col) {
        where.push(`${col} = $${i++}`);
        values.push(val);
      }
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const orderBy =
      params.sort
        .map((s) => cfg.sortable?.[s.field] && `${cfg.sortable[s.field]} ${s.dir}`)
        .filter(Boolean)
        .join(", ") ||
      cfg.defaultSort ||
      "created_at DESC";

    const totalRow = await queryOne<{ count: string }>(
      `SELECT count(*)::int AS count FROM ${cfg.table} ${whereSql}`,
      values,
    );
    const total = Number(totalRow?.count ?? 0);

    const offset = (params.page - 1) * params.pageSize;
    const rows = await query(
      `SELECT * FROM ${cfg.table} ${whereSql} ORDER BY ${orderBy} LIMIT $${i++} OFFSET $${i++}`,
      [...values, params.pageSize, offset],
    );

    return ok(
      rows.map((r) => rowToApi(cfg, r)),
      {
        page: params.page,
        pageSize: params.pageSize,
        total,
        totalPages: Math.ceil(total / params.pageSize) || 1,
      },
    );
  });

  // ---- CREATE ----
  const create = handle(async (req) => {
    const ctx = getAuthContext(req);
    requirePermission(ctx, cfg.permissionCreate ?? cfg.permissionWrite);
    const institutionId =
      cfg.table === "institutions" ? null : resolveInstitutionScope(ctx, req);
    const body = cfg.createSchema.parse(await req.json()) as Record<string, unknown>;

    const cols: string[] = [];
    const placeholders: string[] = [];
    const values: unknown[] = [];
    let i = 1;

    if (cfg.table !== "institutions") {
      cols.push("institution_id");
      placeholders.push(`$${i++}`);
      values.push(institutionId);
    }

    for (const c of cfg.columns) {
      if (c.insertable && c.api in body) {
        cols.push(c.db);
        placeholders.push(`$${i++}`);
        values.push(serialiseValue(cfg, c.api, body[c.api]));
      }
    }

    let row: Record<string, unknown> | null;
    try {
      row = await queryOne(
        `INSERT INTO ${cfg.table} (${cols.join(", ")}) VALUES (${placeholders.join(", ")}) RETURNING *`,
        values,
      );
    } catch (e) {
      throw mapDbError(e);
    }

    await recordAudit({
      institutionId,
      userId: ctx.userId,
      action: "CREATE",
      entity: cfg.entity,
      entityId: String(row?.id),
      detail: body,
      ip: clientIp(req),
    });

    return created(rowToApi(cfg, row!));
  });

  // ---- GET ONE ----
  const getOne = handle(async (req, { params }) => {
    const ctx = getAuthContext(req);
    requirePermission(ctx, cfg.permissionView);
    const institutionId =
      cfg.table === "institutions" ? null : resolveInstitutionScope(ctx, req);
    const id = params!.id;

    const tenant = tenantClause(cfg, 2);
    const row = await queryOne(
      `SELECT * FROM ${cfg.table} WHERE id = $1 ${tenant.length ? "AND " + tenant.join(" AND ") : ""}`,
      cfg.table !== "institutions" ? [id, institutionId] : [id],
    );
    if (!row) throw new ApiError("NOT_FOUND", `${cfg.entity} not found`);
    return ok(rowToApi(cfg, row));
  });

  // ---- UPDATE ----
  const update = handle(async (req, { params }) => {
    const ctx = getAuthContext(req);
    requirePermission(ctx, cfg.permissionUpdate ?? cfg.permissionWrite);
    const institutionId =
      cfg.table === "institutions" ? null : resolveInstitutionScope(ctx, req);
    const id = params!.id;
    const body = cfg.updateSchema.parse(await req.json()) as Record<string, unknown>;

    const sets: string[] = [];
    const values: unknown[] = [];
    let i = 1;
    for (const c of cfg.columns) {
      if (c.updatable && c.api in body) {
        sets.push(`${c.db} = $${i++}`);
        values.push(serialiseValue(cfg, c.api, body[c.api]));
      }
    }
    if (!sets.length) throw new ApiError("VALIDATION_ERROR", "No updatable fields provided");

    values.push(id);
    const idParam = i++;
    let whereExtra = "";
    if (cfg.table !== "institutions") {
      values.push(institutionId);
      whereExtra = `AND institution_id = $${i++}`;
    }
    if (cfg.softDelete) whereExtra += " AND deleted_at IS NULL";

    let row: Record<string, unknown> | null;
    try {
      row = await queryOne(
        `UPDATE ${cfg.table} SET ${sets.join(", ")} WHERE id = $${idParam} ${whereExtra} RETURNING *`,
        values,
      );
    } catch (e) {
      throw mapDbError(e);
    }
    if (!row) throw new ApiError("NOT_FOUND", `${cfg.entity} not found`);

    await recordAudit({
      institutionId,
      userId: ctx.userId,
      action: "UPDATE",
      entity: cfg.entity,
      entityId: id,
      detail: body,
      ip: clientIp(req),
    });

    return ok(rowToApi(cfg, row));
  });

  // ---- DELETE (soft when supported) ----
  const remove = handle(async (req, { params }) => {
    const ctx = getAuthContext(req);
    requirePermission(ctx, cfg.permissionDelete ?? cfg.permissionWrite);
    const institutionId =
      cfg.table === "institutions" ? null : resolveInstitutionScope(ctx, req);
    const id = params!.id;

    const args: unknown[] = [id];
    let whereExtra = "";
    if (cfg.table !== "institutions") {
      args.push(institutionId);
      whereExtra = `AND institution_id = $2`;
    }

    const sql = cfg.softDelete
      ? `UPDATE ${cfg.table} SET deleted_at = now() WHERE id = $1 ${whereExtra} AND deleted_at IS NULL RETURNING id`
      : `DELETE FROM ${cfg.table} WHERE id = $1 ${whereExtra} RETURNING id`;

    let row: { id: string } | null;
    try {
      row = await queryOne<{ id: string }>(sql, args);
    } catch (e) {
      throw mapDbError(e);
    }
    if (!row) throw new ApiError("NOT_FOUND", `${cfg.entity} not found`);

    await recordAudit({
      institutionId,
      userId: ctx.userId,
      action: "DELETE",
      entity: cfg.entity,
      entityId: id,
      ip: clientIp(req),
    });

    return noContent();
  });

  return {
    collection: { GET: list, POST: create },
    item: { GET: getOne, PUT: update, DELETE: remove },
  };
}

/** Translate common pg errors into clean ApiErrors. */
function mapDbError(e: unknown): ApiError {
  const err = e as { code?: string; constraint?: string; detail?: string };
  if (err.code === "23505") return new ApiError("CONFLICT", "Duplicate value", err.detail);
  if (err.code === "23503")
    return new ApiError("UNPROCESSABLE", "Referenced record does not exist", err.detail);
  if (e instanceof ApiError) return e;
  return new ApiError("INTERNAL", "Database error");
}

/** Shared zod helpers for master modules. */
export const zUuid = z.string().uuid();
export const zCode = z.string().min(1).max(30);
export const zName = z.string().min(1).max(255);
