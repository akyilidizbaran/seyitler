import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { sql } from "./db";
import { SESSION_COOKIE, verifySession } from "./session";
import type { SessionUser } from "./types";

/** Oturumdaki kullanıcıyı döndürür; yoksa null. Aynı istek içinde tek sorgu yapılır. */
export const getUser = cache(async (): Promise<SessionUser | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const id = await verifySession(token);
  if (!id) return null;
  const [user] = await sql<SessionUser[]>`select id, username, display_name, is_admin, password_changed_at from users where id = ${id}`;
  return user ?? null;
});

export async function requireUser(): Promise<SessionUser> {
  const user = await getUser();
  if (!user) redirect("/giris");
  return user;
}

/** Admin değilse 404 döner (sayfanın varlığını da belli etmemek için). */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (!user.is_admin) notFound();
  return user;
}
