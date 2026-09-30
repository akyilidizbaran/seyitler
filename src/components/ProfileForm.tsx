"use client";

import { startTransition, useActionState } from "react";
import { saveProfile } from "@/lib/actions";
import type { Profile } from "@/lib/types";

export function ProfileForm({ profile }: { profile: Profile }) {
  const [state, action, pending] = useActionState(saveProfile, undefined);

  return (
    <form
      // action={...} yerine onSubmit: React 19 başarısız gönderimden sonra formu sıfırlamasın.
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        startTransition(() => action(data));
      }}
      className="flex flex-col gap-5"
    >
      <Field label="Görünen ad" name="display_name" defaultValue={profile.display_name} required />
      <Area label="Hakkımda" name="bio" defaultValue={profile.bio} placeholder="Bölüm, ilgi alanları, deneyim, projeler…" />
      <Area
        label="Hedeflerim"
        name="goals"
        defaultValue={profile.goals}
        placeholder="Örn. Güz 2027'de Almanya'da AI yüksek lisansı; bu dönem Ankara'da uzun dönem staj…"
      />
      <Field
        label="İlgi alanları (virgülle)"
        name="interests"
        defaultValue={profile.interests.join(", ")}
        placeholder="llm, computer vision, veri mühendisliği"
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="CV linki" name="cv_url" defaultValue={profile.cv_url ?? ""} placeholder="https://…" />
        <Field label="GitHub" name="github_url" defaultValue={profile.github_url ?? ""} placeholder="https://github.com/…" />
        <Field label="LinkedIn" name="linkedin_url" defaultValue={profile.linkedin_url ?? ""} placeholder="https://linkedin.com/in/…" />
        <Field label="Kişisel site" name="website_url" defaultValue={profile.website_url ?? ""} placeholder="https://…" />
      </div>
      {state?.error && (
        <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger" role="alert">
          {state.error}
        </p>
      )}
      <div>
        <button className="btn-primary" disabled={pending}>
          {pending ? "Kaydediliyor…" : "Kaydet"}
        </button>
      </div>
    </form>
  );
}

function Field({ label, name, ...rest }: { label: string; name: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label className="label" htmlFor={name}>
        {label}
      </label>
      <input id={name} name={name} className="input" {...rest} />
    </div>
  );
}

function Area({ label, name, defaultValue, placeholder }: { label: string; name: string; defaultValue: string | null; placeholder: string }) {
  return (
    <div>
      <label className="label" htmlFor={name}>
        {label}
      </label>
      <textarea id={name} name={name} rows={4} defaultValue={defaultValue ?? ""} placeholder={placeholder} className="input" />
    </div>
  );
}
