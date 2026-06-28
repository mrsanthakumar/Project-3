"use client";

import { Spinner, Button } from "@/components/ui";

/** Shared loading / error / empty states for data-driven screens. */
export function Loading({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-slate-400">
      <Spinner /> {label}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center">
      <p className="text-sm text-red-600">{message}</p>
      {onRetry && <Button variant="secondary" onClick={onRetry}>Retry</Button>}
    </div>
  );
}

export function Empty({ message = "No data yet." }: { message?: string }) {
  return <div className="py-16 text-center text-sm text-slate-400">{message}</div>;
}
