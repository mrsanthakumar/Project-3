import { describe, it, expect } from "vitest";
import { requirePermission, resolveInstitutionScope, type AuthContext } from "@/lib/auth/context";
import { ApiError } from "@/lib/http";

const base: AuthContext = {
  userId: "u1", institutionId: "inst1", role: "hod",
  permissions: ["student.read"], departmentId: "d1", isSuperAdmin: false,
};

describe("requirePermission", () => {
  it("allows when permission is held", () => {
    expect(() => requirePermission(base, "student.read")).not.toThrow();
  });
  it("forbids when permission is missing", () => {
    expect(() => requirePermission(base, "student.delete")).toThrow(ApiError);
  });
  it("super admin bypasses all checks", () => {
    const sa = { ...base, isSuperAdmin: true, permissions: [] };
    expect(() => requirePermission(sa, "anything.at.all")).not.toThrow();
  });
});

describe("resolveInstitutionScope", () => {
  it("locks a normal user to their own institution", () => {
    const req = new Request("http://x");
    expect(resolveInstitutionScope(base, req)).toBe("inst1");
  });
  it("requires X-Institution-Id for super admin", () => {
    const sa = { ...base, isSuperAdmin: true, institutionId: null };
    expect(() => resolveInstitutionScope(sa, new Request("http://x"))).toThrow(ApiError);
    const scoped = resolveInstitutionScope(sa, new Request("http://x", { headers: { "x-institution-id": "inst9" } }));
    expect(scoped).toBe("inst9");
  });
});
