// Priority score 0–100 (port of services/scoring.py). NOT_ELIGIBLE is capped at 40.
import { AFTER_BED, AFTER_TET, CURRENTLY, NOT, POTENTIAL } from "./eligibility";
import { CODING_HEAVY, HIGH_VALUE, LOWER_VALUE, TRACK } from "./tracks";

const ELIG_POINTS = { [CURRENTLY]: 25, [POTENTIAL]: 16, [AFTER_BED]: 13, [AFTER_TET]: 9, [NOT]: 0 };
const ALL_INDIA = ["all india", "pan india", "anywhere in india", "multiple locations", "various", "india"];
export const NOT_ELIGIBLE_CAP = 40;

export const priorityLabel = (s) => (s >= 90 ? "excellent" : s >= 75 ? "strong" : s >= 60 ? "consider" : "low");

export function daysBetween(fromIso, toIso) {
  if (!fromIso || !toIso) return null;
  return Math.round((new Date(toIso + "T00:00:00") - new Date(fromIso + "T00:00:00")) / 86400000);
}

export function score(o, result, profile, today) {
  const req = o.requirements || {};
  const title = ` ${String(o.title || "").toLowerCase()} `;
  const t = TRACK[o.track];
  const checks = result.checks;
  const part = (pts, max, reason) => ({ points: pts, max, reason });

  let role = part(t ? t.relevance : 15, 25, `${t ? t.label : o.track} track`);
  if (o.track === "corporate" && profile?.avoid_heavy_coding !== false && (req.coding_heavy || CODING_HEAVY.some((k) => title.includes(k))))
    role = part(5, 25, "Coding-heavy role (deprioritised by your preferences)");

  const edu = checks.find((c) => c.key === "education");
  const subjects = (req.subjects || []).map((s) => String(s).toLowerCase());
  const realReq = Object.keys(req).filter((k) => !k.startsWith("_")).length > 0;
  const qual = !realReq ? part(7, 15, "Requirements not extracted") : !edu ? part(10, 15, "No specific education requirement")
    : edu.result === "fail" ? part(0, 15, "Education requirement not met")
    : subjects.length && !subjects.includes("any") ? part(15, 15, "Subject-specific match (your degree subject)") : part(12, 15, "General qualification match");

  const ex = checks.find((c) => c.key === "experience");
  const exp = !ex ? (realReq ? part(9, 10, "No experience requirement stated") : part(7, 10, "Experience not stated"))
    : ex.result === "pass" ? part(10, 10, "Experience OK") : part(0, 10, "Experience requirement not met");

  const loc = String(o.location || "").toLowerCase();
  const pref = (profile?.preferred_locations || []).filter(Boolean);
  const location = !o.location ? part(6, 10, "Location not stated") : pref.some((p) => loc.includes(p.toLowerCase())) ? part(10, 10, "In your preferred locations")
    : ALL_INDIA.some((h) => loc.includes(h)) ? part(8, 10, "All-India posting") : part(4, 10, "Outside your preferred locations");

  const base = t ? t.career : 7;
  const career = HIGH_VALUE.some((k) => title.includes(k)) ? part(Math.min(10, base + 1), 10, "Officer/specialist-level role")
    : LOWER_VALUE.some((k) => title.includes(k)) ? part(Math.max(5, base - 2), 10, "Entry/experience-building role") : part(base, 10, "Standard role for the track");

  const d = daysBetween(today, o.application_end);
  const urgency = d == null ? part(1, 5, "No deadline stated") : d < 0 ? part(0, 5, "Deadline passed") : d <= 7 ? part(5, 5, `Closes in ${d} day(s)`)
    : d <= 14 ? part(4, 5, `Closes in ${d} days`) : d <= 30 ? part(3, 5, `Closes in ${d} days`) : part(2, 5, `Closes in ${d} days`);

  const breakdown = { role_relevance: role, eligibility: part(ELIG_POINTS[result.status], 25, result.label), qualification: qual,
    experience: exp, location, career_value: career, deadline_urgency: urgency };
  let total = Object.values(breakdown).reduce((a, b) => a + b.points, 0);
  if (result.status === NOT && total > NOT_ELIGIBLE_CAP) {
    total = NOT_ELIGIBLE_CAP;
    breakdown._override = part(0, 0, `Capped at ${NOT_ELIGIBLE_CAP}: hard eligibility rule failed`);
  }
  return { total, breakdown };
}
