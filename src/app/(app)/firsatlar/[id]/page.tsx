import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getOpportunity } from "@/lib/queries";
import { CATEGORIES, OPP_STATUSES, WORK_MODES, formatDate } from "@/lib/types";
import { DeadlineBadge } from "@/components/DeadlineBadge";
import { TrackButtons } from "@/components/TrackButtons";
import { StatusActions } from "@/components/StatusActions";
import { NoteForm } from "@/components/NoteForm";

export default async function OpportunityPage(props: PageProps<"/firsatlar/[id]">) {
  const user = await requireUser();
  const id = Number((await props.params).id);
  if (!Number.isInteger(id)) notFound();
  const opp = await getOpportunity(id, user.id);
  if (!opp) notFound();

  const rows: [string, React.ReactNode][] = [
    ["Kategori", CATEGORIES[opp.category]],
    ["Durum", OPP_STATUSES[opp.status]],
    ["Son başvuru", opp.deadline ? formatDate(opp.deadline) : "Belirtilmemiş / rolling"],
    ...(opp.opens_at ? ([["Başvuru açılışı", formatDate(opp.opens_at)]] as [string, string][]) : []),
    ["Konum", [opp.location, opp.country].filter(Boolean).join(", ") || "—"],
    ["Çalışma şekli", WORK_MODES[opp.work_mode]],
  ];

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <Link href="/firsatlar" className="text-sm text-muted hover:text-text">
        ← Fırsatlar
      </Link>

      {opp.status === "pending" && (
        <div className="rounded-xl border border-warn/40 bg-warn-soft p-4 text-sm">
          <p className="mb-3 font-medium text-warn">
            Bu kayıt otomatik taramayla bulundu ve henüz onaylanmadı. Resmi kaynaktan kontrol edip onaylayın veya reddedin.
          </p>
          <StatusActions id={opp.id} status={opp.status} />
        </div>
      )}

      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-1.5">
          <DeadlineBadge opp={opp} />
          {opp.link_status === "broken" && (
            <span className="chip bg-danger-soft text-danger">Son kontrolde link çalışmıyordu</span>
          )}
        </div>
        <h1 className="text-2xl leading-tight font-semibold">{opp.title}</h1>
        <p className="text-muted">{opp.organization}</p>
        <div className="flex flex-wrap gap-2">
          {opp.apply_url && (
            <a href={opp.apply_url} target="_blank" rel="noopener noreferrer" className="btn-primary">
              Başvuru sayfası ↗
            </a>
          )}
          {opp.source_url && opp.source_url !== opp.apply_url && (
            <a href={opp.source_url} target="_blank" rel="noopener noreferrer" className="btn-ghost">
              Kaynak ↗
            </a>
          )}
          <Link href={`/firsatlar/${opp.id}/duzenle`} className="btn-ghost">
            Düzenle
          </Link>
        </div>
      </header>

      <section className="card flex flex-col gap-4 p-4">
        <h2 className="text-sm font-semibold">Takibim</h2>
        <TrackButtons id={opp.id} status={opp.my_status} size="md" />
        <NoteForm id={opp.id} note={opp.my_note} />
      </section>

      <section className="card p-4">
        <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
          {rows.map(([k, v]) => (
            <div key={k}>
              <dt className="label">{k}</dt>
              <dd className="text-sm">{v}</dd>
            </div>
          ))}
        </dl>
        {opp.deadline_note && <p className="mt-4 rounded-lg bg-surface-2 p-3 text-sm">{opp.deadline_note}</p>}
      </section>

      {opp.description && <TextBlock title="Açıklama" text={opp.description} />}
      {opp.eligibility && <TextBlock title="Kimler başvurabilir?" text={opp.eligibility} />}

      {opp.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {opp.tags.map((t) => (
            <Link key={t} href={`/firsatlar?q=${encodeURIComponent(t)}`} className="chip bg-surface-2 text-muted hover:text-text">
              #{t}
            </Link>
          ))}
        </div>
      )}

      <footer className="flex flex-col gap-3 border-t border-border pt-4 text-xs text-muted">
        <p>
          Ekleyen: {opp.created_by === "ai" ? "otomatik tarama" : opp.created_by} · {formatDate(opp.created_at)}
          {opp.updated_by && <> · Son düzenleyen: {opp.updated_by === "ai" ? "otomatik tarama" : opp.updated_by}</>}
          {opp.verified_at && <> · Son doğrulama: {formatDate(opp.verified_at)}</>}
          {opp.link_checked_at && <> · Link kontrolü: {formatDate(opp.link_checked_at)}</>}
        </p>
        {opp.status !== "pending" && <StatusActions id={opp.id} status={opp.status} />}
      </footer>
    </div>
  );
}

function TextBlock({ title, text }: { title: string; text: string }) {
  return (
    <section>
      <h2 className="mb-1 text-sm font-semibold">{title}</h2>
      <p className="text-sm leading-relaxed whitespace-pre-line text-muted">{text}</p>
    </section>
  );
}
