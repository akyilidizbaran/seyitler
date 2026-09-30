import { readFileSync } from "node:fs";
import { connect } from "./_db";

const sql = connect();
const schema = readFileSync(new URL("../db/schema.sql", import.meta.url), "utf8");
await sql.unsafe(schema);
console.log("✓ Şema uygulandı.");
await sql.end();
