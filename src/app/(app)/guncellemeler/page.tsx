import { requireUser } from "@/lib/auth";
import { refreshRuns } from "@/lib/queries";

export default async function RefreshLogPage() {
  await requireUser();
  const runs = await refreshRuns();
  const fmt = new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Istanbul" });

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-semibold">Otomatik güncelleme geçmişi</h1>
        <p className="text-sm text-muted">
          GitHub Actions her 3 günde bir çalışır: süresi dolanları kapatır, açılış tarihi gelenleri açar, linkleri kontrol eder ve
          AI ile yeni fırsat arayıp onaya gönderir.
        </p>
      </div>
      {runs.length === 0 ? (
        <p className="card p-8 text-center text-sm text-muted">Henüz çalışma kaydı yok.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {runs.map((r) => (
            <details key={r.id} className="card p-4">
              <summary className="flex cursor-pointer flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                <span className={r.ok ? "text-accent" : r.ok === false ? "text-danger" : "text-muted"}>
                  {r.ok ? "✓ Başarılı" : r.ok === false ? "✗ Hatalı" : "… Sürüyor"}
                </span>
                <span className="font-medium">{fmt.format(r.started_at)}</span>
                <span className="text-muted">
                  {r.closed} kapandı · {r.opened} açıldı · {r.broken} kırık link · {r.suggested} yeni öneri
                </span>
              </summary>
              <pre className="mt-3 max-h-80 overflow-auto rounded-lg bg-surface-2 p-3 font-mono text-xs whitespace-pre-wrap">{r.log || "—"}</pre>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}
