"use client";

import { startTransition, useActionState, useEffect, useRef } from "react";
import { createAdminNote } from "@/lib/actions";

export function AdminNoteForm() {
  const [state, action, pending] = useActionState(createAdminNote, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  // Gönderim başarılıysa metin kutusunu temizle.
  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form
      ref={formRef}
      // JS yüklenmeden gönderilirse alanlar URL'ye (GET) düşmesin.
      method="post"
      // action={...} yerine onSubmit: React 19 başarısız gönderimden sonra formu sıfırlamasın.
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        startTransition(() => action(data));
      }}
      className="flex flex-col gap-3"
    >
      <label htmlFor="body" className="label">
        Admine notun
      </label>
      <textarea
        id="body"
        name="body"
        rows={4}
        maxLength={2000}
        required
        placeholder="Örn. 'Vodafone ilanının son tarihi değişmiş', 'Doktora kategorisine ELLIS eklenmeli', 'Filtrelerde şu olsa iyi olur'…"
        className="input"
      />
      {state?.error && (
        <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger" role="alert">
          {state.error}
        </p>
      )}
      {state?.ok && !pending && (
        <p className="rounded-lg bg-accent-soft px-3 py-2 text-sm text-accent" role="status">
          Notun admine iletildi.
        </p>
      )}
      <div>
        <button className="btn-primary" disabled={pending}>
          {pending ? "Gönderiliyor…" : "Gönder"}
        </button>
      </div>
    </form>
  );
}
