"use client";

import { useOptimistic, useTransition } from "react";
import { setTrack } from "@/lib/actions";
import { TRACK_STATUSES, type TrackStatus } from "@/lib/types";

const TONES: Record<TrackStatus, string> = {
  interested: "border-info bg-info-soft text-info",
  applied: "border-accent bg-accent-soft text-accent",
  done: "border-muted bg-surface-2 text-text",
  skipped: "border-border bg-surface-2 text-muted line-through",
};

export function TrackButtons({ id, status, size = "sm" }: { id: number; status: TrackStatus | null | undefined; size?: "sm" | "md" }) {
  const [pending, start] = useTransition();
  const [current, setCurrent] = useOptimistic(status ?? null);
  const pad = size === "md" ? "px-3 py-1.5 text-sm" : "px-2 py-1 text-xs";

  return (
    <div className="flex flex-wrap gap-1.5" aria-busy={pending}>
      {(Object.keys(TRACK_STATUSES) as TrackStatus[]).map((s) => {
        const active = current === s;
        return (
          <button
            key={s}
            type="button"
            aria-pressed={active}
            onClick={() =>
              start(async () => {
                const next = active ? null : s;
                setCurrent(next);
                await setTrack(id, next);
              })
            }
            className={`rounded-full border font-medium transition ${pad} ${
              active ? TONES[s] : "border-border text-muted hover:border-muted hover:text-text"
            }`}
          >
            {active && "✓ "}
            {TRACK_STATUSES[s]}
          </button>
        );
      })}
    </div>
  );
}
