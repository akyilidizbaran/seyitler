// Her 3 günde bir GitHub Actions tarafından çalıştırılır (.github/workflows/refresh.yml).
//   1) Tarih geçişleri: açılış tarihi gelen → açık, son tarihi geçen → kapandı
//   2) Link kontrolü: 404/410 dönen başvuru linkleri "kırık" işaretlenir
//   3) AI taraması (ANTHROPIC_API_KEY varsa): Claude web'de yeni fırsat arar, "onay bekliyor" olarak ekler
//
// Yerelde: npm run refresh            (hepsi)
//          npm run refresh -- --no-ai (AI taraması olmadan)
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { connect, statusFor, todayIstanbul } from "./_db";
import { CATEGORIES, type Category } from "../src/lib/types";

const sql = connect();
const today = todayIstanbul();
const logLines: string[] = [];
const log = (msg: string) => {
  console.log(msg);
  logLines.push(msg);
};

const [run] = await sql<{ id: number }[]>`insert into refresh_runs default values returning id`;
const stats = { opened: 0, closed: 0, broken: 0, suggested: 0 };
let ok = true;

try {
  await transitionStatuses();
  await checkLinks();
  if (process.argv.includes("--no-ai")) log("AI taraması atlandı (--no-ai).");
  else if (!process.env.ANTHROPIC_API_KEY) log("ANTHROPIC_API_KEY yok; AI taraması atlandı.");
  else await discoverWithClaude();
} catch (e) {
  ok = false;
  log(`HATA: ${e instanceof Error ? (e.stack ?? e.message) : String(e)}`);
} finally {
  await sql`
    update refresh_runs set finished_at = now(), ok = ${ok}, opened = ${stats.opened}, closed = ${stats.closed},
      broken = ${stats.broken}, suggested = ${stats.suggested}, log = ${logLines.join("\n")}
    where id = ${run.id}
  `;
  await sql.end();
}
if (!ok) process.exit(1);

// ---------------------------------------------------------------------------

async function transitionStatuses() {
  const opened = await sql`
    update opportunities set status = 'active', updated_by = 'ai', updated_at = now()
    where status = 'upcoming' and opens_at <= ${today} and (deadline is null or deadline >= ${today})
    returning title
  `;
  const closed = await sql`
    update opportunities set status = 'closed', updated_by = 'ai', updated_at = now()
    where status in ('active','upcoming') and deadline < ${today}
    returning title
  `;
  // Onaylanmadan süresi dolan öneriler de kapanır ki onay listesi şişmesin.
  const expiredPending = await sql`
    update opportunities set status = 'rejected', updated_by = 'ai', updated_at = now()
    where status = 'pending' and deadline < ${today}
    returning title
  `;
  stats.opened = opened.length;
  stats.closed = closed.length;
  log(`Tarih kontrolü: ${opened.length} açıldı, ${closed.length} kapandı, ${expiredPending.length} süresi dolan öneri kaldırıldı.`);
  for (const r of opened) log(`  + açıldı: ${r.title}`);
  for (const r of closed) log(`  − kapandı: ${r.title}`);
}

async function checkLinks() {
  const rows = await sql<{ id: number; title: string; apply_url: string }[]>`
    select id, title, apply_url from opportunities
    where status in ('active','upcoming','pending') and apply_url ~* '^https?://'
  `;
  const results: { id: number; state: "ok" | "broken" | "unknown" }[] = [];
  const queue = [...rows];
  const worker = async () => {
    for (let r = queue.shift(); r; r = queue.shift()) {
      const state = await probe(r.apply_url);
      results.push({ id: r.id, state });
      if (state === "broken") log(`  ✗ kırık link: ${r.title} → ${r.apply_url}`);
    }
  };
  await Promise.all(Array.from({ length: 6 }, worker));

  for (const r of results) {
    await sql`update opportunities set link_status = ${r.state}, link_checked_at = now() where id = ${r.id}`;
  }
  stats.broken = results.filter((r) => r.state === "broken").length;
  log(`Link kontrolü: ${rows.length} link, ${stats.broken} kırık.`);
}

