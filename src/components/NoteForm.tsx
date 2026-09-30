"use client";

import { startTransition, useActionState } from "react";
import { saveNote } from "@/lib/actions";

export function NoteForm({ id, note }: { id: number; note: string | null | undefined }) {
  const [state, action, pending] = useActionState(saveNote.bind(null, id), undefined);
  return (
    <form
      // JS yüklenmeden gönderilirse alanlar URL'ye (GET) düşmesin.
      method="post"
      // action={...} yerine onSubmit: React 19 başarısız gönderimden sonra formu sıfırlamasın.
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        startTransition(() => action(data));
      }}
      className="flex flex-col gap-2"
    >
      <label htmlFor="note" className="label">
        Kişisel notum (sadece sen ve admin görebilir)
      </label>
      <textarea
        id="note"
        name="note"
        rows={3}
        defaultValue={note ?? ""}
        placeholder="Örn. CV'yi güncelle, referans mektubu iste, mülakat 12 Ekim…"
        className="input"
      />
      <div className="flex items-center gap-3">
        <button className="btn-ghost" disabled={pending}>
          {pending ? "Kaydediliyor…" : "Notu kaydet"}
        </button>
        {state?.ok && !pending && <span className="text-xs text-accent">Kaydedildi</span>}
      </div>
    </form>
  );
}
