// Var olan fırsatlara toplu düzeltme uygular (tarama sonrası değişen tarih, kapanan ilan, yeni link vb.).
// Kullanım: npm run db:update -- dosya.json [--by kullanici_adi]
//   dosya.json: [{ "id": 12, "fixes": { "deadline": "2026-10-07", "deadline_note": "…" }, "reason": "…" }, …]
//   --by: sitede "Son düzenleyen" olarak görünecek kullanıcı adı (varsayılan "admin").
// "status" verilmezse durum yeni tarihlere göre yeniden hesaplanır (onay bekleyen/reddedilen kayıtlar korunur).
import { readFileSync } from "node:fs";
import { connect, statusFor, todayIstanbul } from "./_db";

const EDITABLE = new Set([
  "title", "organization", "category", "location", "work_mode", "country", "deadline", "opens_at", "deadline_note",
  "apply_url", "source_url", "description", "eligibility", "tags", "status",
]);

type Update = { id: number; fixes: Record<string, unknown>; reason?: string };

const args = process.argv.slice(2);
const byIndex = args.indexOf("--by");
const by = byIndex >= 0 ? args[byIndex + 1] : "admin";
const file = args.find((a, i) => !a.startsWith("--") && i !== byIndex + 1);
if (!file || !by || !/^[a-z0-9._-]{2,32}$/.test(by)) {
  console.error("Kullanım: npm run db:update -- dosya.json [--by kullanici_adi]");
  process.exit(1);
}

const updates: Update[] = JSON.parse(readFileSync(file, "utf8"));
const sql = connect();
let applied = 0;

for (const u of updates) {
  const fields = Object.fromEntries(Object.entries(u.fixes).filter(([k]) => EDITABLE.has(k)));
  const skipped = Object.keys(u.fixes).filter((k) => !EDITABLE.has(k));
  if (skipped.length) console.warn(`! #${u.id}: düzenlenemeyen alanlar atlandı: ${skipped.join(", ")}`);

  const [current] = await sql<{ status: string; deadline: string | null; opens_at: string | null; title: string }[]>`
    select status, deadline, opens_at, title from opportunities where id = ${u.id}
  `;
  if (!current) {
    console.error(`✗ #${u.id} bulunamadı`);
    continue;
  }
  if (!("status" in fields) && current.status !== "pending" && current.status !== "rejected") {
    const deadline = ("deadline" in fields ? fields.deadline : current.deadline) as string | null;
    const opensAt = ("opens_at" in fields ? fields.opens_at : current.opens_at) as string | null;
    fields.status = statusFor(deadline, opensAt);
  }
  await sql`
    update opportunities set ${sql(fields)}, verified_at = ${todayIstanbul()}, updated_by = ${by}, updated_at = now()
    where id = ${u.id}
  `;
  applied++;
  console.log(`✓ #${u.id} ${current.title.slice(0, 60)} → ${Object.keys(fields).join(", ")}`);
}
console.log(`\n${applied}/${updates.length} kayıt güncellendi (düzenleyen: ${by}).`);
await sql.end();