/** Sadece kesin "yok" yanıtlarını (404/410) kırık say. LinkedIn gibi botları engelleyen siteler "unknown" kalır. */
async function probe(url: string): Promise<"ok" | "broken" | "unknown"> {
  const headers = {
    "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140 Safari/537.36",
    accept: "text/html,application/xhtml+xml",
  };
  for (const method of ["HEAD", "GET"] as const) {
    try {
      const res = await fetch(url, { method, headers, redirect: "follow", signal: AbortSignal.timeout(15_000) });
      if (res.ok) return "ok";
      if (res.status === 404 || res.status === 410) {
        if (method === "HEAD") continue; // bazı siteler HEAD'e 404 döner; GET ile teyit et
        return "broken";
      }
      if (method === "HEAD" && res.status === 405) continue;
      return "unknown";
    } catch {
      if (method === "GET") return "unknown";
    }
  }
  return "unknown";
}

// ---------------------------------------------------------------------------
// AI taraması

// Her grup ayrı bir Claude çağrısıdır. AI_GROUPS="kariyer,akademik" gibi bir değişkenle sadece bazıları çalıştırılabilir.
const GROUPS = [
  {
    key: "kariyer",
    brief: `Türkiye'de AI / veri mühendisliği / yazılım odaklı kariyer fırsatları: aday mühendislik programları, dönem içi
part-time uzun dönem stajlar, 2027 yaz stajları ve 2027 mezunlarına yönelik yeni mezun / graduate / genç yetenek programları.
Savunma sanayii (Aselsan, Roketsan, Havelsan, Baykar, TUSAŞ, STM), telekom (Turkcell, Türk Telekom, Vodafone), bankalar ve
teknoloji şirketleri (Garanti BBVA Teknoloji, Akbank, Trendyol, Getir, Insider), Ankara/İstanbul teknopark startupları.`,
  },
  {
    key: "akademik",
    brief: `Yüksek lisans ve doktora başvuruları (Türkiye: ODTÜ, Boğaziçi, Bilkent, İTÜ, Koç, Sabancı, Hacettepe lisansüstü
dönemleri; yurt dışı: Avrupa'daki AI/ML/Data Science yüksek lisansları, Erasmus Mundus, ELLIS PhD ve benzeri doktora çağrıları),
burslar (TÜBİTAK BİDEB 2210/2211/2213, DAAD, TEV, Jean Monnet, Erasmus Mundus bursları, devlet ve üniversite bursları) ve
başvuruları etkileyen sınav tarihleri (ÖSYM ALES, YDS, YÖKDİL).`,
  },
  {
    key: "arastirma_egitim",
    brief: `Lisans öğrencisi / yeni mezunun katılabileceği araştırma programları (TÜBİTAK 2209-A/B, yurt dışı yaz araştırma
stajları, araştırma enstitüsü stajları) ile ML/AI yaz-kış okulları ve seçmeli eğitim programları (EEML, MLSS, OxML, ELLIS okulları,
ücretsiz ama başvurulu bootcamp ve burslu eğitim programları).`,
  },
  {
    key: "yarisma_girisim",
    brief: `AI / veri bilimi yarışmaları, hackathon ve datathonlar (TEKNOFEST, BTK Akademi, şirket ve üniversite hackathonları,
çevrim içi uluslararası öğrenci hackathonları, ödüllü Kaggle yarışmaları), öğrenci ve yeni mezun girişimcilik programları
(TÜBİTAK BiGG, üniversite ön kuluçka programları) ve öğrenci desteği/gönüllülüğü olan AI konferansları ile etkinlikler.`,
  },
  {
    key: "acik_kaynak_topluluk",
    brief: `Açık kaynak mentorluk programları (Google Summer of Code, Outreachy, LFX Mentorship, MLH Fellowship vb.) ve öğrenci
elçilik / topluluk liderliği programları (Google Developer Groups on Campus, AWS Cloud Clubs vb.). Programın hâlâ sürdüğünü
resmi sayfadan teyit et; kapanmış programları ekleme.`,
  },
] as const;

