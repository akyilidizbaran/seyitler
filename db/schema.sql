-- Fırsat Radarı veritabanı şeması. `npm run db:migrate` ile uygulanır; tekrar çalıştırmak güvenlidir.

create table if not exists users (
  id            serial primary key,
  username      text not null unique,
  display_name  text not null,
  password_hash text not null,
  last_seen_at  timestamptz not null default now(),
  created_at    timestamptz not null default now()
);

-- (2026-09-30) Kişisel sayfa ve admin. Admin herkesin kişisel sayfasını GÖREBİLİR, düzenleyemez.
alter table users add column if not exists is_admin boolean not null default false;
alter table users add column if not exists bio text;
alter table users add column if not exists goals text;
alter table users add column if not exists interests text[] not null default '{}';
alter table users add column if not exists cv_url text;
alter table users add column if not exists github_url text;
alter table users add column if not exists linkedin_url text;
alter table users add column if not exists website_url text;
alter table users add column if not exists profile_updated_at timestamptz;
-- (2026-09-30) Herkes kendi şifresini değiştirebilir; null = hâlâ yöneticinin verdiği ilk şifre (uyarı gösterilir).
alter table users add column if not exists password_changed_at timestamptz;

create table if not exists opportunities (
  id              serial primary key,
  title           text not null,
  organization    text not null,
  category        text not null,
  location        text,
  work_mode       text not null default 'bilinmiyor' check (work_mode in ('yerinde','hibrit','uzaktan','bilinmiyor')),
  country         text not null default 'Türkiye',
  deadline        date,
  opens_at        date,
  deadline_note   text,
  apply_url       text,
  source_url      text,
  description     text,
  eligibility     text,
  tags            text[] not null default '{}',
  -- pending: AI önerisi, onay bekliyor | active: başvuruya açık | upcoming: henüz açılmadı
  -- closed: son tarih geçti / kapandı | rejected: öneri reddedildi
  status          text not null default 'active' check (status in ('pending','active','upcoming','closed','rejected')),
  link_status     text not null default 'unknown' check (link_status in ('ok','broken','unknown')),
  link_checked_at timestamptz,
  verified_at     date,
  created_by      text not null,
  updated_by      text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Kategori listesi src/lib/types.ts'teki CATEGORIES ile aynı olmalı.
-- (2026-09-29) "yurt_disi" kategori olmaktan çıktı; yer bilgisi artık country/work_mode'dan türetiliyor.
alter table opportunities drop constraint if exists opportunities_category_check;
update opportunities set category = 'arastirma' where category = 'yurt_disi';
-- (2026-09-29) topluluk → acik_kaynak, girisimcilik → yarisma olarak birleştirildi (ayrı kalacak kadar içerik yok).
update opportunities set category = 'acik_kaynak' where category = 'topluluk';
update opportunities set category = 'yarisma' where category = 'girisimcilik';
alter table opportunities add constraint opportunities_category_check check (category in (
  'staj','uzun_donem_staj','aday_muhendis','yeni_mezun',
  'yuksek_lisans','doktora','burs','arastirma','egitim','sinav',
  'yarisma','acik_kaynak','etkinlik','diger'));

-- Kopya kontrolü: aynı başvuru linki + aynı başlık. Sadece link yetmez; ÖSYM (ais.osym.gov.tr), TÜBİTAK e-BİDEB ve TEV
-- gibi ortak başvuru portalları birçok farklı fırsat için aynı linki kullanır.
drop index if exists opportunities_apply_url_key;
create unique index if not exists opportunities_apply_url_title_key on opportunities (lower(apply_url), lower(title)) where apply_url is not null;
create index if not exists opportunities_status_deadline_idx on opportunities (status, deadline);

-- Kişisel takip: her kullanıcı yalnızca kendi kayıtlarını görür ve düzenler; admin (users.is_admin) okuyabilir.
create table if not exists user_status (
  user_id        int not null references users(id) on delete cascade,
  opportunity_id int not null references opportunities(id) on delete cascade,
  status         text not null check (status in ('interested','applied','done','skipped')),
  note           text,
  updated_at     timestamptz not null default now(),
  primary key (user_id, opportunity_id)
);

create table if not exists refresh_runs (
  id          serial primary key,
  started_at  timestamptz not null default now(),
  finished_at timestamptz,
  ok          boolean,
  opened      int not null default 0,
  closed      int not null default 0,
  broken      int not null default 0,
  suggested   int not null default 0,
  log         text not null default ''
);

-- (2026-09-30) Bildirimler "Okudum" ile kapatılır. kind: 'deadline' (7 gün içinde kapanıyor) | 'new' (yeni eklendi).
create table if not exists notification_reads (
  user_id        int not null references users(id) on delete cascade,
  opportunity_id int not null references opportunities(id) on delete cascade,
  kind           text not null check (kind in ('deadline','new')),
  read_at        timestamptz not null default now(),
  primary key (user_id, opportunity_id, kind)
);

-- (2026-09-30) "Admine not": kullanıcıların düzenleme istekleri. Kullanıcı sadece kendi notlarını, admin hepsini görür.
create table if not exists admin_notes (
  id          serial primary key,
  user_id     int not null references users(id) on delete cascade,
  body        text not null,
  status      text not null default 'open' check (status in ('open','done','wontfix')),
  admin_reply text,
  created_at  timestamptz not null default now(),
  resolved_at timestamptz
);
create index if not exists admin_notes_status_idx on admin_notes (status, created_at desc);
