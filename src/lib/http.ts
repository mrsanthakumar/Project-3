import { NextResponse } from "next/server";
import { ZodError } from "zod";

/** Standard envelopes (mirror docs/API_DESIGN.md §1.4). */
export type Meta = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
} | null;

export function ok<T>(data: T, meta: Meta = null, status = 200) {
  return NextResponse.json({ data, meta }, { status });
}

export function created<T>(data: T) {
  return ok(data, null, 201);
}

export function noContent() {
  return new NextResponse(null, { status: 204 });
}

export type ErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "UNPROCESSABLE"
  | "RATE_LIMITED"
  | "INTERNAL";

const STATUS: Record<ErrorCode, number> = {
  VALIDATION_ERROR: 400,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE: 422,
  RATE_LIMITED: 429,
  INTERNAL: 500,
};

export class ApiError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

export function fail(code: ErrorCode, message: string, details?: unknown) {
  return NextResponse.json(
    { error: { code, message, details } },
    { status: STATUS[code] },
  );
}

/**
 * Wrap a route handler so thrown ApiError / ZodError become clean envelopes
 * and unexpected errors return 500 without leaking internals.
 *
 * Next.js 15 delivers route `params` as a Promise; we resolve it here so
 * handlers receive a plain `{ params }` object.
 */
type ResolvedCtx = { params?: Record<string, string> };

export function handle(
  fn: (req: Request, ctx: ResolvedCtx) => Promise<Response>,
) {
  // ctx is typed `any` so the wrapper is assignable to every Next.js route
  // signature (dynamic and non-dynamic); we normalise the async params here.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return async (req: Request, ctx: any) => {
    try {
      const params = ctx?.params ? await ctx.params : undefined;
      return await fn(req, { params });
    } catch (e) {
      if (e instanceof ZodError) {
        return fail(
          "VALIDATION_ERROR",
          "Request validation failed",
          e.errors.map((err) => ({ field: err.path.join("."), issue: err.message })),
        );
      }
      if (e instanceof ApiError) {
        return fail(e.code, e.message, e.details);
      }
      console.error("Unhandled API error:", e);
      return fail("INTERNAL", "Something went wrong");
    }
  };
}
