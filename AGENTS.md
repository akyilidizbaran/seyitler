# AGENTS.md — Fırsat Radarı

Bu dosya bu repoda çalışan kodlama ajanları (Claude Code, Codex, Cursor, Copilot vb.) içindir. İnsanlar için genel tanıtım
`README.md`'de. Bir göreve başlamadan önce bu dosyanın tamamını oku.

## Proje ne?

Yapay Zekâ ve Veri Mühendisliği 4. sınıf öğrencilerinden oluşan 7 kişilik bir arkadaş grubunun kullandığı, açık kaynak (public
repo) bir **fırsat takip sitesi**. Tek ortak site ve tek veritabanı var; fırsat listesi ortak, her kişinin ayrıca bir **kişisel
sayfası** (`/sayfam`) var. Yedi kişi de repoda yazma yetkili collaborator: isteyen sadece siteyi kullanır, isteyen kodu çekip
kendi agent'ıyla değiştirir ve PR gönderir. İçerik: staj, aday mühendislik, yeni mezun programları, yüksek lisans, doktora, burs, araştırma programları, yaz
okulları, sınav tarihleri, yarışmalar, girişimcilik, açık kaynak / topluluk programları ve etkinlikler.

Sitenin asıl değeri **içeriğin güncel ve doğru olması**. Kod değişikliklerinden çok, veri eklemek ve düzeltmek için
çağrılacaksın.

## Değişmez kurallar

Bu kurallar kullanıcının açık kararlarıdır. Kullanıcı açıkça istemedikçe değiştirme:

1. **Kayıt ekranı yok, kullanıcılar sabit.** Kullanıcılar sadece `npm run users:create` ile oluşturulur; bu betik var olan
   kullanıcının şifresine dokunmaz. Her kullanıcı **sadece kendi** şifresini, mevcut şifresini girerek `/sayfam/sifre`'den
   değiştirebilir (`password_changed_at` null ise sitede uyarı çıkar). Admin dahil kimse başkasının şifresini değiştiremez;
   şifre sıfırlama ekranı ekleme.
2. **Kişisel sayfa ve takip özeldir; admin sadece okur.** Profil (`users.bio`, `goals`, linkler…), takip durumları ve notlar
   (`user_status`) sadece sahibine ve admine (`users.is_admin = true`) gösterilir. Diğer kullanıcılara asla gösterilmez.
   Admin başkalarının sayfasını **salt okunur** görür (`/kisiler`, `/kisiler/[username]`); başkası adına takip, not veya profil
   değiştiren kod yazma. Yazan her server action sadece `requireUser()`'dan gelen kullanıcının kendi kaydını değiştirir.
3. **Herkes fırsat ekleyip düzenleyebilir.** Fırsat içeriği için admin ayrımı yok; admin yetkisi sadece kişisel sayfaları
   görmek içindir. Admin, `users.local.json`'da `"is_admin": true` ile `npm run users:create` üzerinden verilir.
4. **AI önerileri onaydan geçer.** Otomatik tarama (`scripts/refresh.ts`) kayıtları her zaman `status = 'pending'` ile ekler.
   Bir insan onaylamadan `active` olmaz.
5. **Bildirimler site içidir.** E-posta, Telegram veya push ekleme.
6. **Gizli bilgi commit etme:** `.env*`, `users.local.json`, `users.credentials.local.txt`, veritabanı adresleri, API anahtarları.
   Bunlar `.gitignore`'da; `git add -A` öncesi `git status` ile kontrol et.

## Veri doğruluğu kuralları (fırsat eklerken / düzenlerken)

- **Resmi kaynaktan doğrula.** Tarih ve uygunluk bilgisi kurumun kendi sayfasından (kariyer sitesi, üniversite, ÖSYM, TÜBİTAK…)
  alınmalı. Blog, haber ve agregatör sitelerine tek başına güvenme. `source_url` doğruladığın resmi sayfa olmalı.
