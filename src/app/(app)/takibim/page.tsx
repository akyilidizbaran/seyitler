import { redirect } from "next/navigation";

// Eski adres; takip listesi artık kişisel sayfada.
export default function Takibim() {
  redirect("/sayfam");
}
