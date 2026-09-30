import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getProfile } from "@/lib/queries";
import { PersonalPage } from "@/components/PersonalPage";

export default async function MyPage() {
  const user = await requireUser();
  const profile = await getProfile(user.username);
  if (!profile) notFound();
  return <PersonalPage profile={profile} mode="owner" />;
}
