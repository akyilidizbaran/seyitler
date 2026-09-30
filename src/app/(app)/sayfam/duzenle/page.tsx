import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getProfile } from "@/lib/queries";
import { ProfileForm } from "@/components/ProfileForm";

export default async function EditMyPage() {
  const user = await requireUser();
  const profile = await getProfile(user.username);
  if (!profile) notFound();
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <Link href="/sayfam" className="text-sm text-muted hover:text-text">
        ← Sayfam
      </Link>
      <h1 className="text-2xl font-semibold">Profilimi düzenle</h1>
      <p className="text-sm text-muted">Kullanıcı adın (@{profile.username}) ve şifren değişmez. Bu bilgileri sadece sen ve admin görür.</p>
      <div className="card p-5">
        <ProfileForm profile={profile} />
      </div>
    </div>
  );
}
