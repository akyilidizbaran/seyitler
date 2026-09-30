// Kullanıcıları bir kez oluşturur. Var olan kullanıcının şifresine DOKUNMAZ (şifreler sabit kalır);
// sadece "is_admin" alanı verilmişse admin yetkisini günceller.
//
// Kullanım:
//   1) users.local.json oluşturun (git'e girmez):
//      [{ "username": "yonetici", "display_name": "Yönetici", "is_admin": true }, { "username": "kullanici1", "display_name": "Kullanıcı 1" }]
//      "password" verilmezse güçlü bir şifre üretilir.
//   2) npm run users:create
//   3) Üretilen şifreler users.credentials.local.txt dosyasına yazılır; arkadaşlarınıza iletip dosyayı silin.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { connect } from "./_db";

type Input = { username: string; display_name: string; password?: string; is_admin?: boolean };

const file = process.argv[2] ?? "users.local.json";
if (!existsSync(file)) {
  console.error(`${file} bulunamadı. Örnek için users.example.json dosyasına bakın.`);
  process.exit(1);
}
const users: Input[] = JSON.parse(readFileSync(file, "utf8"));
const sql = connect();

// Karışması kolay karakterler (0/O, 1/l/I) çıkarıldı.
function generatePassword() {
  const alphabet = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(14);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

const created: string[] = [];
for (const u of users) {
  const username = u.username.trim().toLowerCase();
  if (!/^[a-z0-9._-]{2,32}$/.test(username)) {
    console.error(`✗ Geçersiz kullanıcı adı: "${u.username}" (a-z, 0-9, . _ - ; 2–32 karakter)`);
    continue;
  }
  const [exists] = await sql<{ is_admin: boolean }[]>`select is_admin from users where username = ${username}`;
  if (exists) {
    if (typeof u.is_admin === "boolean" && u.is_admin !== exists.is_admin) {
      await sql`update users set is_admin = ${u.is_admin} where username = ${username}`;
      console.log(`• ${username} zaten var; admin yetkisi ${u.is_admin ? "verildi" : "kaldırıldı"} (şifre değişmedi).`);
    } else console.log(`• ${username} zaten var, atlandı (şifre değişmedi).`);
    continue;
  }
  const password = u.password ?? generatePassword();
  if (password.length < 10) {
    console.error(`✗ ${username}: şifre en az 10 karakter olmalı.`);
    continue;
  }
  await sql`
    insert into users (username, display_name, password_hash, is_admin)
    values (${username}, ${u.display_name.trim()}, ${await bcrypt.hash(password, 12)}, ${u.is_admin === true})
  `;
  created.push(`${username}\t${password}`);
  console.log(`✓ ${username} oluşturuldu${u.is_admin ? " (admin)" : ""}.`);
}

if (created.length) {
  const out = "users.credentials.local.txt";
  writeFileSync(out, `# kullanıcı_adı<TAB>şifre — kişilere ilettikten sonra bu dosyayı silin\n${created.join("\n")}\n`, { mode: 0o600 });
  console.log(`\nŞifreler ${out} dosyasına yazıldı (ekrana basılmadı).`);
}
await sql.end();