- **Tarih uydurma.** Resmi sayfada tarih yoksa `deadline: null` yap ve durumu `deadline_note`'a yaz (ör. "2027 tarihleri henüz
  açıklanmadı; 2026'da 1–30 Kasım arasıydı").
- **Son tarihi geçmiş fırsatı açık olarak ekleme.** Arşiv için ekliyorsan `"status": "closed"` ver.
- **Uygunluğu kontrol et.** Hedef kitle: Türk vatandaşı, 2027'de mezun olacak 4. sınıf lisans öğrencisi. Başvuramıyorlarsa ekleme.
- **Başvuru henüz açılmadıysa** `opens_at` alanına açılış tarihini yaz. Site bunu "yakında açılıyor" olarak gösterir ve tarih
  gelince otomatik açar.
- **Başvuru son tarihi ≠ etkinlik/teslim tarihi.** `deadline` her zaman başvuru son günü. Diğer tarihler `deadline_note`'a.
- Metin alanları **Türkçe**, etiketler kısa ve küçük harf (`"llm"`, `"ankara"`, `"tam burslu"`).

## Kategoriler

Kategori fırsatın **türüdür**. Yer bilgisi kategori değildir: Türkiye / yurt dışı / uzaktan ayrımı `country` ve `work_mode`
alanlarından türetilen **Bölge** filtresidir. Tamamen çevrim içi ise `country: "Online"`.

| Grup | Anahtar | Ne zaman kullanılır |
| --- | --- | --- |
| Kariyer | `staj` | Kısa dönem / yaz / zorunlu staj |
| | `uzun_donem_staj` | Dönem içi, genelde part-time, 3+ ay |
| | `aday_muhendis` | Şirketin "aday mühendis / genç yetenek" programı (ör. son sınıf, haftada 2–4 gün) |
| | `yeni_mezun` | 2027 mezunlarına tam zamanlı graduate / MT / junior programları |
| Akademik | `yuksek_lisans` | Yüksek lisans başvuru dönemleri |
| | `doktora` | Doktora programları ve pozisyonları (bütünleşik / direct PhD dahil) |
| | `burs` | Öğrenim veya yaşam bursları |
| | `arastirma` | Araştırma stajları ve projeleri (TÜBİTAK 2209, yaz araştırma programları, enstitü stajları) |
| | `egitim` | Yaz / kış okulları, seçmeli eğitim programları, bootcamp'ler |
| | `sinav` | Başvuruları etkileyen sınav tarihleri (ALES, YDS, YÖKDİL; GRE/TOEFL gibi sürekli sınavlar tarihsiz) |
| Gelişim | `yarisma` | Yarışma, hackathon, datathon, Kaggle; girişimcilik yarışmaları ve destekleri (BiGG, ön kuluçka) |
| | `acik_kaynak` | Açık kaynak mentorluk (GSoC, Outreachy, LFX) ve öğrenci elçiliği / topluluk programları |
| | `etkinlik` | Konferans, zirve, meetup; konferans maddi destek / gönüllülük çağrıları. `deadline` = kayıt son günü, yoksa etkinlik günü |
| | `diger` | Hiçbirine uymuyorsa |

Topluluk ve girişimcilik 2026-09-29 araştırmasında ayrı kategori olacak kadar içerik çıkarmadığı için birleştirildi.

**Yeni kategori eklemek** için dört yeri birlikte güncelle: `src/lib/types.ts` (`CATEGORIES` + `CATEGORY_GROUPS`),
`db/schema.sql` (check kısıtı), bu tablo ve gerekiyorsa `scripts/refresh.ts` (`GROUPS` tarama alanları). Sonra
`npm run db:migrate`.

## Veri nasıl eklenir?

İki yol var:

