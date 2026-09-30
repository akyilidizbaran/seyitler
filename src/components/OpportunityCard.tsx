import Link from "next/link";
import { CATEGORIES, WORK_MODES, type Opportunity } from "@/lib/types";
import { DeadlineBadge } from "./DeadlineBadge";
import { TrackButtons } from "./TrackButtons";

export function OpportunityCard({ opp, showTrack = true }: { opp: Opportunity; showTrack?: boolean }) {
  const place = [opp.location, opp.work_mode !== "bilinmiyor" ? WORK_MODES[opp.work_mode] : null].filter(Boolean).join(" · ");
  return (
    <article className="card flex flex-col gap-3 p-4">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="chip bg-accent-soft text-accent">{CATEGORIES[opp.category]}</span>
        <DeadlineBadge opp={opp} />
        {opp.status === "pending" && <span className="chip bg-warn-soft text-warn">Onay bekliyor · AI önerisi</span>}
        {opp.status === "closed" && <span className="chip bg-surface-2 text-muted">Kapandı</span>}
        {opp.link_status === "broken" && <span className="chip bg-danger-soft text-danger">Link çalışmıyor olabilir</span>}
      </div>
      <div>
        <Link href={`/firsatlar/${opp.id}`} className="text-base font-semibold leading-snug hover:text-accent">
          {opp.title}
        </Link>
        <p className="mt-0.5 text-sm text-muted">
          {opp.organization}
          {place && <> · {place}</>}
          {opp.country !== "Türkiye" && !opp.location?.includes(opp.country) && <> · {opp.country}</>}
        </p>
      </div>
      {opp.description && <p className="line-clamp-2 text-sm text-muted">{opp.description}</p>}
      <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-1">
        {showTrack ? <TrackButtons id={opp.id} status={opp.my_status} /> : <span />}
        {opp.apply_url && (
          <a href={opp.apply_url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-accent hover:underline">
            Başvur ↗
          </a>
        )}
      </div>
    </article>
  );
}
