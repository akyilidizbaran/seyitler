// data/*.json dosyalarını doğrular: alan tipleri, kategori/çalışma şekli değerleri, tarih biçimi,
// link biçimi ve dosyalar arası kopya kayıtlar (aynı başvuru linki + aynı başlık). Veritabanına bağlanmaz.
// Kullanım: npm run data:check   (hata varsa çıkış kodu 1)
import { readFileSync, readdirSync } from "node:fs";
import { z } from "zod";
import { CATEGORIES, WORK_MODES, type Category, type WorkMode } from "../src/lib/types";
import { todayIstanbul } from "./_db";

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-AA-GG olmalı");
const url = z.string().regex(/^(https?:\/\/|mailto:)/i, "http(s):// veya mailto: ile başlamalı");

const Item = z
  .object({
    title: z.string().min(2),
    organization: z.string().min(1),
    category: z.enum(Object.keys(CATEGORIES) as [Category, ...Category[]]),
    location: z.string().nullable(),
    work_mode: z.enum(Object.keys(WORK_MODES) as [WorkMode, ...WorkMode[]]),
    country: z.string().min(1),
    deadline: date.nullable(),
    opens_at: date.nullable(),
    deadline_note: z.string().nullable(),
    apply_url: url.nullable(),
    source_url: url.nullable(),
    description: z.string().nullable(),
    eligibility: z.string().nullable(),
    tags: z.array(z.string()),
    status: z.enum(["active", "upcoming", "closed"]).optional(),
    verified_at: date.nullable().optional(),
  })
  .strict();

const today = todayIstanbul();
const files = readdirSync("data").filter((f) => f.endsWith(".json"));
const seenUrls = new Map<string, string>();
let errors = 0;
let warnings = 0;
let total = 0;

for (const file of files) {
  const raw: unknown = JSON.parse(readFileSync(`data/${file}`, "utf8"));
  if (!Array.isArray(raw)) {
    console.error(`✗ ${file}: kök eleman bir dizi olmalı`);
    errors++;
    continue;
  }
  raw.forEach((entry, i) => {
    total++;
    const where = `${file}[${i}]`;
    const parsed = Item.safeParse(entry);
    if (!parsed.success) {
      errors++;
      for (const issue of parsed.error.issues) console.error(`✗ ${where}.${issue.path.join(".")}: ${issue.message}`);
      return;
    }
    const it = parsed.data;
    if (it.opens_at && it.deadline && it.opens_at > it.deadline) {
      errors++;
      console.error(`✗ ${where}: opens_at (${it.opens_at}) deadline'dan (${it.deadline}) sonra`);
    }
    if (it.apply_url) {
      // Veritabanındaki benzersizlik kuralıyla aynı: lower(apply_url) + lower(title)
      const key = `${it.apply_url.toLowerCase()}\n${it.title.toLowerCase()}`;
      const prev = seenUrls.get(key);
      if (prev) {
        errors++;
        console.error(`✗ ${where}: ${prev} ile aynı başvuru linki ve başlık (${it.title})`);
      } else seenUrls.set(key, where);
    }
    // Uyarılar: hata değil, ama gözden geçirilmeli.
    if (it.deadline && it.deadline < today && it.status !== "closed") {
      warnings++;
      console.warn(`! ${where}: son tarih geçmiş (${it.deadline}); seed sırasında "closed" olarak eklenecek — ${it.title}`);
    }
    if (!it.source_url) {
      warnings++;
      console.warn(`! ${where}: source_url yok — ${it.title}`);
    }
  });
}

console.log(`\n${files.length} dosya, ${total} kayıt · ${errors} hata · ${warnings} uyarı`);
if (errors) process.exit(1);