1. **Toplu (tercih edilen, PR ile):** `data/` altına yeni bir JSON dosyası ekle (ör. `data/2026-10-15-bahar-stajlari.json`).
   Format için `data/research-2026-09-29.json`'a bak. Alanlar:

   ```jsonc
   {
     "title": "Program adı",
     "organization": "Kurum",
     "category": "staj",                 // yukarıdaki tablodan
     "location": "Ankara" ,              // veya null
     "work_mode": "hibrit",              // yerinde | hibrit | uzaktan | bilinmiyor
     "country": "Türkiye",               // Türkçe ülke adı ya da "Online"
     "deadline": "2026-10-28",           // YYYY-MM-DD veya null
     "opens_at": null,                   // başvuru henüz açılmadıysa açılış tarihi
     "deadline_note": "Kısa tarih notu",
     "apply_url": "https://…",           // apply_url + title ikilisi benzersiz olmalı (kopya kontrolü)
     "source_url": "https://…",          // doğruladığın resmi sayfa
     "description": "1–3 cümle",
     "eligibility": "Kimler başvurabilir",
     "tags": ["llm", "ankara"],
     "status": "closed",                 // isteğe bağlı; sadece arşiv kaydı için
     "verified_at": "2026-10-15"         // doğrulama tarihi
   }
   ```

   Sonra `npm run data:check` çalıştır; **hata varsa commit etme**. Üretim veritabanına yükleme
   (`npm run db:seed -- data/dosya.json`) `DATABASE_URL` gerektirir. Bu yetki sende yoksa kullanıcıya bırak.
   Seed aynı `apply_url` + `title` ikilisine sahip kayıtları atlar, yani tekrar çalıştırmak güvenlidir. Ortak portallar (ÖSYM AİS, e-BİDEB) aynı linki paylaşabilir; başlığı farklı tut. Seed **var olan kayıtları güncellemez**.
2. **Tekil:** Kullanıcı siteden "+ Fırsat ekle" ile ekler. Var olan bir kaydı düzeltmek için de site kullanılır.

## Mimari

```
src/proxy.ts                 Oturum çerezi yoksa /giris'e yönlendirir (Next 16'da middleware'in yeni adı "proxy")
src/app/giris/               Giriş sayfası
src/app/(app)/               Giriş gerektiren sayfalar; layout.tsx menü ve bildirim sayacını içerir
  page.tsx                   Panel
  firsatlar/                 Liste (filtreler URL parametreleriyle), detay, yeni, düzenle
  sayfam/                    Kişisel sayfa (profil + takip + notlar), profil düzenleme, şifre değiştirme; /takibim buraya yönlenir
  kisiler/                   Sadece admin: kullanıcı listesi ve salt okunur kişisel sayfalar (requireAdmin → değilse 404)
  admine-not/                Kullanıcıların admine düzenleme istekleri (admin_notes); kullanıcı kendi notlarını, admin hepsini görür ve kapatır
  onay/ bildirimler/ guncellemeler/
src/components/              UI bileşenleri (PersonalPage server component; TrackButtons, StatusActions, OpportunityForm, ProfileForm… client)
src/lib/types.ts             Kategoriler, durumlar, tipler, tarih yardımcıları (sunucu ve istemcide kullanılabilir)
src/lib/db.ts                postgres.js istemcisi (ilk sorguda bağlanır; `date` kolonları 'YYYY-MM-DD' string döner)
src/lib/auth.ts              getUser / requireUser / requireAdmin (server-only)
src/lib/session.ts           JWT oturum çerezi (jose, HS256, SESSION_SECRET)
src/lib/queries.ts           Okuma sorguları (server-only)
src/lib/actions.ts           Tüm yazma işlemleri (Server Actions): giriş, fırsat kaydet, durum değiştir, takip, not
db/schema.sql                Şema; idempotent, `npm run db:migrate` her çalıştığında baştan uygulanır
scripts/                     migrate, seed, create-users, refresh (3 günlük tarama), check-data, dev-db (PGlite)
data/*.json                  Başlangıç ve toplu fırsat verisi
.github/workflows/refresh.yml  3 günde bir scripts/refresh.ts
```

