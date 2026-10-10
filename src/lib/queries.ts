import "server-only";
import { sql } from "./db";
import { CATEGORIES, OPP_STATUSES, TRACK_STATUSES, todayIstanbul, type Opportunity, type Profile, type SessionUser } from "./types";

const oppColumns = () => sql`
  o.id, o.title, o.organization, o.category, o.location, o.work_mode, o.country, o.deadline, o.opens_at,
  o.deadline_note, o.apply_url, o.source_url, o.description, o.eligibility, o.tags, o.status, o.link_status,
  o.link_checked_at, o.verified_at, o.created_by, o.updated_by, o.created_at, o.updated_at,
  us.status as my_status, us.note as my_note
`;

export type ListFilters = {
  category?: string;
  status?: string; // 'acik' (active+upcoming) | OppStatus
  q?: string;
  track?: string; // TrackStatus | 'none'
  region?: string; // Region
};

export async function listOpportunities(userId: number, f: ListFilters): Promise<Opportunity[]> {
  const conds = [sql`true`];
  if (f.category && f.category in CATEGORIES) conds.push(sql`o.category = ${f.category}`);
  if (!f.status || f.status === "acik") conds.push(sql`o.status in ('active','upcoming')`);
  else if (f.status in OPP_STATUSES) conds.push(sql`o.status = ${f.status}`);
  if (f.region === "turkiye") conds.push(sql`o.country = 'Türkiye'`);
  else if (f.region === "yurt_disi") conds.push(sql`o.country not in ('Türkiye', 'Online')`);
  else if (f.region === "uzaktan") conds.push(sql`(o.work_mode = 'uzaktan' or o.country = 'Online')`);
  if (f.track === "none") conds.push(sql`us.status is null`);
  else if (f.track && f.track in TRACK_STATUSES) conds.push(sql`us.status = ${f.track}`);
  if (f.q?.trim()) {
    const like = `%${f.q.trim()}%`;
    conds.push(sql`(o.title ilike ${like} or o.organization ilike ${like} or o.description ilike ${like}
                    or o.location ilike ${like} or array_to_string(o.tags, ' ') ilike ${like})`);
  }
  const where = conds.reduce((acc, c) => sql`${acc} and ${c}`);
  return sql<Opportunity[]>`
    select ${oppColumns()}
    from opportunities o
    left join user_status us on us.opportunity_id = o.id and us.user_id = ${userId}
    where ${where}
    order by (o.deadline is null), coalesce(o.deadline, o.opens_at), o.updated_at desc
  `;
}

export async function getOpportunity(id: number, userId: number): Promise<Opportunity | null> {
  const [row] = await sql<Opportunity[]>`
    select ${oppColumns()}
    from opportunities o
    left join user_status us on us.opportunity_id = o.id and us.user_id = ${userId}
    where o.id = ${id}
  `;
  return row ?? null;
}

/** Son tarihi `days` gün içinde olan, kullanıcının kapatmadığı (sonuçlandı/geçtim değil) açık fırsatlar. */
export async function urgentOpportunities(userId: number, days: number): Promise<Opportunity[]> {
  const today = todayIstanbul();
  return sql<Opportunity[]>`
    select ${oppColumns()}
    from opportunities o
    left join user_status us on us.opportunity_id = o.id and us.user_id = ${userId}
    where o.status = 'active' and o.deadline between ${today}::date and ${today}::date + ${days}::int
      and (us.status is null or us.status in ('interested'))
    order by o.deadline
  `;
}

/** Admin'in "Son görülme" bilgisi için; her sayfa açılışında güncellenir. */
export async function markSeen(userId: number) {
  await sql`update users set last_seen_at = now() where id = ${userId}`;
}

export type NotificationKind = "deadline" | "new";

// Bildirim kuralları ("Okudum" denene ya da son tarih geçene kadar kalır):
//  - deadline: açık, son tarihi 7 gün içinde, kullanıcının "Başvurdum/Sonuçlandı/Geçtim" demediği fırsatlar
//  - new: kullanıcının hesabı açıldıktan sonra ve son 30 günde eklenen açık/yakında/onay bekleyen fırsatlar
// Son tarihi geçen fırsatın bildirimi, tarama durumu henüz "closed" yapmamış olsa bile kendiliğinden düşer.
function unreadWhere(userId: number, kind: NotificationKind) {
  const today = todayIstanbul();
  const base =
    kind === "deadline"
      ? sql`o.status = 'active' and o.deadline between ${today}::date and ${today}::date + 7
            and (us.status is null or us.status = 'interested')`
      : sql`o.status in ('active','upcoming','pending') and o.created_at > now() - interval '30 days'
            and o.created_at > (select created_at from users where id = ${userId})
            and (o.deadline is null or o.deadline >= ${today}::date)`;
  return sql`${base} and not exists (
    select 1 from notification_reads nr where nr.user_id = ${userId} and nr.opportunity_id = o.id and nr.kind = ${kind}
  )`;
}

export async function unreadNotifications(userId: number, kind: NotificationKind): Promise<Opportunity[]> {
  return sql<Opportunity[]>`
    select ${oppColumns()}
    from opportunities o
    left join user_status us on us.opportunity_id = o.id and us.user_id = ${userId}
    where ${unreadWhere(userId, kind)}
    order by ${kind === "deadline" ? sql`o.deadline` : sql`o.created_at desc`}
  `;
}

