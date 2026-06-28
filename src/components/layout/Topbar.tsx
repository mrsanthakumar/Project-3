"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { Button } from "@/components/ui";
import { InstitutionSwitcher } from "@/components/layout/InstitutionSwitcher";

const ROLE_LABEL: Record<string, string> = {
  super_admin: "Super Admin",
  principal: "Principal",
  administration: "Administration",
  hod: "HOD",
  faculty_advisor: "Faculty Advisor",
  placement_officer: "Placement Officer",
};

export function Topbar() {
  const { user, logout } = useAuth();
  const router = useRouter();

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  return (
    <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6">
      <div className="flex items-center gap-3">
        <span className="text-sm text-slate-500">{ROLE_LABEL[user?.role ?? ""] ?? user?.role}</span>
        {user?.role === "super_admin" && <InstitutionSwitcher />}
      </div>
      <div className="flex items-center gap-3">
        <div className="text-right">
          <div className="text-sm font-medium text-slate-800">{user?.fullName}</div>
          <div className="text-xs text-slate-400">{user?.email}</div>
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand/10 text-sm font-semibold text-brand">
          {user?.fullName?.charAt(0).toUpperCase()}
        </div>
        <Button variant="ghost" onClick={handleLogout}>Logout</Button>
      </div>
    </header>
  );
}
