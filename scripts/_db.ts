import postgres from "postgres";

export function connect() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL tanımlı değil. .env.local dosyasını oluşturun veya ortam değişkeni verin.");
    process.exit(1);
  }
  return postgres(url, {
    prepare: false,
    max: Number(process.env.DATABASE_POOL_MAX ?? 3),
    onnotice: () => {},
    types: { date: { to: 1082, from: [1082], serialize: (x: string) => x, parse: (x: string) => x } },
  });
}

export function todayIstanbul(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul" }).format(new Date());
}

export type SeedItem = {
  title: string;
  organization: string;
  category: string;
  location: string | null;
  work_mode: string;
  country: string;
  deadline: string | null;
  opens_at: string | null;
  deadline_note: string | null;
  apply_url: string | null;
  source_url: string | null;
  description: string | null;
  eligibility: string | null;
  tags: string[];
  status?: string;
  verified_at?: string | null;
};

/** Tarihlere bakarak durumu hesaplar: geçmiş son tarih → closed, gelecekteki açılış → upcoming. */
export function statusFor(deadline: string | null, opensAt: string | null, today = todayIstanbul()) {
  if (deadline && deadline < today) return "closed";
  if (opensAt && opensAt > today) return "upcoming";
  return "active";
}
