import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { saveProfile } from "../lib/data";
import { E, Field, RolePicker, useApp } from "../ui";

const LEVELS = [["10th", "10th"], ["12th", "12th"], ["diploma", "Diploma"], ["bachelor", "Bachelor's"], ["master", "Master's"], ["bed", "B.Ed"], ["phd", "PhD"]];
const STARTER = [
  { level: "10th", degree: "10th", subject: "", percentage: "", status: "completed", completion_year: "" },
  { level: "12th", degree: "12th", subject: "", percentage: "", status: "completed", completion_year: "" },
  { level: "bachelor", degree: "", subject: "", percentage: "", status: "completed", completion_year: "" },
];
const STATES = ["Tamil Nadu", "Kerala", "Karnataka", "Puducherry", "Andhra Pradesh", "Telangana", "Maharashtra", "Delhi", "Other"];
const toList = (s) => String(s || "").split(",").map((x) => x.trim()).filter(Boolean);

/** Profile form. `firstTime` = full-page onboarding (everything).
 *  In the profile panel, `section` shows one part: "roles" or "details". Edits survive switching sections. */
export default function Profile({ firstTime = false, inPanel = false, section = "all", onSaved }) {
  const showRoles = section === "all" || section === "roles";
  const showDetails = section === "all" || section === "details";
  const { uid, email, profile, setProfile, notify } = useApp();
  const nav = useNavigate();
  const p = profile || {};
  const [roles, setRoles] = useState(p.target_roles || []);
  const [f, setF] = useState({
    full_name: p.full_name || "", phone: p.phone || "", date_of_birth: p.date_of_birth || "", home_state: p.home_state || "",
    reservation_category: p.reservation_category || "", experience_years: p.experience_years ?? 0,
    languages: (p.languages || []).join(", "), tets_cleared: (p.tets_cleared || []).join(", "), exams_cleared: (p.exams_cleared || []).join(", "),
    preferred_locations: (p.preferred_locations || []).join(", "), bed_final_year: !!p.bed_final_year,
  });
  const [edu, setEdu] = useState(p.education?.length ? p.education.map((e) => ({ ...e, percentage: e.percentage ?? "", completion_year: e.completion_year ?? "" })) : STARTER);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value });
  const setRow = (i, k, v) => setEdu(edu.map((r, j) => (j === i ? { ...r, [k]: v } : r)));

  const save = async (e) => {
    e.preventDefault();
    setError(null);
    if (!roles.length) return setError("Pick at least one type of role you're looking for.");
    if (!f.full_name.trim()) return setError("Enter your name.");
    if (f.date_of_birth && f.date_of_birth >= new Date().toISOString().slice(0, 10)) return setError("Date of birth must be in the past.");
    if (f.phone && !/^[+\d][\d\s-]{7,15}$/.test(f.phone.trim())) return setError("Enter a valid phone number, or leave it empty.");
    // Drop untouched rows (no degree, subject or marks) so they don't count as qualifications.
    const education = edu.filter((r) => r.level && (r.level === "10th" || r.level === "12th" ? r.percentage !== "" : (r.degree || r.subject || r.percentage !== ""))).map((r) => {
      const pct = r.percentage === "" ? null : Number(r.percentage);
      return { level: r.level, degree: r.degree || null, subject: r.subject || null, percentage: pct, status: r.status, completion_year: r.completion_year === "" ? null : Number(r.completion_year) };
    });
    if (education.some((r) => r.percentage != null && (isNaN(r.percentage) || r.percentage < 0 || r.percentage > 100))) return setError("Percentages must be between 0 and 100.");
    setBusy(true);
    try {
      const saved = await saveProfile(uid, email, {
        target_roles: roles,
        full_name: f.full_name.trim(), phone: f.phone.trim() || null, date_of_birth: f.date_of_birth || null, home_state: f.home_state.trim() || null,
        reservation_category: f.reservation_category || null, experience_years: Number(f.experience_years || 0),
        languages: toList(f.languages), tets_cleared: toList(f.tets_cleared), exams_cleared: toList(f.exams_cleared),
        preferred_locations: toList(f.preferred_locations), bed_final_year: f.bed_final_year, education,
      });
      // If the database can't store roles yet, keep them for this visit so filters still work.
      setProfile(saved._rolesNotSaved ? { ...saved, target_roles: roles } : saved);
      if (saved._rolesNotSaved) notify("Profile saved. Roles will be remembered after the admin's one-time database update.", "error");
      else notify(firstTime ? "🎉 Profile saved. Here are the openings for your roles." : "💾 Profile saved. Eligibility updated.");
      if (firstTime) nav("/openings");
      onSaved?.();
    } catch (err) { setError(err.message); }
    setBusy(false);
  };

  const saveBtn = <button className="btn primary" disabled={busy}>{busy ? "Saving…" : "💾 Save profile"}</button>;

  return (
    <form onSubmit={save} noValidate className={inPanel ? "stack" : ""}>
      {!inPanel && (
        <div className="head">
          <div>
            <h1><E>👋</E>Set up your profile</h1>
            <p>Takes 2 minutes. Your roles decide what you see first; your education and age decide what you're eligible for.</p>
          </div>
          {saveBtn}
        </div>
      )}
      {error && <div className={`error ${inPanel ? "" : "mb"}`}>{error}</div>}
      {showRoles && <section className={inPanel ? "psec" : "panel mb"}>
        <h2 className="mb"><E>🎯</E>Roles I'm looking for</h2>
        <p className="small muted mb" style={{ marginTop: -8 }}>Pick one or more. Openings shows these first.</p>
        <RolePicker value={roles} onChange={setRoles} />
      </section>}
      {showDetails && <>
      <section className={inPanel ? "psec" : "panel mb"}>
        <h2 className="mb"><E>🙋</E>About you</h2>
        <p className="small muted mb" style={{ marginTop: -8 }}>Date of birth, category and home state decide age limits and state-only or reserved posts.</p>
        <div className="form-grid">
          <Field label="Full name"><input id="p-name" value={f.full_name} onChange={set("full_name")} /></Field>
          <Field label="Phone (optional)" hint="So the admin can reach you"><input id="p-phone" type="tel" value={f.phone} onChange={set("phone")} /></Field>
          <Field label="Date of birth" hint="Needed for age limits"><input id="p-dob" type="date" value={f.date_of_birth} onChange={set("date_of_birth")} /></Field>
          <Field label="Category" hint="For age relaxation and reserved (special) recruitments">
            <select id="p-cat" value={f.reservation_category} onChange={set("reservation_category")}><option value="">Not set</option>{["GEN", "EWS", "OBC", "SC", "ST"].map((c) => <option key={c}>{c}</option>)}</select>
          </Field>
          <Field label="Home state"><select id="p-state" value={f.home_state} onChange={set("home_state")}><option value="">Not set</option>{[...STATES, ...(f.home_state && !STATES.includes(f.home_state) ? [f.home_state] : [])].map((x) => <option key={x}>{x}</option>)}</select></Field>
          <Field label="Work experience (years)"><input id="p-exp" type="number" min="0" step="0.5" value={f.experience_years} onChange={set("experience_years")} /></Field>
          <Field label="Preferred locations" hint="Comma-separated" wide><input id="p-locs" value={f.preferred_locations} onChange={set("preferred_locations")} placeholder="e.g. Chennai, Coimbatore, Kerala" /></Field>
          <Field label="Languages you know"><input id="p-lang" value={f.languages} onChange={set("languages")} placeholder="e.g. Tamil, English" /></Field>
          <Field label="TETs cleared" hint="e.g. CTET, TNTET"><input id="p-tet" value={f.tets_cleared} onChange={set("tets_cleared")} /></Field>
          <Field label="Exams cleared" hint="e.g. CSIR NET, GATE"><input id="p-exams" value={f.exams_cleared} onChange={set("exams_cleared")} /></Field>
        </div>
      </section>
      <section className={inPanel ? "psec" : "panel"}>
        <div className="spread mb"><h2><E>🎓</E>Education</h2>
          <button type="button" className="btn sm" onClick={() => setEdu([...edu, { level: "master", degree: "", subject: "", percentage: "", status: "completed", completion_year: "" }])}>➕ Add qualification</button></div>
        <div className="table-wrap"><table>
          <thead><tr><th>Level</th><th>Degree</th><th>Subject</th><th>%</th><th>Status</th><th>Year</th><th></th></tr></thead>
          <tbody>{edu.map((r, i) => (
            <tr key={i}>
              <td style={{ minWidth: 120 }}><select value={r.level} onChange={(e) => setRow(i, "level", e.target.value)} aria-label="Level">{LEVELS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></td>
              <td style={{ minWidth: 100 }}><input value={r.degree || ""} onChange={(e) => setRow(i, "degree", e.target.value)} placeholder="B.Sc" aria-label="Degree" /></td>
              <td style={{ minWidth: 110 }}><input value={r.subject || ""} onChange={(e) => setRow(i, "subject", e.target.value)} placeholder="Physics" aria-label="Subject" /></td>
              <td style={{ width: 80 }}><input type="number" min="0" max="100" value={r.percentage} onChange={(e) => setRow(i, "percentage", e.target.value)} aria-label="Percentage" /></td>
              <td style={{ minWidth: 120 }}><select value={r.status} onChange={(e) => setRow(i, "status", e.target.value)} aria-label="Status"><option value="completed">Completed</option><option value="pursuing">Pursuing</option></select></td>
              <td style={{ width: 90 }}><input type="number" value={r.completion_year} onChange={(e) => setRow(i, "completion_year", e.target.value)} aria-label="Year" /></td>
              <td><button type="button" className="btn sm ghost" onClick={() => setEdu(edu.filter((_, j) => j !== i))}>Remove</button></td>
            </tr>
          ))}</tbody>
        </table></div>
        {edu.some((r) => r.level === "bed" && r.status === "pursuing") && (
          <label className="check mt"><input id="p-bedfinal" type="checkbox" checked={f.bed_final_year} onChange={set("bed_final_year")} /> I'm in the final year of B.Ed (some exams like CTET accept this)</label>
        )}
      </section>
      </>}
      {inPanel && <div className="panel-foot">{saveBtn}</div>}
    </form>
  );
}
