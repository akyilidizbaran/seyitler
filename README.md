# Fırsat Radarı

Yapay Zekâ ve Veri Mühendisliği 4. sınıf öğrencileri için fırsatları tek yerde toplayan, 7 kişilik arkadaş grubu için kapalı
(girişli) ama açık kaynaklı bir takip platformu. Kategoriler üç grupta:

- **Kariyer:** staj, uzun dönem staj, aday mühendislik, yeni mezun programları
- **Akademik:** yüksek lisans, doktora, burs, araştırma programları, yaz okulu / eğitim, sınav takvimi
- **Gelişim:** yarışma / girişimcilik, açık kaynak / topluluk, konferans / etkinlik

Türkiye / yurt dışı / uzaktan ayrımı kategori değil, ayrı bir **Bölge** filtresi.

- **Güncel içerik:** Herkes fırsat ekleyip düzenleyebilir. Ayrıca her 3 günde bir otomatik tarama çalışır.
- **Otomatik tarama (GitHub Actions):** Son tarihi geçenleri kapatır, açılış tarihi gelenleri açar, 404/410 dönen linkleri
  işaretler ve Claude ile web'de yeni fırsat arayıp **"onay bekliyor"** listesine ekler. Onaylanmadan kimsenin listesine düşmez.
- **Site içi bildirimler:** 7 gün içinde kapanan fırsatlar ve son ziyaretten beri eklenenler.
- **Kişisel sayfa (`/sayfam`):** Profil (hakkımda, hedefler, ilgi alanları, CV/GitHub/LinkedIn), takip listesi
  (*İlgileniyorum / Başvurdum / Sonuçlandı / Geçtim*) ve fırsatlara özel notlar. Herkes kendi sayfasını düzenler.
- **Admin:** Admin (`/kisiler`) herkesin kişisel sayfasını **salt okunur** görür. Diğer kullanıcılar birbirinin sayfasını göremez.
- **Admine not (`/admine-not`):** Kullanıcılar düzenlenmesini istedikleri şeyleri admine yazar; admin "Yapıldı / Yapılmayacak"
  diye kapatıp cevap verir.
- **Sabit kullanıcılar:** Kayıt ekranı yok. Hesapları yönetici oluşturur; herkes kendi şifresini *Sayfam → Şifre değiştir*'den
  değiştirebilir. İlk şifresini değiştirmeyenlere sitede uyarı gösterilir.

Teknoloji: Next.js 16 (App Router, Server Actions) · Postgres · Tailwind CSS 4 · Anthropic Claude API · Vercel · GitHub Actions

---

## Kurulum (yayına alma)

