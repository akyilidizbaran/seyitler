import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { listOpportunities } from "@/lib/queries";
import { CATEGORIES } from "@/lib/types";
import { DeadlineBadge } from "@/components/DeadlineBadge";
import { StatusActions } from "@/components/StatusActions";

export default async function ReviewPage() {
  const user = await requireUser();
  const items = await listOpportunities(user.id, { status: "pending" });

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-semibold">Onay bekleyen öneriler</h1>
        <p className="text-sm text-muted">
          Otomatik tarama her 3 günde bir yeni fırsat önerir. Resmi linki açıp tarih ve uygunluğu kontrol ettikten sonra onayla;
          onaylanan fırsat herkesin listesine düşer. Gerekirse önce düzenle.
        </p>
      </div>
      {items.length === 0 ? (
        <p className="card p-8 text-center text-sm text-muted">Onay bekleyen öneri yok.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((o) => (
            <article key={o.id} className="card flex flex-col gap-3 p-4">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="chip bg-accent-soft text-accent">{CATEGORIES[o.category]}</span>
                <DeadlineBadge opp={o} />
                {o.country !== "Türkiye" && <span className="chip bg-surface-2 text-muted">{o.country}</span>}
              </div>
              <div>
                <Link href={`/firsatlar/${o.id}`} className="font-semibold hover:text-accent">
                  {o.title}
                </Link>
                <p className="text-sm text-muted">{o.organization}</p>
              </div>
              {o.description && <p className="text-sm text-muted">{o.description}</p>}
              {o.deadline_note && <p className="text-xs text-muted">🗓 {o.deadline_note}</p>}
              <div className="flex flex-wrap items-center gap-3 text-sm">
                {o.source_url && (
                  <a href={o.source_url} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
                    Kaynağı kontrol et ↗
                  </a>
                )}
                <Link href={`/firsatlar/${o.id}/duzenle`} className="text-muted hover:text-text">
                  Düzenle
                </Link>
              </div>
              <StatusActions id={o.id} status={o.status} />
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
