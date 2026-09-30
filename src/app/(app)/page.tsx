import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { dashboardStats, unreadNotifications, urgentOpportunities } from "@/lib/queries";
import { CATEGORIES, CATEGORY_GROUPS, TRACK_STATUSES, formatDate, type TrackStatus } from "@/lib/types";
import { OpportunityCard } from "@/components/OpportunityCard";

export default async function Dashboard() {
  const user = await requireUser();
  const [stats, urgent, fresh] = await Promise.all([
    dashboardStats(user.id),
    urgentOpportunities(user.id, 14),
    unreadNotifications(user.id, "new"),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Merhaba {user.display_name} 👋</h1>
        <p className="text-sm text-muted">
          {stats.counts.open} açık fırsat
          {stats.counts.pending > 0 && (
            <>
              {" · "}
              <Link href="/onay" className="text-warn hover:underline">
                {stats.counts.pending} öneri onay bekliyor
              </Link>
            </>
          )}
          {stats.lastRun?.finished_at && <> · Son otomatik tarama: {formatDate(stats.lastRun.finished_at)}</>}
        </p>
      </section>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(Object.keys(TRACK_STATUSES) as TrackStatus[]).map((s) => (
          <Link key={s} href={`/sayfam#${s}`} className="card p-4 transition hover:border-accent">
            <div className="text-2xl font-semibold tabular-nums">{stats.mine[s] ?? 0}</div>
            <div className="text-sm text-muted">{TRACK_STATUSES[s]}</div>
          </Link>
        ))}
      </section>

      <section>
        <SectionHeader title="Son tarihi yaklaşanlar" hint="14 gün içinde kapanan, henüz başvurmadıkların" href="/firsatlar" />
        {urgent.length === 0 ? (
          <Empty text="Önümüzdeki 14 günde kapanan açık fırsat yok." />
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {urgent.map((o) => (
              <OpportunityCard key={o.id} opp={o} />
            ))}
          </div>
        )}
      </section>

      {fresh.length > 0 && (
        <section>
          <SectionHeader title="Yeni eklenenler" hint={`${fresh.length} okunmamış · Bildirimler'den "Okudum" diyerek kapatabilirsin`} href="/bildirimler" />
          <div className="grid gap-3 md:grid-cols-2">
            {fresh.slice(0, 6).map((o) => (
              <OpportunityCard key={o.id} opp={o} />
            ))}
          </div>
        </section>
      )}

      <section>
        <SectionHeader title="Kategoriler" hint="Açık ve yakında açılacak fırsat sayıları" />
        <div className="grid gap-4 md:grid-cols-3">
          {CATEGORY_GROUPS.map((g) => (
            <div key={g.label} className="card p-4">
              <h3 className="mb-2 text-xs font-semibold tracking-wide text-muted uppercase">{g.label}</h3>
              <ul className="flex flex-col">
                {g.items.map((c) => {
                  const n = stats.byCategory.find((b) => b.category === c)?.n ?? 0;
                  return (
                    <li key={c}>
                      <Link
                        href={`/firsatlar?kategori=${c}`}
                        className="-mx-2 flex items-center justify-between rounded-lg px-2 py-1.5 text-sm hover:bg-surface-2"
                      >
                        <span className={n ? "" : "text-muted"}>{CATEGORIES[c]}</span>
                        <span className="text-xs tabular-nums text-muted">{n}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function SectionHeader({ title, hint, href }: { title: string; hint?: string; href?: string }) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-2">
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        {hint && <p className="text-xs text-muted">{hint}</p>}
      </div>
      {href && (
        <Link href={href} className="text-sm text-accent hover:underline">
          Tümü →
        </Link>
      )}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="card p-6 text-center text-sm text-muted">{text}</p>;
}
