import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { PasswordForm } from "@/components/PasswordForm";

export default async function ChangePasswordPage() {
  const user = await requireUser();
  return (
    <div className="mx-auto flex max-w-md flex-col gap-4">
      <Link href="/sayfam" className="text-sm text-muted hover:text-text">
        ← Sayfam
      </Link>
      <h1 className="text-2xl font-semibold">Şifre değiştir</h1>
      {!user.password_changed_at && (
        <p className="rounded-lg bg-warn-soft px-3 py-2 text-sm text-warn">
          Hâlâ yöneticinin verdiği ilk şifreyi kullanıyorsun. Site internete açık; tahmin edilemeyecek bir şifre seç.
        </p>
      )}
      <div className="card p-5">
        <PasswordForm />
      </div>
    </div>
  );
}
