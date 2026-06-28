"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV } from "@/components/layout/nav";
import { useAuth } from "@/components/auth/AuthProvider";

export function Sidebar() {
  const pathname = usePathname();
  const { can } = useAuth();

  return (
    <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white md:block">
      <div className="flex h-16 items-center gap-2 border-b border-slate-200 px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-sm font-bold text-white">II</div>
        <span className="text-sm font-semibold leading-tight text-slate-800">Institutional<br />Insights</span>
      </div>
      <nav className="space-y-6 px-3 py-5">
        {NAV.map((section) => {
          const items = section.items.filter((i) => i.anyOf.some((p) => can(p)));
          if (!items.length) return null;
          return (
            <div key={section.title}>
              <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">{section.title}</p>
              <ul className="space-y-0.5">
                {items.map((item) => {
                  const active = pathname === item.href || pathname.startsWith(item.href + "/");
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={`block rounded-lg px-3 py-2 text-sm transition ${
                          active ? "bg-brand/10 font-medium text-brand" : "text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
