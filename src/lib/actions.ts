"use server";

import bcrypt from "bcryptjs";
import { z } from "zod";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { sql } from "./db";
import { requireUser } from "./auth";
import { unreadNotifications } from "./queries";
import { SESSION_COOKIE, SESSION_DAYS, signSession } from "./session";
import { CATEGORIES, TRACK_STATUSES, WORK_MODES, todayIstanbul } from "./types";

// ---------- Oturum ----------

export type FormState = { error?: string; ok?: boolean; username?: string } | undefined;

let dummyHash: string | undefined;

export async function login(_prev: FormState, formData: FormData): Promise<FormState> {
  const username = String(formData.get("username") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/");
  if (!username || !password) return { error: "Kullanıcı adı ve şifre gerekli." };

  const [user] = await sql<{ id: number; password_hash: string }[]>`
    select id, password_hash from users where username = ${username}
  `;
  // Kullanıcı yoksa da hash karşılaştırması yap ki yanıt süresi kullanıcı varlığını ele vermesin.
  dummyHash ??= await bcrypt.hash("kullanici-yok", 12);
  const ok = await bcrypt.compare(password, user?.password_hash ?? dummyHash);
  if (!user || !ok) return { error: "Kullanıcı adı veya şifre hatalı.", username };

  (await cookies()).set(SESSION_COOKIE, await signSession(user.id), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/");
}

export async function logout() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/giris");
}

// ---------- Fırsat ekleme / düzenleme ----------

const optionalText = z
  .string()
  .trim()
  .transform((s) => (s === "" ? null : s))
  .nullable();
const optionalDate = z
  .string()
  .trim()
  .transform((s) => (s === "" ? null : s))
  .pipe(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tarih YYYY-AA-GG olmalı").nullable());
const optionalUrl = z
  .string()
  .trim()
  .transform((s) => (s === "" ? null : s))
  .pipe(z.string().regex(/^(https?:\/\/|mailto:)/i, "Link http(s):// veya mailto: ile başlamalı").nullable());

const OpportunitySchema = z.object({
  title: z.string().trim().min(2, "Başlık gerekli"),
  organization: z.string().trim().min(1, "Kurum gerekli"),
  category: z.enum(Object.keys(CATEGORIES) as [keyof typeof CATEGORIES]),
  location: optionalText,
  work_mode: z.enum(Object.keys(WORK_MODES) as [keyof typeof WORK_MODES]),
  country: z.string().trim().min(1).default("Türkiye"),
  deadline: optionalDate,
  opens_at: optionalDate,
  deadline_note: optionalText,
  apply_url: optionalUrl,
  source_url: optionalUrl,
  description: optionalText,
  eligibility: optionalText,
  tags: z
    .string()
    .transform((s) => s.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean)),
});

function statusFor(deadline: string | null, opensAt: string | null): "active" | "upcoming" | "closed" {
  const today = todayIstanbul();
  if (deadline && deadline < today) return "closed";
  if (opensAt && opensAt > today) return "upcoming";
  return "active";
}

export async function saveOpportunity(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const idRaw = formData.get("id");
  const id = idRaw ? Number(idRaw) : null;
  const parsed = OpportunitySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues.map((i) => i.message).join(" · ") };
  const d = parsed.data;

  // Mevcut kayıt 'pending' ise düzenleme onay durumunu değiştirmez; onay ayrı butonla yapılır.
  let targetId = id;
  try {
    if (id) {
      const [current] = await sql<{ status: string }[]>`select status from opportunities where id = ${id}`;
      if (!current) return { error: "Kayıt bulunamadı." };
      const status = current.status === "pending" || current.status === "rejected" ? current.status : statusFor(d.deadline, d.opens_at);
      await sql`
        update opportunities set
          title = ${d.title}, organization = ${d.organization}, category = ${d.category}, location = ${d.location},
          work_mode = ${d.work_mode}, country = ${d.country}, deadline = ${d.deadline}, opens_at = ${d.opens_at},
          deadline_note = ${d.deadline_note}, apply_url = ${d.apply_url}, source_url = ${d.source_url},
          description = ${d.description}, eligibility = ${d.eligibility}, tags = ${d.tags}, status = ${status},
          link_status = case when apply_url is distinct from ${d.apply_url} then 'unknown' else link_status end,
          verified_at = ${todayIstanbul()}, updated_by = ${user.username}, updated_at = now()
        where id = ${id}
      `;
    } else {
      const [row] = await sql<{ id: number }[]>`
        insert into opportunities (title, organization, category, location, work_mode, country, deadline, opens_at,
          deadline_note, apply_url, source_url, description, eligibility, tags, status, verified_at, created_by)
        values (${d.title}, ${d.organization}, ${d.category}, ${d.location}, ${d.work_mode}, ${d.country}, ${d.deadline},
          ${d.opens_at}, ${d.deadline_note}, ${d.apply_url}, ${d.source_url}, ${d.description}, ${d.eligibility},
          ${d.tags}, ${statusFor(d.deadline, d.opens_at)}, ${todayIstanbul()}, ${user.username})
        returning id
      `;
      targetId = row.id;
    }
  } catch (e) {
    if (e instanceof Error && "code" in e && e.code === "23505") {
      return { error: "Aynı başlık ve başvuru linkiyle kayıtlı bir fırsat zaten var." };
    }
    throw e;
  }
  revalidatePath("/", "layout");
  redirect(`/firsatlar/${targetId}`);
}

