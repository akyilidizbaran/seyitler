import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { OpportunityForm } from "@/components/OpportunityForm";

export default async function NewOpportunityPage() {
  await requireUser();
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <Link href="/firsatlar" className="text-sm text-muted hover:text-text">
        ← Fırsatlar
      </Link>
      <h1 className="text-2xl font-semibold">Yeni fırsat ekle</h1>
      <p className="text-sm text-muted">
        Eklediğin fırsat herkese hemen görünür. Tarih ve uygunluk bilgisini mümkünse resmi kaynaktan kontrol et.
      </p>
      <div className="card p-5">
        <OpportunityForm />
      </div>
    </div>
  );
}
