// Docker/Postgres kurmadan yerel geliştirme için gömülü Postgres (PGlite) sunucusu.
// Kullanım: npm run dev:db  →  DATABASE_URL=postgres://postgres@127.0.0.1:5433/postgres
import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";

const port = Number(process.env.PORT ?? 5433);
const db = await PGlite.create("./.pglite");
const server = new PGLiteSocketServer({ db, port, host: "127.0.0.1", maxConnections: 20 });
await server.start();
console.log(`PGlite hazır: postgres://postgres@127.0.0.1:${port}/postgres (durdurmak için Ctrl+C)`);

const stop = async () => {
  await server.stop();
  await db.close();
  process.exit(0);
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
