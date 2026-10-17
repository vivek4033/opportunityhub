// Deterministic eligibility engine (port of the tested Python version).
// Hard rules decide the verdict; AI can only propose the `requirements` object.
export const CURRENTLY = "CURRENTLY_ELIGIBLE", AFTER_BED = "ELIGIBLE_AFTER_BED", AFTER_TET = "ELIGIBLE_AFTER_TET",
  POTENTIAL = "POTENTIALLY_ELIGIBLE", NOT = "NOT_ELIGIBLE";
export const STATUS_LABELS = { [CURRENTLY]: "Currently eligible", [AFTER_BED]: "Eligible after B.Ed", [AFTER_TET]: "Eligible after TET",
  [POTENTIAL]: "Likely eligible", [NOT]: "Not eligible" };

const RANK = { "10th": 1, "12th": 2, diploma: 2.5, bachelor: 3, master: 4, phd: 5 };
const SCIENCE = ["physics", "chemistry", "biology", "botany", "zoology", "mathematics", "maths", "electronics", "applied physics", "biochemistry", "microbiology"];
const TET_ALIASES = { tntet: "TNTET", "tn tet": "TNTET", ktet: "KTET", "kerala tet": "KTET", "k-tet": "KTET", ctet: "CTET" };
const norm = (s) => String(s || "").trim().toLowerCase();
const STATE_SHORT = { tn: "tamil nadu", "tamilnadu": "tamil nadu", kl: "kerala", ka: "karnataka", ap: "andhra pradesh", py: "puducherry", pondicherry: "puducherry" };
const STATE_ALIASES = (s) => STATE_SHORT[s.replace(/\./g, "")] || s;
const canonTet = (s) => TET_ALIASES[norm(s)] || String(s).trim().toUpperCase();
const fmt = (d) => new Date(d + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

function subjectOk(subject, accepted) {
  if (!accepted?.length || accepted.some((a) => ["any", "any discipline", "any subject"].includes(norm(a)))) return true;
  const cs = norm(subject);
  if (!cs) return null;
  return accepted.some((a) => {
    a = norm(a);
    if (a === "science" && SCIENCE.some((s) => cs.includes(s))) return true;
    return a && (a.includes(cs) || cs.includes(a));
  });
}
function degreeOk(degree, accepted) {
  if (!accepted?.length) return true;
  const cd = norm(degree).replace(/[. ]/g, "");
  if (!cd) return null;
  return accepted.some((a) => norm(a).replace(/[. ]/g, "") === cd);
}
export function ageOn(dob, on) {
  const b = new Date(dob + "T00:00:00"), o = new Date(on + "T00:00:00");
  let a = o.getFullYear() - b.getFullYear();
  if (o.getMonth() < b.getMonth() || (o.getMonth() === b.getMonth() && o.getDate() < b.getDate())) a--;
  return a;
}

export function candidateSummary(p) {
  const top = (p?.education || []).filter((e) => RANK[e.level] && e.status === "completed").sort((a, b) => RANK[b.level] - RANK[a.level])[0];
  const parts = [];
  if (top) parts.push([top.degree, top.subject].filter(Boolean).join(" ") || top.level);
  const bed = (p?.education || []).find((e) => e.level === "bed");
  if (bed) parts.push(bed.status === "pursuing" ? `B.Ed ${bed.completion_year || ""}`.trim() : "B.Ed");
  return parts.join(" | ");
}

export function evaluate(reqIn, p, today) {
  const req = Object.fromEntries(Object.entries(reqIn || {}).filter(([k]) => !k.startsWith("_")));
  const checks = [];
  const add = (key, label, result, detail) => checks.push({ key, label, result, detail });
  const edu = p?.education || [];
  if (!Object.keys(req).length) {
    add("requirements", "Eligibility criteria", "unknown", "Eligibility criteria not extracted yet — read the official notification.");
    return resolve(checks);
  }
  if (req.min_education) {
    const need = RANK[req.min_education] || 0;
    const qualifying = edu.filter((e) => RANK[e.level] && RANK[e.level] >= need && (e.status === "completed" || req.allow_pursuing));
    if (!edu.length) add("education", "Education", "unknown", `Requires ${req.min_education}-level qualification; add your education in Profile.`);
    else if (!qualifying.length) add("education", "Education", "fail", `Requires ${req.min_education}-level qualification; not held.`);
    else {
      let atLevel = qualifying.filter((e) => e.level === req.min_education);
      if (!atLevel.length) atLevel = [...qualifying].sort((a, b) => RANK[a.level] - RANK[b.level]);
      const sOk = atLevel.filter((r) => subjectOk(r.subject, req.subjects));
      const dOk = sOk.filter((r) => degreeOk(r.degree, req.degree_names) !== false);
      if (!sOk.length) add("education", "Education", "fail", `Requires subject: ${(req.subjects || []).join(", ")}.`);
      else if (!dOk.length) add("education", "Education", "fail", `Requires degree: ${(req.degree_names || []).join(", ")}.`);
      else {
        const r = dOk[0];
        add("education", "Education", "pass", `${[r.degree, r.subject].filter(Boolean).join(" ") || r.level} meets the requirement.`);
        if (req.min_percentage != null) {
          if (r.percentage == null) add("percentage", "Minimum marks", "unknown", `Requires ${req.min_percentage}%; your % not recorded.`);
          else if (Number(r.percentage) >= Number(req.min_percentage)) add("percentage", "Minimum marks", "pass", `${r.percentage}% ≥ required ${req.min_percentage}%.`);
          else add("percentage", "Minimum marks", "fail", `${r.percentage}% < required ${req.min_percentage}%.`);
        }
      }
    }
  }
  if (req.min_percentage_school != null) {
    const need = Number(req.min_percentage_school);
    for (const lvl of ["10th", "12th"]) {
      const r = edu.find((e) => e.level === lvl);
      if (!r || r.percentage == null) add(`school_${lvl}`, `${lvl} marks`, "unknown", `Requires ${need}% in ${lvl}; add your ${lvl} marks in Profile.`);
      else add(`school_${lvl}`, `${lvl} marks`, Number(r.percentage) >= need ? "pass" : "fail", Number(r.percentage) >= need ? `${r.percentage}% ≥ ${need}% in ${lvl}.` : `${lvl}: ${r.percentage}% < required ${need}%.`);
    }
  }
  if (req.passing_years?.length) {
    const years = req.passing_years.map(Number);
    const need = RANK[req.min_education] || RANK.bachelor;
    const degs = edu.filter((e) => RANK[e.level] >= need && e.level !== "bed");
    const withYear = degs.filter((e) => e.completion_year);
    const list = years.join(" / ");
    if (!withYear.length) add("batch", "Graduation year", "unknown", `Only for ${list} graduates; add your degree's year in Profile.`);
    else {
      const ok = withYear.some((e) => years.includes(Number(e.completion_year)));
      add("batch", "Graduation year", ok ? "pass" : "fail", ok ? `Your graduation year fits the ${list} batch.` : `Only for ${list} graduates (yours: ${withYear.map((e) => e.completion_year).join(", ")}).`);
    }
  }
  if (req.phd_required) {
    const has = edu.some((e) => e.level === "phd" && e.status === "completed");
    add("phd", "PhD", has ? "pass" : "fail", has ? "PhD held." : "Requires a PhD.");
  }
  if (req.bed_required) {
    const bed = edu.find((e) => e.level === "bed");
    if (bed?.status === "completed") add("bed", "B.Ed", "pass", "B.Ed completed.");
    else if (bed?.status === "pursuing") {
      if (req.bed_final_year_ok && p.bed_final_year) add("bed", "B.Ed", "pass", "Final-year B.Ed students may apply under this notification.");
      else add("bed", "B.Ed", "pending_bed", `Requires a completed B.Ed; yours is in progress${bed.completion_year ? ` (expected ${bed.completion_year})` : ""}.`);
    } else add("bed", "B.Ed", "fail", "Requires B.Ed.");
  }
  let tets = req.tet_required;
  if (tets) {
    if (!Array.isArray(tets)) tets = [tets];
    const held = new Set((p.tets_cleared || []).map(canonTet));
    const wanted = new Set(tets.map(canonTet));
    const ok = wanted.has("ANY") ? held.size > 0 : [...wanted].some((w) => held.has(w));
    const names = [...wanted].sort().join(" or ").replace("ANY", "any TET");
    add("tet", "Teacher eligibility test", ok ? "pass" : "pending_tet", ok ? `${names} cleared.` : `Requires ${names} qualification.`);
  }
  if (req.exams_required_any?.length) {
    const held = new Set((p.exams_cleared || []).map(norm));
    const have = req.exams_required_any.filter((e) => held.has(norm(e)));
    add("exam", "Qualifying exam", have.length ? "pass" : "fail", have.length ? `Holds ${have.join(", ")}.` : `Requires one of: ${req.exams_required_any.join(", ")}.`);
  }
  if (req.experience_years_min != null) {
    const need = Number(req.experience_years_min), mine = Number(p.experience_years || 0);
    if (need <= 0) add("experience", "Experience", "pass", "Freshers can apply.");
    else if (mine >= need) add("experience", "Experience", "pass", `${mine} yrs ≥ required ${need} yrs.`);
    else add("experience", "Experience", "fail", `Requires ${need} yrs; you have ${mine}.`);
  }
  if (req.age_min != null || req.age_max != null) {
    if (!p.date_of_birth) add("age", "Age", "unknown", "Add your date of birth in Profile to check the age limit.");
    else {
      const cutoff = /^\d{4}-\d{2}-\d{2}$/.test(req.age_cutoff_date || "") ? req.age_cutoff_date : today;
      const age = ageOn(p.date_of_birth, cutoff);
      const relax = p.reservation_category && req.age_relaxation ? Number(req.age_relaxation[p.reservation_category.toUpperCase()] || 0) : 0;
      const upper = req.age_max != null ? Number(req.age_max) + relax : null;
      const on = ` on ${fmt(cutoff)}`;
      if (req.age_min != null && age < req.age_min) add("age", "Age", "fail", `Age ${age}${on}; minimum is ${req.age_min}.`);
      else if (upper != null && age > upper) add("age", "Age", "fail", `Age ${age}${on}; maximum is ${upper}${relax ? ` (incl. ${relax} yr relaxation)` : ""}.`);
      else add("age", "Age", "pass", `Age ${age}${on} is within limits.`);
    }
  }
  for (const lang of req.languages_required || []) {
    const known = new Set((p.languages || []).map(norm));
    if (!known.size) add(`lang_${norm(lang)}`, `Language: ${lang}`, "unknown", "Add the languages you know in Profile.");
    else add(`lang_${norm(lang)}`, `Language: ${lang}`, known.has(norm(lang)) ? "pass" : "fail", known.has(norm(lang)) ? `Knows ${lang}.` : `Requires proficiency in ${lang}.`);
  }
  if (req.domicile_required) {
    const states = (Array.isArray(req.domicile_required) ? req.domicile_required : [req.domicile_required]).filter(Boolean);
    const list = states.join(" or ");
    if (!p.home_state) add("domicile", "State", "unknown", `Only for ${list} candidates; add your home state in Profile.`);
    else {
      const ok = states.some((st) => STATE_ALIASES(norm(st)) === STATE_ALIASES(norm(p.home_state)));
      add("domicile", "State", ok ? "pass" : "fail", ok ? `Open to ${p.home_state} candidates.` : `Only for ${list} candidates (you're from ${p.home_state}).`);
    }
  }
  if (req.category_only?.length) {
    const cats = req.category_only.map((c) => String(c).toUpperCase());
    const list = cats.join(" / ");
    if (!p.reservation_category) add("category", "Reserved for", "unknown", `Only for ${list} candidates; add your category in Profile.`);
    else {
      const ok = cats.includes(p.reservation_category.toUpperCase());
      add("category", "Reserved for", ok ? "pass" : "fail", ok ? `Open to ${p.reservation_category} candidates.` : `Only for ${list} candidates (special recruitment).`);
    }
  }
  const HARD = ["passing_years", "min_percentage_school", "min_education", "phd_required", "bed_required", "tet_required", "exams_required_any", "experience_years_min", "age_min", "age_max",
    "languages_required", "domicile_required", "category_only"];
  if (!HARD.some((k) => req[k] != null && !(Array.isArray(req[k]) && !req[k].length)))
    add("requirements", "Eligibility rules", "unknown", "The main rules (education, age) aren't in our data yet — read the official notification.");
  if (req.coding_heavy) add("coding", "Coding skills", "warn", "Role expects substantial programming skills.");
  for (const o of req.other_requirements || []) add("other", "Other requirement", "warn", `Verify manually: ${o}`);
  if ((reqIn || {})._extraction === "regex")
    add("extraction", "Criteria source", "unknown", "Criteria were partially auto-detected — confirm in the notification.");
  return resolve(checks);
}

function resolve(checks) {
  const r = new Set(checks.map((c) => c.result));
  let status = CURRENTLY;
  if (r.has("fail")) status = NOT;
  else if (r.has("pending_tet")) status = AFTER_TET;
  else if (r.has("pending_bed")) status = AFTER_BED;
  else if (r.has("unknown")) status = POTENTIAL;
  return { status, label: STATUS_LABELS[status], checks };
}
