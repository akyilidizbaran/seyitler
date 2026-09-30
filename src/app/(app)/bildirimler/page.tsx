import { requireUser } from "@/lib/auth";
import { unreadNotifications } from "@/lib/queries";
import type { Opportunity } from "@/lib/types";
import { OpportunityCard } from "@/components/OpportunityCard";
import { MarkAllReadButton, MarkReadButton } from "@/components/NotificationActions";

export default async function NotificationsPage() {
  const user = await requireUser();
  const [deadline, fresh] = await Promise.all([unreadNotifications(user.id, "deadline"), unreadNotifications(user.id, "new")]);
  const total = deadline.length + fresh.length;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Bildirimler</h1>
          <p className="text-sm text-muted">
            {total ? `${total} okunmamış bildirim` : "Okunmamış bildirim yok"} · &quot;Okudum&quot; dediğin bildirim kapanır.
          </p>
        </div>
        {total > 0 && <MarkAllReadButton />}
      </div>

      <Section
        title="⏰ 7 gün içinde kapananlar"
        hint="Başvurdum / Sonuçlandı / Geçtim olarak işaretlediğinde de buradan kalkar."
        empty="Yakın son tarih yok."
        items={deadline}
        kind="deadline"
      />
      <Section title="✨ Yeni eklenenler" hint="Hesabın açıldıktan sonra eklenen fırsatlar." empty="Yeni fırsat yok." items={fresh} kind="new" />
    </div>
  );
}

function Section({
  title,
  hint,
  empty,
  items,
  kind,
}: {
  title: string;
  hint: string;
  empty: string;
  items: Opportunity[];
  kind: "deadline" | "new";
}) {
  return (
    <section>
      <h2 className="mb-1 text-lg font-semibold">
        {title} {items.length > 0 && <span className="text-sm font-normal text-muted">({items.length})</span>}
      </h2>
      <p className="mb-3 text-xs text-muted">{hint}</p>
      {items.length === 0 ? (
        <p className="card p-6 text-center text-sm text-muted">{empty}</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {items.map((o) => (
            <div key={o.id} className="flex flex-col gap-1.5">
              <OpportunityCard opp={o} />
              <MarkReadButton id={o.id} kind={kind} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
