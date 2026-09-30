import Link from "next/link";
import { userTracking } from "@/lib/queries";
import { TRACK_STATUSES, formatDate, type Profile, type TrackStatus } from "@/lib/types";
import { OpportunityCard } from "./OpportunityCard";

/**
 * Kişisel sayfa: profil + takip listesi + notlar.
 * `mode="owner"` → kendi sayfası (düzenlenebilir); `mode="admin"` → admin başkasının sayfasını salt okunur görür.
 * Erişim kontrolü çağıran sayfada yapılır.
 */
export async function PersonalPage({ profile, mode }: { profile: Profile; mode: "owner" | "admin" }) {
  const items = await userTracking(profile.id);
  const groups = (Object.keys(TRACK_STATUSES) as TrackStatus[])
    .map((s) => ({ status: s, items: items.filter((r) => r.my_status === s) }))
    .filter((g) => g.items.length > 0);
  const links = [
    { label: "CV", url: profile.cv_url },
    { label: "GitHub", url: profile.github_url },
    { label: "LinkedIn", url: profile.linkedin_url },
    { label: "Web", url: profile.website_url },
  ].filter((l): l is { label: string; url: string } => !!l.url);
  const owner = mode === "owner";

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold">
            {profile.display_name}
            {profile.is_admin && <span className="chip bg-accent-soft text-accent">admin</span>}
          </h1>
          <p className="text-sm text-muted">
            @{profile.username}
            {mode === "admin" && <> · Son görülme: {formatDate(profile.last_seen_at)}</>}
          </p>
        </div>
        {owner && (
          <div className="flex gap-2">
            <Link href="/sayfam/duzenle" className="btn-ghost">
              Profilimi düzenle
            </Link>
            <Link href="/sayfam/sifre" className="btn-ghost">
              Şifre değiştir
            </Link>
          </div>
        )}
      </header>

      <p className="rounded-lg bg-surface-2 px-3 py-2 text-xs text-muted">
        {owner
          ? "Bu sayfayı sadece sen ve site admini görebilir. Diğer kullanıcılar göremez."
          : "Admin görünümü: bu sayfa salt okunurdur; kullanıcının takibini ve notlarını değiştiremezsin."}
      </p>

      <section className="grid gap-4 md:grid-cols-2">
        <InfoBlock title="Hakkında" text={profile.bio} empty={owner ? "Kendini kısaca tanıt: bölüm, ilgi alanları, deneyim…" : "—"} />
        <InfoBlock
          title="Hedefler"
          text={profile.goals}
          empty={owner ? "Örn. Almanya'da AI yüksek lisansı, Ankara'da uzun dönem staj…" : "—"}
        />
        {(profile.interests.length > 0 || links.length > 0) && (
          <div className="card flex flex-col gap-3 p-4 md:col-span-2">
            {profile.interests.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {profile.interests.map((t) => (
                  <Link key={t} href={`/firsatlar?q=${encodeURIComponent(t)}`} className="chip bg-surface-2 text-muted hover:text-text">
                    #{t}
                  </Link>
                ))}
              </div>
            )}
            {links.length > 0 && (
              <div className="flex flex-wrap gap-3 text-sm">
                {links.map((l) => (
                  <a key={l.label} href={l.url} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
                    {l.label} ↗
                  </a>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(Object.keys(TRACK_STATUSES) as TrackStatus[]).map((s) => (
          <a key={s} href={`#${s}`} className="card p-4 transition hover:border-accent">
            <div className="text-2xl font-semibold tabular-nums">{items.filter((i) => i.my_status === s).length}</div>
            <div className="text-sm text-muted">{TRACK_STATUSES[s]}</div>
          </a>
        ))}
      </section>

      {groups.length === 0 && (
        <p className="card p-8 text-center text-sm text-muted">
          {owner ? (
            <>
              Henüz bir fırsat işaretlemedin.{" "}
              <Link href="/firsatlar" className="text-accent hover:underline">
                Fırsatlara göz at
              </Link>
            </>
          ) : (
            "Bu kullanıcı henüz bir fırsat işaretlememiş."
          )}
        </p>
      )}

      {groups.map((g) => (
        <section key={g.status} id={g.status} className="scroll-mt-24">
          <h2 className="mb-3 text-lg font-semibold">
            {TRACK_STATUSES[g.status]} <span className="text-sm font-normal text-muted">({g.items.length})</span>
          </h2>
          <div className="grid gap-3 md:grid-cols-2">
            {g.items.map((o) => (
              <div key={o.id} className="flex flex-col gap-1">
                <OpportunityCard opp={o} showTrack={owner} />
                {o.my_note && <p className="px-2 text-xs whitespace-pre-line text-muted">📝 {o.my_note}</p>}
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function InfoBlock({ title, text, empty }: { title: string; text: string | null; empty: string }) {
  return (
    <div className="card p-4">
      <h2 className="mb-1 text-sm font-semibold">{title}</h2>
      <p className={`text-sm leading-relaxed whitespace-pre-line ${text ? "" : "text-muted"}`}>{text || empty}</p>
    </div>
  );
}
