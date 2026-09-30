import postgres from "postgres";

declare global {
  var __sql: postgres.Sql | undefined;
}

function createClient() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL tanımlı değil (.env.local dosyasına bakın).");
  // prepare:false → Supabase/Neon pooler (transaction mode) ile uyumlu.
  return postgres(url, {
    prepare: false,
    max: Number(process.env.DATABASE_POOL_MAX ?? 5),
    idle_timeout: 20,
    // `date` kolonlarını saat dilimi kaymasın diye 'YYYY-MM-DD' metni olarak bırak.
    types: { date: { to: 1082, from: [1082], serialize: (x: string) => x, parse: (x: string) => x } },
  });
}

// İstemci ilk sorguda oluşturulur: build sırasında DATABASE_URL olmasa da modül yüklenebilir.
// globalThis'te tutulur ki dev modundaki hot-reload her seferinde yeni bağlantı havuzu açmasın.
const client = () => (globalThis.__sql ??= createClient());

export const sql = new Proxy(function () {} as unknown as postgres.Sql, {
  apply: (_target, _this, args) => (client() as unknown as (...a: unknown[]) => unknown)(...args),
  get: (_target, prop) => Reflect.get(client(), prop),
});
