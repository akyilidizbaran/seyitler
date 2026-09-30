import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { listOpportunities } from "@/lib/queries";
import { REGIONS, TRACK_STATUSES } from "@/lib/types";
import { CategoryOptions } from "@/components/CategoryOptions";
import { OpportunityCard } from "@/components/OpportunityCard";

const STATUS_FILTERS = {
  acik: "Açık + yakında",
  active: "Sadece açık",
  upcoming: "Yakında açılacak",
  closed: "Kapananlar (arşiv)",
} as const;

// Son tarihi olmayan (rolling / tarihi açıklanmamış) ilanlar tarihe göre sıralı listede en alta düşüp gözden kaçıyordu;
// bu yüzden ayrı sekmede gösteriliyorlar.
const TABS = {
  tarihli: "Son tarihli",
  tarihsiz: "Tarihsiz / rolling",
} as const;
type Tab = keyof typeof TABS;

export default async function OpportunitiesPage(props: PageProps<"/firsatlar">) {
  const user = await requireUser();
  const sp = await props.searchParams;
  const str = (v: string | string[] | undefined) => (typeof v === "string" ? v : "");
  const filters = {
    category: str(sp.kategori),
    region: str(sp.bolge),
    status: str(sp.durum) || "acik",
    q: str(sp.q),
    track: str(sp.takip),
  };
  const tab: Tab = str(sp.sekme) === "tarihsiz" ? "tarihsiz" : "tarihli";
  const all = await listOpportunities(user.id, filters);
  const dated = all.filter((o) => o.deadline);
  // Tarihsizlerde önce yakında açılacaklar (açılış tarihine göre), sonra en son güncellenenler.
  const undated = all
    .filter((o) => !o.deadline)
    .sort(
      (a, b) =>
        (a.opens_at ?? "9999").localeCompare(b.opens_at ?? "9999") ||
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
    );
  const items = tab === "tarihli" ? dated : undated;

  // Sekme linkleri mevcut filtreleri korur.
  const tabHref = (t: Tab) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries({ q: filters.q, kategori: filters.category, bolge: filters.region, takip: filters.track })) {
      if (v) params.set(k, v);
    }
    if (filters.status !== "acik") params.set("durum", filters.status);
    if (t !== "tarihli") params.set("sekme", t);
    const qs = params.toString();
    return `/firsatlar${qs ? `?${qs}` : ""}`;
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">Fırsatlar</h1>
          <p className="text-sm text-muted">
            {all.length} sonuç ·{" "}
            {tab === "tarihli" ? "son tarihe göre sıralı, en acil üstte" : "önce yakında açılacaklar, sonra son güncellenenler"}
          </p>
        </div>
      </div>

      <form className="card grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr_1fr_auto]">
        {tab !== "tarihli" && <input type="hidden" name="sekme" value={tab} />}
        <div>
          <label className="label" htmlFor="q">
            Ara
          </label>
          <input id="q" name="q" defaultValue={filters.q} placeholder="Kurum, başlık, etiket…" className="input" />
        </div>
        <div>
          <label className="label" htmlFor="kategori">
            Kategori
          </label>
          <select id="kategori" name="kategori" defaultValue={filters.category} className="input">
            <option value="">Tümü</option>
            <CategoryOptions />
          </select>
        </div>
        <div>
          <label className="label" htmlFor="bolge">
            Bölge
          </label>
          <select id="bolge" name="bolge" defaultValue={filters.region} className="input">
            <option value="">Hepsi</option>
            {Object.entries(REGIONS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="durum">
            Durum
          </label>
          <select id="durum" name="durum" defaultValue={filters.status} className="input">
            {Object.entries(STATUS_FILTERS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="takip">
            Takibim
          </label>
          <select id="takip" name="takip" defaultValue={filters.track} className="input">
            <option value="">Hepsi</option>
            <option value="none">İşaretlemediklerim</option>
            {Object.entries(TRACK_STATUSES).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-end gap-2">
          <button className="btn-primary w-full">Filtrele</button>
          <Link href={tab === "tarihli" ? "/firsatlar" : `/firsatlar?sekme=${tab}`} className="btn-ghost">
            Sıfırla
          </Link>
        </div>
      </form>

      <nav className="flex gap-1 border-b border-border" aria-label="Son tarih durumu">
        {(Object.keys(TABS) as Tab[]).map((t) => {
          const count = t === "tarihli" ? dated.length : undated.length;
          const active = t === tab;
          return (
            <Link
              key={t}
              href={tabHref(t)}
              aria-current={active ? "page" : undefined}
              className={`-mb-px flex items-center gap-2 border-b-2 px-3 py-2 text-sm font-medium transition ${
                active ? "border-accent text-text" : "border-transparent text-muted hover:text-text"
              }`}
            >
              {TABS[t]}
              <span className="rounded-full bg-surface-2 px-2 text-xs tabular-nums text-muted">{count}</span>
            </Link>
          );
        })}
      </nav>

      {items.length === 0 ? (
        <p className="card p-8 text-center text-sm text-muted">
          {tab === "tarihli" ? "Bu filtrelere uyan son tarihli fırsat yok." : "Bu filtrelere uyan tarihsiz fırsat yok."}{" "}
          <Link href="/firsatlar/yeni" className="text-accent hover:underline">
            Yeni fırsat ekle
          </Link>
        </p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {items.map((o) => (
            <OpportunityCard key={o.id} opp={o} />
          ))}
        </div>
      )}
    </div>
  );
}
