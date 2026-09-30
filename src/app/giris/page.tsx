import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { LoginForm } from "./LoginForm";

export default async function LoginPage(props: PageProps<"/giris">) {
  if (await getUser()) redirect("/");
  const { next } = await props.searchParams;

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon.svg" alt="" width={48} height={48} />
          <h1 className="text-2xl font-semibold">Fırsat Radarı</h1>
          <p className="text-sm text-muted">
            Yapay zekâ ve veri mühendisliği için yüksek lisans, burs, staj ve aday mühendislik fırsatları.
          </p>
        </div>
        <div className="card p-6">
          <LoginForm next={typeof next === "string" ? next : "/"} />
        </div>
        <p className="mt-4 text-center text-xs text-muted">Hesaplar yönetici tarafından tanımlanır; kayıt yoktur.</p>
      </div>
    </main>
  );
}
