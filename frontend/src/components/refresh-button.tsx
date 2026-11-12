"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

export function RefreshButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return <button className="button button-secondary" disabled={pending}
    onClick={() => startTransition(() => router.refresh())}>
    <span aria-hidden="true">↻</span> {pending ? "Refreshing…" : "Refresh"}
  </button>;
}