const Suggestion = z.object({
  title: z.string(),
  organization: z.string(),
  category: z.enum(Object.keys(CATEGORIES) as [Category, ...Category[]]),
  location: z.string().nullable(),
  work_mode: z.enum(["yerinde", "hibrit", "uzaktan", "bilinmiyor"]),
  country: z.string().describe('Türkçe ülke adı ("Türkiye", "Almanya"…); tamamen çevrim içiyse "Online"'),
  deadline: z.string().nullable().describe("YYYY-MM-DD ya da null"),
  opens_at: z.string().nullable().describe("Başvuru henüz açılmadıysa açılış tarihi YYYY-MM-DD, yoksa null"),
  deadline_note: z.string().nullable(),
  apply_url: z.string().describe("Resmi başvuru/program sayfası"),
  source_url: z.string().describe("Bilginin doğrulandığı resmi sayfa"),
  description: z.string(),
  eligibility: z.string().nullable(),
  tags: z.array(z.string()),
});
const SuggestionList = z.object({ items: z.array(Suggestion) });

async function discoverWithClaude() {
  const client = new Anthropic();
  const model = process.env.ANTHROPIC_MODEL ?? "claude-opus-5";
  const maxPerRun = Number(process.env.AI_MAX_SUGGESTIONS ?? 20);

  const known = await sql<{ organization: string; title: string; apply_url: string | null }[]>`
    select organization, title, apply_url from opportunities
    where status <> 'closed' or updated_at > now() - interval '90 days'
  `;
  const knownList = known.map((k) => `- ${k.organization} — ${k.title}${k.apply_url ? ` (${k.apply_url})` : ""}`).join("\n");

  const only = process.env.AI_GROUPS?.split(",").map((g) => g.trim()).filter(Boolean);
  for (const group of GROUPS) {
    if (only?.length && !only.includes(group.key)) continue;
    if (stats.suggested >= maxPerRun) break;
    try {
      const report = await research(client, model, group.brief, knownList);
      const items = await extract(client, model, report);
      const added = await insertSuggestions(items, known, maxPerRun - stats.suggested);
      stats.suggested += added;
      log(`AI [${group.key}]: ${items.length} aday bulundu, ${added} yeni öneri eklendi.`);
    } catch (e) {
      // Bir grubun hatası diğerlerini durdurmasın.
      log(`AI [${group.key}] hatası: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
}

async function research(client: Anthropic, model: string, brief: string, knownList: string): Promise<string> {
  const system = `Sen Türkiye'deki yapay zekâ ve veri mühendisliği 4. sınıf öğrencileri için fırsat araştıran titiz bir asistansın.
Bugünün tarihi ${today}. Kurallar:
- Sadece başvurusu şu an AÇIK olan ya da önümüzdeki 3 ay içinde açılacak fırsatları raporla. Son tarihi geçmişleri asla ekleme.
- Her fırsatı kurumun KENDİ resmi sayfasından doğrula (web_fetch ile aç). Blog/agregatör sitelerdeki tarihlere tek başına güvenme.
- Tarih uydurma. Resmi sayfada tarih yoksa "tarih belirtilmemiş" de. Çelişki varsa belirt.
- 4. sınıf lisans öğrencisi (veya mezuniyet sonrası yüksek lisans adayı) başvuramıyorsa ekleme.
- Aşağıdaki "zaten bilinen" listedeki fırsatları tekrar raporlama.`;

  const user = `Araştırma alanı:\n${brief}\n\nZaten bilinen fırsatlar (bunları atla):\n${knownList || "(yok)"}\n
En fazla 8 YENİ ve doğrulanmış fırsat bul. Her biri için şunları yaz: program adı, kurum, kategori, şehir/ülke, çalışma şekli,
son başvuru tarihi (YYYY-MM-DD), gerekiyorsa açılış tarihi, tarih notu, resmi başvuru linki, doğruladığın resmi kaynak linki,
1–3 cümlelik Türkçe açıklama ve kimlerin başvurabileceği. Doğrulayamadıklarını listeye koyma.`;

  const tools = [
    { type: "web_search_20260209" as const, name: "web_search" as const, max_uses: 8, user_location: { type: "approximate" as const, country: "TR", timezone: "Europe/Istanbul" } },
    { type: "web_fetch_20260209" as const, name: "web_fetch" as const, max_uses: 10 },
  ];
  const messages: Anthropic.Beta.BetaMessageParam[] = [{ role: "user", content: user }];

  // Sunucu tarafı araç döngüsü uzarsa "pause_turn" döner; kaldığı yerden devam ettir.
  for (let i = 0; i < 5; i++) {
    const msg = await client.beta.messages
      .stream({
        model,
        max_tokens: 32000,
        thinking: { type: "adaptive" },
        system,
        tools,
        messages,
        // Güvenlik sınıflandırıcısı reddederse istek otomatik olarak uygun bir modelde yeniden çalışır.
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
      })
      .finalMessage();

    if (msg.stop_reason === "pause_turn") {
      messages.push({ role: "assistant", content: msg.content });
      continue;
    }
    if (msg.stop_reason === "refusal") throw new Error("Model isteği reddetti.");
    return msg.content
      .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n");
  }
  throw new Error("Araştırma 5 devamdan sonra da bitmedi.");
}

async function extract(client: Anthropic, model: string, report: string) {
  if (!report.trim()) return [];
  const res = await client.messages.parse({
    model,
    max_tokens: 16000,
    output_config: { format: zodOutputFormat(SuggestionList) },
    messages: [
      {
        role: "user",
        content: `Aşağıdaki araştırma raporundaki fırsatları yapılandırılmış listeye dönüştür. Rapordaki bilgiyi aynen aktar,
yeni bilgi ekleme. Tarihleri YYYY-MM-DD biçimine çevir; tarih yoksa null yaz. Kategori fırsatın TÜRÜDÜR (yer değil):
${Object.entries(CATEGORIES).map(([k, v]) => `${k} = ${v}`).join(", ")}. Metin alanları Türkçe olsun. Etiketler kısa ve
küçük harf olsun (ör. "llm", "tam burslu", "almanya").\n\n<rapor>\n${report}\n</rapor>`,
      },
    ],
  });
  if (res.stop_reason === "refusal" || !res.parsed_output) return [];
  return res.parsed_output.items;
}

async function insertSuggestions(
  items: z.infer<typeof Suggestion>[],
  known: { organization: string; title: string }[],
  limit: number,
): Promise<number> {
  const norm = (s: string) => s.toLocaleLowerCase("tr").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
  const knownKeys = new Set(known.map((k) => `${norm(k.organization)}|${norm(k.title)}`));
  const isDate = (s: string | null) => (s && /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null);
  let added = 0;

  for (const it of items) {
    if (added >= limit) break;
    const deadline = isDate(it.deadline);
    const opensAt = isDate(it.opens_at);
    if (deadline && deadline < today) continue;
    if (!/^https?:\/\//i.test(it.apply_url)) continue;
    const key = `${norm(it.organization)}|${norm(it.title)}`;
    if (knownKeys.has(key)) continue;

    const rows = await sql`
      insert into opportunities (title, organization, category, location, work_mode, country, deadline, opens_at,
        deadline_note, apply_url, source_url, description, eligibility, tags, status, verified_at, created_by)
      values (${it.title}, ${it.organization}, ${it.category}, ${it.location}, ${it.work_mode}, ${it.country || "Türkiye"},
        ${deadline}, ${opensAt}, ${it.deadline_note}, ${it.apply_url}, ${it.source_url}, ${it.description}, ${it.eligibility},
        ${it.tags.slice(0, 8)}, 'pending', ${today}, 'ai')
      on conflict do nothing
      returning id
    `;
    if (rows.length) {
      added++;
      knownKeys.add(key);
      log(`  ✦ öneri: ${it.organization} — ${it.title} (${deadline ?? "tarih yok"}; ${statusFor(deadline, opensAt)})`);
    }
  }
  return added;
}
