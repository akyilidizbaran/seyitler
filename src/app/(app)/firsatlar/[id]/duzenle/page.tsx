import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getOpportunity } from "@/lib/queries";
import { OpportunityForm } from "@/components/OpportunityForm";

export default async function EditOpportunityPage(props: PageProps<"/firsatlar/[id]/duzenle">) {
  const user = await requireUser();
  const id = Number((await props.params).id);
  if (!Number.isInteger(id)) notFound();
  const opp = await getOpportunity(id, user.id);
  if (!opp) notFound();

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <Link href={`/firsatlar/${id}`} className="text-sm text-muted hover:text-text">
        ← {opp.title}
      </Link>
      <h1 className="text-2xl font-semibold">Fırsatı düzenle</h1>
      <div className="card p-5">
        <OpportunityForm opp={opp} />
      </div>
    </div>
  );
}