export async function notificationCount(userId: number): Promise<number> {
  const [row] = await sql<{ n: number }[]>`
    select
      (select count(*) from opportunities o
         left join user_status us on us.opportunity_id = o.id and us.user_id = ${userId}
         where ${unreadWhere(userId, "deadline")})
    + (select count(*) from opportunities o
         left join user_status us on us.opportunity_id = o.id and us.user_id = ${userId}
         where ${unreadWhere(userId, "new")}) as n
  `;
  return Number(row?.n ?? 0);
}

export async function dashboardStats(userId: number) {
  const [counts] = await sql<{ open: number; pending: number; closed: number }[]>`
    select
      count(*) filter (where status in ('active','upcoming'))::int as open,
      count(*) filter (where status = 'pending')::int as pending,
      count(*) filter (where status = 'closed')::int as closed
    from opportunities
  `;
  const byCategory = await sql<{ category: string; n: number }[]>`
    select category, count(*)::int as n from opportunities
    where status in ('active','upcoming') group by category order by n desc
  `;
  const mine = await sql<{ status: string; n: number }[]>`
    select us.status, count(*)::int as n from user_status us
    join opportunities o on o.id = us.opportunity_id
    where us.user_id = ${userId} group by us.status
  `;
  const [lastRun] = await sql<{ finished_at: Date | null; ok: boolean | null; opened: number; closed: number; broken: number; suggested: number }[]>`
    select finished_at, ok, opened, closed, broken, suggested from refresh_runs order by id desc limit 1
  `;
  return {
    counts: counts ?? { open: 0, pending: 0, closed: 0 },
    byCategory,
    mine: Object.fromEntries(mine.map((m) => [m.status, m.n])) as Record<string, number>,
    lastRun: lastRun ?? null,
  };
}

export async function refreshRuns(limit = 20) {
  return sql<{ id: number; started_at: Date; finished_at: Date | null; ok: boolean | null; opened: number; closed: number; broken: number; suggested: number; log: string }[]>`
    select * from refresh_runs order by id desc limit ${limit}
  `;
}

// ---------- Kişisel sayfalar (sadece sahibi ve admin) ----------

export async function getProfile(username: string): Promise<Profile | null> {
  const [row] = await sql<Profile[]>`
    select id, username, display_name, is_admin, password_changed_at, bio, goals, interests, cv_url, github_url, linkedin_url, website_url,
           profile_updated_at, last_seen_at
    from users where username = ${username}
  `;
  return row ?? null;
}

/** Bir kullanıcının takip ettiği fırsatlar. Çağıran taraf erişim yetkisini (sahip veya admin) kontrol etmelidir. */
export async function userTracking(userId: number): Promise<Opportunity[]> {
  return sql<Opportunity[]>`
    select o.*, us.status as my_status, us.note as my_note
    from user_status us join opportunities o on o.id = us.opportunity_id
    where us.user_id = ${userId}
    order by (o.deadline is null), o.deadline, us.updated_at desc
  `;
}

export type UserSummary = SessionUser & {
  last_seen_at: Date;
  interested: number;
  applied: number;
  done: number;
  skipped: number;
  upcoming_deadlines: number;
};

/** Admin paneli: tüm kullanıcılar ve takip sayıları. */
export async function listUsersWithStats(): Promise<UserSummary[]> {
  const today = todayIstanbul();
  return sql<UserSummary[]>`
    select u.id, u.username, u.display_name, u.is_admin, u.password_changed_at, u.last_seen_at,
      count(us.*) filter (where us.status = 'interested')::int as interested,
      count(us.*) filter (where us.status = 'applied')::int as applied,
      count(us.*) filter (where us.status = 'done')::int as done,
      count(us.*) filter (where us.status = 'skipped')::int as skipped,
      count(us.*) filter (where us.status = 'interested' and o.status = 'active'
                            and o.deadline between ${today}::date and ${today}::date + 14)::int as upcoming_deadlines
    from users u
    left join user_status us on us.user_id = u.id
    left join opportunities o on o.id = us.opportunity_id
    group by u.id
    order by u.display_name
  `;
}

// ---------- Admine not ----------

export type AdminNote = {
  id: number;
  user_id: number;
  username: string;
  display_name: string;
  body: string;
  status: "open" | "done" | "wontfix";
  admin_reply: string | null;
  created_at: Date;
  resolved_at: Date | null;
};

/** userId verilirse sadece o kullanıcının notları; verilmezse (admin) hepsi. Açık olanlar üstte. */
export async function listAdminNotes(userId?: number): Promise<AdminNote[]> {
  return sql<AdminNote[]>`
    select n.id, n.user_id, u.username, u.display_name, n.body, n.status, n.admin_reply, n.created_at, n.resolved_at
    from admin_notes n join users u on u.id = n.user_id
    where ${userId === undefined ? sql`true` : sql`n.user_id = ${userId}`}
    order by (n.status <> 'open'), n.created_at desc
  `;
}

export async function openAdminNoteCount(): Promise<number> {
  const [row] = await sql<{ n: number }[]>`select count(*)::int as n from admin_notes where status = 'open'`;
  return row?.n ?? 0;
}