**Veri akışı:** Sayfalar Server Component. Okuma `queries.ts`, yazma `actions.ts` üzerinden yapılır. Her server action
`requireUser()` ile başlar ve sonunda `revalidatePath` çağırır. API route yok.

## Kod kuralları

- **Next.js 16.** Eğitim verindeki Next.js'ten farklı: `params`/`searchParams`/`cookies()` async, `middleware.ts` yerine
  `proxy.ts`. Emin olmadığında `node_modules/next/dist/docs/` altındaki ilgili dokümanı oku (aşağıdaki blok).
- **Tailwind CSS 4.** Renkler `globals.css`'teki token'lardan gelir (`bg-surface`, `text-muted`, `text-accent`…). Hazır
  sınıflar: `card`, `chip`, `btn-primary`, `btn-ghost`, `input`, `label`. Bunlar `@utility` ile tanımlı; yeni ortak sınıf
  eklerken de `@utility` kullan (`@apply` ile özel sınıf zincirlenemez). Açık/koyu tema otomatik; sabit renk kodu yazma.
- **Arayüz metinleri ve kod yorumları Türkçe.** Tanımlayıcılar (değişken/fonksiyon adları) İngilizce.
- **SQL** her zaman `sql` tagged template ile, asla string birleştirme ile yazılmaz. Modül seviyesinde `sql\`...\`` fragment'i
  oluşturma (build'i bozar); fonksiyon içinde oluştur.
- **Tarihler** İstanbul saatine göre: `todayIstanbul()`, `daysLeft()`, `formatDate()` kullan.
- **Formlar:** `useActionState` + `onSubmit` içinde `startTransition(() => action(formData))`. `<form action={…}>`
  kullanma; React 19 hata sonrası formu sıfırlıyor.
- **Şema değişikliği:** `db/schema.sql`'e idempotent SQL ekle (`if not exists`, `drop constraint if exists`…). Veri silen
  geçiş yazma. Sonra `npm run db:migrate`.

## Komutlar

```bash
npm run dev:db        # yerel gömülü Postgres (PGlite), ayrı terminalde açık kalır
npm run db:migrate    # şemayı uygula
npm run db:seed [-- data/dosya.json]
npm run dev           # http://localhost:3000
npm run refresh -- --no-ai   # tarih ve link kontrolü (AI olmadan)
npm run data:check    # data/*.json doğrulama
npm run db:update -- dosya.json --by admin   # var olan kayıtlara düzeltme ([{id, fixes, reason}]); üretimde sadece kullanıcı isterse
npm run typecheck && npm run lint && npm run build   # PR öncesi hepsi geçmeli
```

Yerelde `.env.local` gerekir (`.env.example`'ı kopyala). PGlite ile `DATABASE_POOL_MAX=1` kalmalı. Test kullanıcısı için
kendi `users.local.json`'unu oluşturup `npm run users:create` çalıştır.

## Çalışma şekli

- Repo public, 7 kişi yazma yetkili collaborator. `main` dalına doğrudan push etme: dal aç, PR gönder.
  Her dal için Vercel otomatik bir önizleme linki üretir; `main`'e merge ortak siteyi günceller.
- Önizleme (preview) deploy'ları üretim veritabanına bağlı olabilir. Önizlemede veri silen/bozan bir şey deneme; şema
  değişikliği içeren PR'larda `db:migrate`'i merge'den sonra kullanıcı çalıştırır.
- PR açıklamasında ne değiştiğini ve (veri PR'ıysa) hangi resmi kaynaklardan doğruladığını yaz.
- Üretim veritabanına (`DATABASE_URL`) yazan komutları (`db:seed`, `users:create`, `db:migrate`) kullanıcı açıkça istemedikçe
  çalıştırma.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
