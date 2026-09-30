import { requireUser } from "@/lib/auth";
import { getLastSeen, markSeen, newSince, urgentOpportunities } from "@/lib/queries";
import { formatDate } from "@/lib/types";
import { OpportunityCard } from "@/components/OpportunityCard";

export default async function NotificationsPage() {
  const user = await requireUser();
  const lastSeen = await getLastSeen(user.id);
  const [urgent, fresh] = await Promise.all([urgentOpportunities(user.id, 7), newSince(user.id, lastSeen)]);
  // Bu sayfayı açmak "yeni eklenenler"i okundu sayar; yaklaşan son tarihler ise işaretlenene kadar kalır.
  await markSeen(user.id);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold">Bildirimler</h1>
        <p className="text-sm text-muted">Son ziyaretin: {formatDate(lastSeen)}</p>
      </div>

      <section>
        <h2 className="mb-1 text-lg font-semibold">⏰ 7 gün içinde kapananlar</h2>
        <p className="mb-3 text-xs text-muted">
          &quot;Başvurdum&quot;, &quot;Sonuçlandı&quot; veya &quot;Geçtim&quot; olarak işaretlediğinde buradan kalkar.
        </p>
        {urgent.length === 0 ? (
          <p className="card p-6 text-center text-sm text-muted">Yakın son tarih yok.</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {urgent.map((o) => (
              <OpportunityCard key={o.id} opp={o} />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">✨ Son ziyaretinden beri eklenenler</h2>
        {fresh.length === 0 ? (
          <p className="card p-6 text-center text-sm text-muted">Yeni kayıt yok.</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {fresh.map((o) => (
              <OpportunityCard key={o.id} opp={o} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
