import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { getProfile } from "@/lib/queries";
import { PersonalPage } from "@/components/PersonalPage";

export default async function PersonPage(props: PageProps<"/kisiler/[username]">) {
  const admin = await requireAdmin();
  const { username } = await props.params;
  if (username === admin.username) redirect("/sayfam");
  const profile = await getProfile(username);
  if (!profile) notFound();
  return (
    <div className="flex flex-col gap-4">
      <Link href="/kisiler" className="text-sm text-muted hover:text-text">
        ← Kişiler
      </Link>
      <PersonalPage profile={profile} mode="admin" />
    </div>
  );
}
