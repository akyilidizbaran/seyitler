// data/*.json içindeki fırsatları ekler. Aynı başvuru linki zaten varsa atlar; tekrar çalıştırmak güvenlidir.
// Kullanım: npm run db:seed [-- data/dosya.json] [--by kullanici_adi]
//   --by: sitede "Ekleyen" olarak görünecek kullanıcı adı (varsayılan "seed").
import { readFileSync } from "node:fs";
import { connect, statusFor, type SeedItem } from "./_db";

const args = process.argv.slice(2);
const byIndex = args.indexOf("--by");
const by = byIndex >= 0 ? args[byIndex + 1] : "seed";
if (!by || !/^[a-z0-9._-]{2,32}$/.test(by)) {
  console.error("--by geçerli bir kullanıcı adı olmalı.");
  process.exit(1);
}
const file = args.find((a, i) => !a.startsWith("--") && i !== byIndex + 1) ?? "data/seed.json";
const items: SeedItem[] = JSON.parse(readFileSync(file, "utf8"));
const sql = connect();

let added = 0;
for (const it of items) {
  // "closed" elle verildiyse koru (ör. ilan erken kapandı); diğerlerinde tarihe göre hesapla.
  const status = it.status === "closed" ? "closed" : statusFor(it.deadline, it.opens_at);
  const rows = await sql`
    insert into opportunities (title, organization, category, location, work_mode, country, deadline, opens_at,
      deadline_note, apply_url, source_url, description, eligibility, tags, status, verified_at, created_by)
    values (${it.title}, ${it.organization}, ${it.category}, ${it.location}, ${it.work_mode}, ${it.country},
      ${it.deadline}, ${it.opens_at}, ${it.deadline_note}, ${it.apply_url}, ${it.source_url}, ${it.description},
      ${it.eligibility}, ${it.tags}, ${status}, ${it.verified_at ?? null}, ${by})
    on conflict do nothing
    returning id
  `;
  added += rows.length;
}
console.log(`✓ ${file}: ${added} yeni kayıt eklendi, ${items.length - added} zaten vardı.`);
await sql.end();
