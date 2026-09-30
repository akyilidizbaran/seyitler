import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { logout } from "@/lib/actions";
import { sql } from "@/lib/db";
import { markSeen, notificationCount, openAdminNoteCount } from "@/lib/queries";
import { NavLinks } from "@/components/NavLinks";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await requireUser();
  const [notif, , [pending], openNotes] = await Promise.all([
    notificationCount(user.id),
    markSeen(user.id).then(() => undefined),
    sql<{ n: number }[]>`select count(*)::int as n from opportunities where status = 'pending'`,
    user.is_admin ? openAdminNoteCount() : Promise.resolve(0),
  ]);

  return (
    <>
      <header className="sticky top-0 z-10 border-b border-border bg-surface/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:gap-6">
          <div className="flex items-center justify-between gap-4">
            <Link href="/" className="flex items-center gap-2 font-semibold">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/icon.svg" alt="" width={24} height={24} />
              Fırsat Radarı
            </Link>
            <div className="flex items-center gap-3 sm:hidden">
              <UserMenu name={user.display_name} />
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <NavLinks
              items={[
                { href: "/", label: "Panel" },
                { href: "/firsatlar", label: "Fırsatlar" },
                { href: "/sayfam", label: "Sayfam" },
                { href: "/onay", label: "Onay", badge: pending.n },
                { href: "/bildirimler", label: "Bildirimler", badge: notif },
                { href: "/admine-not", label: user.is_admin ? "Notlar" : "Admine not", badge: openNotes },
                ...(user.is_admin ? [{ href: "/kisiler", label: "Kişiler" }] : []),
              ]}
            />
          </div>
          <div className="hidden items-center gap-3 sm:flex">
            <Link href="/firsatlar/yeni" className="btn-primary">
              + Fırsat ekle
            </Link>
            <UserMenu name={user.display_name} />
          </div>
        </div>
      </header>
      {!user.password_changed_at && (
        <div className="border-b border-warn/30 bg-warn-soft">
          <p className="mx-auto max-w-6xl px-4 py-2 text-sm text-warn">
            Hâlâ ilk verilen şifreyi kullanıyorsun.{" "}
            <Link href="/sayfam/sifre" className="font-medium underline underline-offset-2">
              Şifreni değiştir
            </Link>
          </p>
        </div>
      )}
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-6 pb-24 sm:pb-6">{children}</main>
      <Link href="/firsatlar/yeni" className="btn-primary fixed right-4 bottom-4 rounded-full px-4 py-3 shadow-lg sm:hidden">
        + Ekle
      </Link>
      <footer className="border-t border-border py-4 text-center text-xs text-muted">
        Açık kaynak ·{" "}
        <Link href="/guncellemeler" className="hover:text-text">
          Otomatik güncelleme geçmişi
        </Link>
      </footer>
    </>
  );
}

function UserMenu({ name }: { name: string }) {
  return (
    <form action={logout} className="flex items-center gap-2 text-sm">
      <Link href="/sayfam" className="text-muted hover:text-text">
        {name}
      </Link>
      <button className="text-muted underline-offset-2 hover:text-text hover:underline">Çıkış</button>
    </form>
  );
}
