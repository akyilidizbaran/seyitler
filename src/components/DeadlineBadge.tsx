import { daysLeft, formatDate, type Opportunity } from "@/lib/types";

export function DeadlineBadge({ opp }: { opp: Pick<Opportunity, "deadline" | "opens_at" | "status"> }) {
  if (opp.status === "upcoming" && opp.opens_at) {
    const d = daysLeft(opp.opens_at)!;
    return <span className="chip bg-info-soft text-info">{d <= 0 ? "Bugün açılıyor" : `${d} gün sonra açılıyor`}</span>;
  }
  const d = daysLeft(opp.deadline);
  if (d === null) return <span className="chip bg-surface-2 text-muted">Son tarih yok / rolling</span>;
  if (d < 0) return <span className="chip bg-surface-2 text-muted">{formatDate(opp.deadline)} · geçti</span>;
  const tone = d <= 3 ? "bg-danger-soft text-danger" : d <= 7 ? "bg-warn-soft text-warn" : d <= 21 ? "bg-info-soft text-info" : "bg-surface-2 text-muted";
  const label = d === 0 ? "Bugün son gün" : d === 1 ? "Yarın son gün" : `${d} gün kaldı`;
  return (
    <span className={`chip ${tone}`} title={formatDate(opp.deadline)}>
      {label}
    </span>
  );
}
