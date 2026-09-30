// Kategori = fırsatın TÜRÜ. Yer (Türkiye / yurt dışı / uzaktan) kategori değil, `country` + `work_mode`
// alanlarından türeyen ayrı bir filtredir (REGIONS). Yeni kategori eklerken db/schema.sql'deki
// check kısıtını ve scripts/refresh.ts'teki tarama gruplarını da güncelleyin.
export const CATEGORIES = {
  staj: "Staj",
  uzun_donem_staj: "Uzun Dönem Staj",
  aday_muhendis: "Aday Mühendislik",
  yeni_mezun: "Yeni Mezun Programı",
  yuksek_lisans: "Yüksek Lisans",
  doktora: "Doktora",
  burs: "Burs",
  arastirma: "Araştırma Programı",
  egitim: "Yaz Okulu / Eğitim",
  sinav: "Sınav Takvimi",
  yarisma: "Yarışma / Girişimcilik",
  acik_kaynak: "Açık Kaynak / Topluluk",
  etkinlik: "Konferans / Etkinlik",
  diger: "Diğer",
} as const;
export type Category = keyof typeof CATEGORIES;

export const CATEGORY_GROUPS: { label: string; items: Category[] }[] = [
  { label: "Kariyer", items: ["staj", "uzun_donem_staj", "aday_muhendis", "yeni_mezun"] },
  { label: "Akademik", items: ["yuksek_lisans", "doktora", "burs", "arastirma", "egitim", "sinav"] },
  { label: "Gelişim", items: ["yarisma", "acik_kaynak", "etkinlik", "diger"] },
];

export const REGIONS = {
  turkiye: "Türkiye",
  yurt_disi: "Yurt dışı",
  uzaktan: "Uzaktan / online",
} as const;
export type Region = keyof typeof REGIONS;

export const WORK_MODES = {
  yerinde: "Yerinde",
  hibrit: "Hibrit",
  uzaktan: "Uzaktan",
  bilinmiyor: "Belirtilmemiş",
} as const;
export type WorkMode = keyof typeof WORK_MODES;

export const OPP_STATUSES = {
  pending: "Onay bekliyor",
  active: "Açık",
  upcoming: "Yakında açılıyor",
  closed: "Kapandı",
  rejected: "Reddedildi",
} as const;
export type OppStatus = keyof typeof OPP_STATUSES;

export const TRACK_STATUSES = {
  interested: "İlgileniyorum",
  applied: "Başvurdum",
  done: "Sonuçlandı",
  skipped: "Geçtim",
} as const;
export type TrackStatus = keyof typeof TRACK_STATUSES;

export type Opportunity = {
  id: number;
  title: string;
  organization: string;
  category: Category;
  location: string | null;
  work_mode: WorkMode;
  country: string;
  deadline: string | null; // YYYY-MM-DD
  opens_at: string | null;
  deadline_note: string | null;
  apply_url: string | null;
  source_url: string | null;
  description: string | null;
  eligibility: string | null;
  tags: string[];
  status: OppStatus;
  link_status: "ok" | "broken" | "unknown";
  link_checked_at: Date | null;
  verified_at: string | null;
  created_by: string;
  updated_by: string | null;
  created_at: Date;
  updated_at: Date;
  // kullanıcıya özel alanlar (join ile gelir)
  my_status?: TrackStatus | null;
  my_note?: string | null;
};

export type SessionUser = { id: number; username: string; display_name: string; is_admin: boolean };

/** Kişisel sayfa bilgileri. Sadece sahibi ve admin görür; sadece sahibi düzenler. */
export type Profile = SessionUser & {
  bio: string | null;
  goals: string | null;
  interests: string[];
  cv_url: string | null;
  github_url: string | null;
  linkedin_url: string | null;
  website_url: string | null;
  profile_updated_at: Date | null;
  last_seen_at: Date;
};

/** Son tarihe kalan gün (bugün = 0). Tarih yoksa null. İstanbul saatine göre hesaplanır. */
export function daysLeft(deadline: string | null, today = todayIstanbul()): number | null {
  if (!deadline) return null;
  const a = Date.parse(today + "T00:00:00Z");
  const b = Date.parse(deadline + "T00:00:00Z");
  return Math.round((b - a) / 86_400_000);
}

export function todayIstanbul(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul" }).format(new Date());
}

export function formatDate(d: string | Date | null): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d.length === 10 ? d + "T12:00:00Z" : d) : d;
  return new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Istanbul" }).format(date);
}
