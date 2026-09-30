"use client";

import { useTransition } from "react";
import { markAllNotificationsRead, markNotificationRead } from "@/lib/actions";

export function MarkReadButton({ id, kind }: { id: number; kind: "deadline" | "new" }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => start(() => markNotificationRead(id, kind))}
      className="self-end rounded-full border border-border px-3 py-1 text-xs font-medium text-muted transition hover:border-muted hover:text-text disabled:opacity-50"
    >
      {pending ? "…" : "✓ Okudum"}
    </button>
  );
}

export function MarkAllReadButton() {
  const [pending, start] = useTransition();
  return (
    <button type="button" disabled={pending} onClick={() => start(() => markAllNotificationsRead())} className="btn-ghost">
      {pending ? "İşaretleniyor…" : "Tümünü okundu işaretle"}
    </button>
  );
}
