import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { listUsersWithStats } from "@/lib/queries";
import { formatDate } from "@/lib/types";

export default async function PeoplePage() {
  await requireAdmin();
  const users = await listUsersWithStats();

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-semibold">Kişiler</h1>
        <p className="text-sm text-muted">Sadece admin görür. Kişisel sayfalar salt okunur açılır.</p>
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="border-b border-border text-left text-xs text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Kişi</th>
              <th className="px-3 py-3 text-right font-medium">İlgileniyor</th>
              <th className="px-3 py-3 text-right font-medium">Başvurdu</th>
              <th className="px-3 py-3 text-right font-medium">Sonuçlandı</th>
              <th className="px-3 py-3 text-right font-medium" title="İlgilendiği ve 14 gün içinde kapanan açık fırsatlar">
                Yaklaşan
              </th>
              <th className="px-4 py-3 font-medium">Son görülme</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-border last:border-0 hover:bg-surface-2">
                <td className="px-4 py-3">
                  <Link href={`/kisiler/${u.username}`} className="font-medium hover:text-accent">
                    {u.display_name}
                  </Link>
                  <span className="ml-2 text-xs text-muted">@{u.username}</span>
                </td>
                <td className="px-3 py-3 text-right tabular-nums">{u.interested}</td>
                <td className="px-3 py-3 text-right tabular-nums">{u.applied}</td>
                <td className="px-3 py-3 text-right tabular-nums">{u.done}</td>
                <td className={`px-3 py-3 text-right tabular-nums ${u.upcoming_deadlines ? "font-semibold text-warn" : ""}`}>
                  {u.upcoming_deadlines}
                </td>
                <td className="px-4 py-3 text-muted">{formatDate(u.last_seen_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