İhtiyacın olanlar: GitHub hesabı, [Vercel](https://vercel.com) hesabı (GitHub ile girilebilir), bir Postgres veritabanı
([Neon](https://neon.tech) veya [Supabase](https://supabase.com), ikisinin de ücretsiz planı yeterli) ve otomatik AI taraması
için bir [Anthropic API anahtarı](https://console.anthropic.com).

### 1. Veritabanı

- **Neon (önerilen):** Vercel projesinde *Storage → Create Database → Neon* seçersen `DATABASE_URL` otomatik eklenir.
  Bölge olarak **Frankfurt (eu-central-1)** seç.
- **Supabase:** *Project Settings → Database → Connection string → Transaction pooler* (port 6543) adresini kullan.

### 2. Vercel

1. Vercel'de *Add New → Project* ile bu repoyu içe aktar.
2. *Environment Variables*:
   - `DATABASE_URL`: veritabanı adresi
   - `SESSION_SECRET`: `openssl rand -base64 48` çıktısı (en az 32 karakter)
3. Deploy et.

### 3. Tabloları, başlangıç verisini ve kullanıcıları oluştur (bilgisayarından, bir kez)

```bash
npm install
cp .env.example .env.local        # DATABASE_URL'i üretim veritabanı yap, DATABASE_POOL_MAX satırını sil
npm run db:migrate                # tabloları oluşturur
for f in data/*.json; do npm run db:seed -- $f; done   # tüm fırsat dosyaları (tekrar çalıştırmak güvenli)
cp users.example.json users.local.json   # 7 kişiyi yaz; admin olacak kişiye "is_admin": true
npm run users:create              # şifreler users.credentials.local.txt dosyasına yazılır
```

`users.local.json` ve `users.credentials.local.txt` git'e girmez. Şifreleri arkadaşlarına ilettikten sonra dosyayı sil.
Sonradan yeni kişi eklemek için listeye ekleyip `npm run users:create`'i tekrar çalıştırman yeterli. Var olan kullanıcıların
şifresine dokunulmaz; sadece `is_admin` değeri değiştiyse admin yetkisi güncellenir.

### 4. Ekip: GitHub collaborator'ları

Repo **public** tutulur: Vercel'in ücretsiz (Hobby) planı private repolarda başka kişilerin commit'lerini deploy etmiyor,
public repolarda ise iş birliği ücretsiz. Repoda gizli bilgi yoktur (şifreler, notlar ve profiller veritabanında durur).

1. Repo → *Settings → Collaborators → Add people* ile 6 arkadaşını ekle (yazma yetkisi).
2. Önerilen: *Settings → Branches → Add rule* ile `main` için "Require a pull request before merging" aç. Böylece herkes dal
   açıp PR gönderir, CI (veri doğrulama, tip kontrolü, lint, build) geçmeden merge edilmez.
3. Vercel her dal/PR için otomatik bir **önizleme linki** üretir; `main`'e merge edilince ortak site güncellenir.
   Önizlemelerin üretim veritabanını kullanmaması için Neon entegrasyonunda *preview deployment'lar için veritabanı dalı*
   seçeneğini aç ya da `DATABASE_URL`'i sadece *Production* ortamına tanımla.

> Yazma yetkili collaborator'lar GitHub Actions secret'larını (`DATABASE_URL`, `ANTHROPIC_API_KEY`) okuyan bir iş akışı
> yazabilir. Bu yüzden sadece güvendiğin kişileri ekle.

### 5. Otomatik tarama (GitHub Actions)

Repo → *Settings → Secrets and variables → Actions*:

| Tür | Ad | Değer |
| --- | --- | --- |
| Secret | `DATABASE_URL` | Vercel'deki ile aynı |
| Secret | `ANTHROPIC_API_KEY` | Anthropic API anahtarı (yoksa sadece tarih ve link kontrolü yapılır) |
| Variable | `REFRESH_ENABLED` | `true` (secret'ları ekledikten sonra; yoksa iş akışı atlanır) |
| Variable (isteğe bağlı) | `ANTHROPIC_MODEL` | Varsayılan `claude-opus-5`. Daha ucuz tarama için `claude-sonnet-5` |

İş akışı `.github/workflows/refresh.yml` her 3 günde bir İstanbul saatiyle 09:00'da çalışır. *Actions → Fırsat taraması →
Run workflow* ile elle de başlatılabilir. Sonuçlar sitede *Otomatik güncelleme geçmişi* sayfasında görünür.

> **Maliyet:** Her AI taraması 5 alanı (kariyer, akademik, araştırma/eğitim, yarışma/girişim, açık kaynak) web aramasıyla tarar.
> `AI_GROUPS` değişkeniyle (ör. `kariyer,akademik`) sadece bazılarını çalıştırabilirsin.
> Tutar modele ve bulunan sayfa sayısına göre değişir. Anthropic konsolunda aylık harcama limiti koyman önerilir.

---

## Yerel geliştirme

Docker veya Postgres kurmana gerek yok. Gömülü Postgres (PGlite) kullanılır:

```bash
npm install
cp .env.example .env.local        # SESSION_SECRET'i doldur
npm run dev:db                    # ayrı bir terminalde açık kalsın
npm run db:migrate && npm run db:seed
npm run users:create              # users.local.json gerekli
npm run dev                       # http://localhost:3000
npm run refresh -- --no-ai        # taramayı AI olmadan dene
```

## Katkı

> **Kodlama ajanıyla (Claude Code, Codex, Cursor…) çalışıyorsan:** ajan önce [`AGENTS.md`](AGENTS.md)'yi okumalı. Kurallar,
> kategori tanımları, veri formatı ve mimari orada.

- **Fırsat eklemek:** En kolay yol siteden *+ Fırsat ekle*. Toplu ekleme için `data/` altına `seed.json` formatında bir dosya
  koyup önce `npm run data:check` ile doğrula, sonra `npm run db:seed -- data/dosya.json` ile yükle.
- **PR'lar** GitHub Actions'ta otomatik kontrol edilir (veri doğrulama, tip kontrolü, lint, build).
- **Kural:** Bir fırsatı ancak resmi kaynaktan doğrulandıysa "açık" olarak ekle. Tarihi bilinmiyorsa boş bırakıp tarih notuna yaz.

## Proje yapısı

```
src/app/(app)/        giriş gerektiren sayfalar (panel, fırsatlar, sayfam, kişiler [admin], onay, bildirimler)
src/app/giris/        giriş sayfası
src/lib/              veritabanı, oturum, sorgular, server action'lar
src/proxy.ts          oturumu olmayanları giriş sayfasına yönlendirir
db/schema.sql         veritabanı şeması
scripts/              migrate, seed, kullanıcı oluşturma, veri doğrulama, 3 günlük tarama
data/*.json           fırsat verisi (29 Eylül 2026 araştırması ve bağımsız doğrulaması)
AGENTS.md             kodlama ajanları için kurallar ve rehber
```

## Lisans

MIT
