import { requireUser } from "@/lib/auth";
import { listAdminNotes, type AdminNote } from "@/lib/queries";
import { AdminNoteForm } from "@/components/AdminNoteForm";
import { AdminNoteControls } from "@/components/AdminNoteControls";

const STATUS: Record<AdminNote["status"], { label: string; tone: string }> = {
  open: { label: "Bekliyor", tone: "bg-warn-soft text-warn" },
  done: { label: "Yapıldı", tone: "bg-accent-soft text-accent" },
  wontfix: { label: "Yapılmayacak", tone: "bg-surface-2 text-muted" },
};

export default async function AdminNotesPage() {
  const user = await requireUser();
  const notes = await listAdminNotes(user.is_admin ? undefined : user.id);
  const open = notes.filter((n) => n.status === "open").length;
  const fmt = new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Istanbul" });

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">{user.is_admin ? "Admine gelen notlar" : "Admine not"}</h1>
        <p className="text-sm text-muted">
          {user.is_admin
            ? `${open} açık not. Kapattığında notu yazan kişi durumu ve cevabını görür.`
            : "Düzenlenmesini istediğin bir şey, bir hata ya da öneri varsa yaz. Notlarını sadece sen ve admin görür."}
        </p>
      </div>

      {!user.is_admin && (
        <div className="card p-5">
          <AdminNoteForm />
        </div>
      )}

      <section className="flex flex-col gap-3">
        {!user.is_admin && notes.length > 0 && <h2 className="text-lg font-semibold">Notların</h2>}
        {notes.length === 0 ? (
          <p className="card p-6 text-center text-sm text-muted">
            {user.is_admin ? "Henüz not yok." : "Henüz not göndermedin."}
          </p>
        ) : (
          notes.map((n) => (
            <article key={n.id} className="card flex flex-col gap-3 p-4">
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                <span className={`chip ${STATUS[n.status].tone}`}>{STATUS[n.status].label}</span>
                {user.is_admin && <span className="font-medium text-text">{n.display_name}</span>}
                <span>{fmt.format(n.created_at)}</span>
              </div>
              <p className="text-sm whitespace-pre-line">{n.body}</p>
              {n.admin_reply && !user.is_admin && (
                <p className="rounded-lg bg-surface-2 px-3 py-2 text-sm whitespace-pre-line">
                  <span className="font-medium">Admin:</span> {n.admin_reply}
                </p>
              )}
              {user.is_admin && <AdminNoteControls id={n.id} status={n.status} reply={n.admin_reply} />}
            </article>
          ))
        )}
      </section>
    </div>
  );
}
