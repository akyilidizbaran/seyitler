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
  const items = await listOpportunities(user.id, filters);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">Fırsatlar</h1>
          <p className="text-sm text-muted">{items.length} sonuç · son tarihe göre sıralı</p>
        </div>
      </div>

      <form className="card grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr_1fr_auto]">
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
          <Link href="/firsatlar" className="btn-ghost">
            Sıfırla
          </Link>
        </div>
      </form>

      {items.length === 0 ? (
        <p className="card p-8 text-center text-sm text-muted">
          Bu filtrelere uyan fırsat yok.{" "}
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
