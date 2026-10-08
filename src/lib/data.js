// All reads/writes go through here. Supabase enforces privacy (see supabase/setup.sql).
import { createClient } from "@supabase/supabase-js";

const URL = import.meta.env.VITE_SUPABASE_URL;
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const configured = Boolean(URL && KEY) || Boolean(typeof window !== "undefined" && window.__SUPABASE_TEST_CLIENT__);
export const sb = typeof window !== "undefined" && window.__SUPABASE_TEST_CLIENT__
  ? window.__SUPABASE_TEST_CLIENT__ // used only by the automated UI tests
  : configured ? createClient(URL, KEY, { auth: { persistSession: true, autoRefreshToken: true } }) : null;

export class AppError extends Error {}
const friendly = (error) => {
  const m = String(error?.message || error || "");
  if (/Invalid login credentials/i.test(m)) return "Wrong email or password.";
  if (/already registered|already exists/i.test(m)) return "This email already has an account. Log in instead.";
  if (/Password should be/i.test(m)) return "Use a password of at least 6 characters.";
  if (/rate limit/i.test(m)) return "Too many attempts. Wait a minute and try again.";
  if (/Failed to fetch|NetworkError/i.test(m)) return "Can't reach the server. Check your internet connection.";
  if (/row-level security|permission denied/i.test(m)) return "You don't have permission to do that.";
  if (/check constraint/i.test(m)) return "Some values aren't valid. Check the form and try again.";
  if (/duplicate key/i.test(m)) return "This is already in your list.";
  return m || "Something went wrong. Try again.";
};
const run = async (p) => {
  const { data, error } = await p;
  if (error) throw new AppError(friendly(error));
  return data;
};

// ---------------------------------------------------------------- auth
export const getSession = async () => (await sb.auth.getSession()).data.session;
export const onAuth = (fn) => sb.auth.onAuthStateChange((_e, session) => fn(session)).data.subscription;
export const signIn = (email, password) => run(sb.auth.signInWithPassword({ email: email.trim(), password }));
export const signUp = (email, password) => run(sb.auth.signUp({ email: email.trim(), password }));
export const signOut = () => sb.auth.signOut();
export const isAdmin = async () => Boolean(await run(sb.rpc("is_admin")));

// ---------------------------------------------------------------- profile
export const getProfile = async (uid) => (await run(sb.from("profiles").select("*").eq("id", uid).limit(1)))[0] || null;
export const saveProfile = (uid, email, p) => run(sb.from("profiles").upsert({
  ...p, id: uid, email, updated_at: new Date().toISOString(), last_seen_at: new Date().toISOString(),
}).select().single());
export const touchLastSeen = (uid) => sb.from("profiles").update({ last_seen_at: new Date().toISOString() }).eq("id", uid).then(() => {}, () => {});

// ---------------------------------------------------------------- applications
export const STATUSES = [
  { key: "to_apply", label: "To apply" }, { key: "applied", label: "Applied" }, { key: "exam", label: "Exam" },
  { key: "interview", label: "Interview" }, { key: "selected", label: "Selected" }, { key: "rejected", label: "Not selected" },
];
export const STATUS_LABEL = Object.fromEntries(STATUSES.map((s) => [s.key, s.label]));
export const listApplications = (uid) => run(sb.from("applications").select("*").eq("user_id", uid).order("created_at", { ascending: false }));
export const addApplication = (row) => run(sb.from("applications").insert({
  ...row, history: [{ to: row.status || "to_apply", at: new Date().toISOString() }],
}).select().single());
export const updateApplication = (app, patch) => {
  const now = new Date().toISOString();
  const next = { ...patch, updated_at: now };
  if (patch.status && patch.status !== app.status) {
    next.history = [...(app.history || []), { from: app.status, to: patch.status, at: now }];
    if (patch.status === "applied" && !app.applied_date) next.applied_date = now.slice(0, 10);
  }
  return run(sb.from("applications").update(next).eq("id", app.id).select().single());
};
export const deleteApplication = (id) => run(sb.from("applications").delete().eq("id", id));

// ---------------------------------------------------------------- mock tests
export const EXAM_GROUPS = { banking: "Banking", ssc: "SSC", railways: "Railways", insurance: "Insurance", tet: "TET / Teaching", net: "NET / CSIR", other: "Other" };
export const listMocks = (uid) => run(sb.from("mock_tests").select("*").eq("user_id", uid).order("test_date", { ascending: false }));
export const addMock = (row) => run(sb.from("mock_tests").insert(row).select().single());
export const deleteMock = (id) => run(sb.from("mock_tests").delete().eq("id", id));

// ---------------------------------------------------------------- admin (read-only; database allows only admins)
export const adminAll = async () => {
  const [profiles, applications, mocks] = await Promise.all([
    run(sb.from("profiles").select("*").order("last_seen_at", { ascending: false })),
    run(sb.from("applications").select("*")),
    run(sb.from("mock_tests").select("*")),
  ]);
  return { profiles, applications, mocks };
};

// ---------------------------------------------------------------- openings (public file updated by the daily scan)
export async function loadOpenings() {
  const res = await fetch(`/openings.json?t=${Date.now()}`);
  if (!res.ok) throw new AppError("Couldn't load openings. Refresh the page.");
  const body = await res.json();
  return { updatedAt: body.updated_at || null, items: Array.isArray(body.openings) ? body.openings : [] };
}
