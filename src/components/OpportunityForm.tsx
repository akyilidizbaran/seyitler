"use client";

import { startTransition, useActionState } from "react";
import { saveOpportunity } from "@/lib/actions";
import { WORK_MODES, type Opportunity } from "@/lib/types";
import { CategoryOptions } from "./CategoryOptions";

export function OpportunityForm({ opp }: { opp?: Opportunity }) {
  const [state, action, pending] = useActionState(saveOpportunity, undefined);

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
      {opp && <input type="hidden" name="id" value={opp.id} />}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Başlık / program adı *" name="title" defaultValue={opp?.title} required className="sm:col-span-2" />
        <Field label="Kurum *" name="organization" defaultValue={opp?.organization} required />
        <div>
          <label className="label" htmlFor="category">
            Kategori *
          </label>
          <select id="category" name="category" defaultValue={opp?.category ?? "staj"} className="input">
            <CategoryOptions />
          </select>
        </div>
      </div>

      <fieldset className="grid gap-4 sm:grid-cols-3">
        <Field label="Son başvuru tarihi" name="deadline" type="date" defaultValue={opp?.deadline ?? ""} />
        <Field label="Başvuru açılış tarihi (henüz açılmadıysa)" name="opens_at" type="date" defaultValue={opp?.opens_at ?? ""} />
        <Field label="Tarih notu" name="deadline_note" defaultValue={opp?.deadline_note ?? ""} placeholder="Örn. rolling, kontenjan dolunca kapanır" />
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Şehir / konum" name="location" defaultValue={opp?.location ?? ""} placeholder="Ankara, Münih, Online…" />
        <Field label='Ülke (tamamen online ise "Online")' name="country" defaultValue={opp?.country ?? "Türkiye"} />
        <div>
          <label className="label" htmlFor="work_mode">
            Çalışma şekli
          </label>
          <select id="work_mode" name="work_mode" defaultValue={opp?.work_mode ?? "bilinmiyor"} className="input">
            {Object.entries(WORK_MODES).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Başvuru linki" name="apply_url" type="text" defaultValue={opp?.apply_url ?? ""} placeholder="https://… veya mailto:…" />
        <Field label="Kaynak / resmi duyuru linki" name="source_url" type="text" defaultValue={opp?.source_url ?? ""} placeholder="https://…" />
      </div>

      <Area label="Açıklama" name="description" defaultValue={opp?.description} placeholder="Ne sunuyor, rol/program içeriği…" />
      <Area label="Kimler başvurabilir?" name="eligibility" defaultValue={opp?.eligibility} placeholder="Sınıf, ortalama, dil şartı…" />
      <Field label="Etiketler (virgülle)" name="tags" defaultValue={opp?.tags.join(", ") ?? ""} placeholder="llm, ankara, ücretli" />

      {state?.error && (
        <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger" role="alert">
          {state.error}
        </p>
      )}
      <div className="flex gap-2">
        <button className="btn-primary" disabled={pending}>
          {pending ? "Kaydediliyor…" : opp ? "Değişiklikleri kaydet" : "Fırsatı ekle"}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  name,
  className,
  ...rest
}: { label: string; name: string; className?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className={className}>
      <label className="label" htmlFor={name}>
        {label}
      </label>
      <input id={name} name={name} className="input" {...rest} />
    </div>
  );
}

function Area({ label, name, defaultValue, placeholder }: { label: string; name: string; defaultValue?: string | null; placeholder?: string }) {
  return (
    <div>
      <label className="label" htmlFor={name}>
        {label}
      </label>
      <textarea id={name} name={name} rows={4} defaultValue={defaultValue ?? ""} placeholder={placeholder} className="input" />
    </div>
  );
}
