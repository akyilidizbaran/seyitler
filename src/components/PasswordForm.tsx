"use client";

import { startTransition, useActionState, useEffect, useRef } from "react";
import { changePassword } from "@/lib/actions";

export function PasswordForm() {
  const [state, action, pending] = useActionState(changePassword, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  // Başarılı değişiklikten sonra şifre alanlarını temizle.
  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form
      // JS yüklenmeden gönderilirse alanlar URL'ye (GET) düşmesin.
      method="post"
      ref={formRef}
      // action={...} yerine onSubmit: React 19 başarısız gönderimden sonra formu sıfırlamasın.
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        startTransition(async () => {
          await action(data);
        });
      }}
      className="flex flex-col gap-4"
    >
      {[
        { name: "current", label: "Mevcut şifre", autoComplete: "current-password" },
        { name: "next", label: "Yeni şifre (en az 8 karakter)", autoComplete: "new-password" },
        { name: "repeat", label: "Yeni şifre (tekrar)", autoComplete: "new-password" },
      ].map((f) => (
        <div key={f.name}>
          <label className="label" htmlFor={f.name}>
            {f.label}
          </label>
          <input id={f.name} name={f.name} type="password" autoComplete={f.autoComplete} className="input" required />
        </div>
      ))}
      {state?.error && (
        <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger" role="alert">
          {state.error}
        </p>
      )}
      {state?.ok && !pending && (
        <p className="rounded-lg bg-accent-soft px-3 py-2 text-sm text-accent" role="status">
          Şifren değiştirildi.
        </p>
      )}
      <div>
        <button className="btn-primary" disabled={pending}>
          {pending ? "Kaydediliyor…" : "Şifreyi değiştir"}
        </button>
      </div>
    </form>
  );
}