// ---------- Onay akışı ve durum değişiklikleri ----------

export async function setOpportunityStatus(id: number, action: "approve" | "reject" | "close" | "reopen") {
  const user = await requireUser();
  const [opp] = await sql<{ deadline: string | null; opens_at: string | null }[]>`
    select deadline, opens_at from opportunities where id = ${id}
  `;
  if (!opp) return;
  const status =
    action === "reject" ? "rejected" : action === "close" ? "closed" : statusFor(opp.deadline, opp.opens_at);
  await sql`update opportunities set status = ${status}, updated_by = ${user.username}, updated_at = now() where id = ${id}`;
  revalidatePath("/", "layout");
}

// ---------- Kişisel takip ----------

export async function setTrack(opportunityId: number, status: string | null) {
  const user = await requireUser();
  if (status === null) {
    await sql`delete from user_status where user_id = ${user.id} and opportunity_id = ${opportunityId}`;
  } else if (status in TRACK_STATUSES) {
    await sql`
      insert into user_status (user_id, opportunity_id, status) values (${user.id}, ${opportunityId}, ${status})
      on conflict (user_id, opportunity_id) do update set status = excluded.status, updated_at = now()
    `;
  }
  revalidatePath("/", "layout");
}

export async function saveNote(opportunityId: number, _prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const note = String(formData.get("note") ?? "").trim() || null;
  await sql`
    insert into user_status (user_id, opportunity_id, status, note) values (${user.id}, ${opportunityId}, 'interested', ${note})
    on conflict (user_id, opportunity_id) do update set note = excluded.note, updated_at = now()
  `;
  revalidatePath(`/firsatlar/${opportunityId}`);
  return { ok: true };
}

// ---------- Kişisel sayfa ----------

const ProfileSchema = z.object({
  display_name: z.string().trim().min(1, "Görünen ad gerekli").max(60),
  bio: optionalText,
  goals: optionalText,
  interests: z.string().transform((s) => s.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean).slice(0, 20)),
  cv_url: optionalUrl,
  github_url: optionalUrl,
  linkedin_url: optionalUrl,
  website_url: optionalUrl,
});

/** Sadece oturumdaki kullanıcının kendi profilini günceller. Admin başkasının profilini düzenleyemez. */
export async function saveProfile(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = ProfileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues.map((i) => i.message).join(" · ") };
  const p = parsed.data;
  await sql`
    update users set display_name = ${p.display_name}, bio = ${p.bio}, goals = ${p.goals}, interests = ${p.interests},
      cv_url = ${p.cv_url}, github_url = ${p.github_url}, linkedin_url = ${p.linkedin_url}, website_url = ${p.website_url},
      profile_updated_at = now()
    where id = ${user.id}
  `;
  revalidatePath("/", "layout");
  redirect("/sayfam");
}

// ---------- Şifre ----------

/** Kullanıcı sadece KENDİ şifresini, mevcut şifresini doğrulayarak değiştirir. Admin başkasının şifresini değiştiremez. */
export async function changePassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("next") ?? "");
  const repeat = String(formData.get("repeat") ?? "");
  if (next.length < 8) return { error: "Yeni şifre en az 8 karakter olmalı." };
  if (next !== repeat) return { error: "Yeni şifreler eşleşmiyor." };
  if (next === current) return { error: "Yeni şifre eskisiyle aynı olamaz." };
  if (next.toLowerCase().includes(user.username)) return { error: "Şifre kullanıcı adını içermesin." };

  const [row] = await sql<{ password_hash: string }[]>`select password_hash from users where id = ${user.id}`;
  if (!row || !(await bcrypt.compare(current, row.password_hash))) return { error: "Mevcut şifre hatalı." };

  await sql`
    update users set password_hash = ${await bcrypt.hash(next, 12)}, password_changed_at = now() where id = ${user.id}
  `;
  revalidatePath("/", "layout");
  return { ok: true };
}

// ---------- Bildirimler ----------

export async function markNotificationRead(opportunityId: number, kind: "deadline" | "new") {
  const user = await requireUser();
  if (kind !== "deadline" && kind !== "new") return;
  await sql`
    insert into notification_reads (user_id, opportunity_id, kind) values (${user.id}, ${opportunityId}, ${kind})
    on conflict do nothing
  `;
  revalidatePath("/", "layout");
}

export async function markAllNotificationsRead() {
  const user = await requireUser();
  const [deadline, fresh] = await Promise.all([
    unreadNotifications(user.id, "deadline"),
    unreadNotifications(user.id, "new"),
  ]);
  const rows = [
    ...deadline.map((o) => ({ user_id: user.id, opportunity_id: o.id, kind: "deadline" })),
    ...fresh.map((o) => ({ user_id: user.id, opportunity_id: o.id, kind: "new" })),
  ];
  if (rows.length) await sql`insert into notification_reads ${sql(rows)} on conflict do nothing`;
  revalidatePath("/", "layout");
}
