import { evaluate } from "./eligibility";
import { priorityLabel, score } from "./scoring";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const todayISO = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
export const daysFrom = (iso, ref = todayISO()) => (iso ? Math.round((new Date(iso + "T00:00:00") - new Date(ref + "T00:00:00")) / 86400000) : null);
export const fmtDate = (iso, year = true) => { if (!iso) return null; const [y, m, d] = iso.slice(0, 10).split("-").map(Number); return `${d} ${MONTHS[m - 1]}${year ? ` ${y}` : ""}`; };
export const fmtWhen = (ts) => { if (!ts) return "—"; const d = new Date(ts); return `${d.getDate()} ${MONTHS[d.getMonth()]}, ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`; };
export const urgency = (days) => (days == null ? "none" : days < 0 ? "past" : days <= 3 ? "red" : days <= 7 ? "orange" : days <= 30 ? "yellow" : "green");
export const leftText = (days) => (days == null ? "" : days < 0 ? "closed" : days === 0 ? "closes today" : days === 1 ? "1 day left" : `${days} days left`);

/** Attach eligibility + match score for this person to each opening. */
export function rate(openings, profile) {
  const today = todayISO();
  return openings.map((o) => {
    const r = evaluate(o.requirements, profile || {}, today);
    const s = score(o, r, profile || {}, today);
    return { ...o, elig: r, match: s.total, label: priorityLabel(s.total), daysLeft: daysFrom(o.application_end, today) };
  });
}

export function mockSummary(mocks) {
  if (!mocks.length) return null;
  const sorted = [...mocks].sort((a, b) => a.test_date.localeCompare(b.test_date));
  const pct = sorted.map((m) => Math.round((1000 * Number(m.score)) / Number(m.total_marks)) / 10);
  const avg = (a) => Math.round((10 * a.reduce((x, y) => x + y, 0)) / a.length) / 10;
  const half = Math.max(1, Math.floor(pct.length / 2));
  return { count: pct.length, average: avg(pct), best: Math.max(...pct), latest: pct.at(-1),
    change: pct.length > 1 ? Math.round(10 * (avg(pct.slice(half)) - avg(pct.slice(0, half)))) / 10 : 0, series: pct };
}
