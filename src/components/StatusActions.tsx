"use client";

import { useTransition } from "react";
import { setOpportunityStatus } from "@/lib/actions";
import type { OppStatus } from "@/lib/types";

export function StatusActions({ id, status }: { id: number; status: OppStatus }) {
  const [pending, start] = useTransition();
  const run = (action: "approve" | "reject" | "close" | "reopen", confirmText?: string) => () => {
    if (confirmText && !confirm(confirmText)) return;
    start(() => setOpportunityStatus(id, action));
  };

  return (
    <div className="flex flex-wrap gap-2">
      {status === "pending" && (
        <>
          <button className="btn-primary" disabled={pending} onClick={run("approve")}>
            ✓ Onayla ve yayınla
          </button>
          <button className="btn-ghost" disabled={pending} onClick={run("reject", "Bu öneri reddedilsin mi?")}>
            Reddet
          </button>
        </>
      )}
      {(status === "active" || status === "upcoming") && (
        <button className="btn-ghost" disabled={pending} onClick={run("close", "Bu fırsat kapandı olarak işaretlensin mi?")}>
          Kapandı olarak işaretle
        </button>
      )}
      {(status === "closed" || status === "rejected") && (
        <button className="btn-ghost" disabled={pending} onClick={run("reopen")}>
          Yeniden aç
        </button>
      )}
    </div>
  );
}
