import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { openResume, removeResume, saveProfile, uploadResume } from "../lib/data";
import { fmtWhen } from "../lib/util";
import { ChipMulti, E, Field, RolePicker, SelectOrOther, useApp } from "../ui";

const LEVELS = [["10th", "10th (SSLC)"], ["12th", "12th (HSC)"], ["diploma", "Diploma"], ["bachelor", "Bachelor's"], ["master", "Master's"], ["bed", "B.Ed"], ["phd", "PhD"]];
const DEGREES = {
  diploma: ["Diploma (Polytechnic)", "D.El.Ed / D.T.Ed", "ITI"],
  bachelor: ["B.Sc", "B.A.", "B.Com", "BCA", "BBA", "B.E.", "B.Tech", "B.Lit", "B.Pharm"],
  master: ["M.Sc", "M.A.", "M.Com", "MCA", "MBA", "M.E.", "M.Tech", "M.Phil", "M.Ed"],
  bed: ["B.Ed"], phd: ["Ph.D"],
};
const STREAMS = ["Science (Maths)", "Science (Biology)", "Commerce", "Arts / Humanities", "Vocational"];
const SUBJECTS = ["Physics", "Chemistry", "Mathematics", "Botany", "Zoology", "Biology", "Computer Science", "Information Technology", "Electronics",
  "Statistics", "Biochemistry", "Microbiology", "Biotechnology", "English", "Tamil", "Malayalam", "History", "Economics", "Commerce",
  "Business Administration", "Political Science", "Geography", "Psychology", "Education"];
const STATES = ["Tamil Nadu", "Kerala", "Karnataka", "Puducherry", "Andhra Pradesh", "Telangana", "Maharashtra", "Delhi"];
const LANGUAGES = ["Tamil", "English", "Malayalam", "Kannada", "Telugu", "Hindi"];
const PLACES = ["Chennai", "Coimbatore", "The Nilgiris (Ooty / Gudalur)", "Madurai", "Tiruchirappalli", "Salem", "Erode", "Tiruppur",
  "Bengaluru", "Kochi", "Thiruvananthapuram", "Kozhikode", "Anywhere in Tamil Nadu", "Anywhere in Kerala", "Anywhere in India"];
const TETS = ["CTET", "TNTET", "KTET", "KARTET", "State SET"];
const EXAMS = ["UGC NET", "CSIR NET", "GATE", "JEST", "SET"];
const EXPERIENCE = [["0", "Fresher"], ["0.5", "Less than 1 year"], ["1", "1 year"], ["2", "2 years"], ["3", "3 years"], ["4", "4 years"], ["5", "5 years"], ["7", "6–9 years"], ["10", "10+ years"]];
const YEARS = Array.from({ length: 2031 - 1990 }, (_, i) => String(2030 - i));
const blankRow = (level) => ({ level, degree: level === "10th" || level === "12th" ? level : DEGREES[level]?.length === 1 ? DEGREES[level][0] : "", subject: "", percentage: "", status: "completed", completion_year: "" });
const STARTER = [blankRow("10th"), blankRow("12th"), blankRow("bachelor")];
const normPhone = (s) => String(s || "").replace(/[\s-]/g, "");
const PHONE_OK = /^(\+?91)?[6-9]\d{9}$/;

/** Resume upload: saved straight away (separate from the Save profile button). Only you and the admin can open it. */
function ResumeBox() {
  const { uid, profile, setProfile, notify } = useApp();
  const input = useRef(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const pick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setErr(null); setBusy(true);
    try { const p = await uploadResume(uid, file); setProfile((old) => ({ ...old, ...p })); notify("📄 Resume uploaded"); }
    catch (x) { setErr(x.message); }
    setBusy(false);
  };
  const view = async () => { try { await openResume(profile.resume_path); } catch (x) { setErr(x.message); } };
  const remove = async () => {
    setBusy(true);
    try { const p = await removeResume(uid, profile.resume_path); setProfile((old) => ({ ...old, ...p })); notify("Resume removed"); }
    catch (x) { setErr(x.message); }
    setBusy(false);
  };
  return (
    <div className="resume">
      <input ref={input} type="file" accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" hidden onChange={pick} id="p-resume" />
      {profile?.resume_path ? (
        <div className="resume-file">
          <span className="resume-ic">📄</span>
          <div style={{ flex: 1, minWidth: 0 }}><strong style={{ overflowWrap: "anywhere" }}>{profile.resume_name || "Resume"}</strong><div className="tiny muted">Uploaded {fmtWhen(profile.resume_uploaded_at)}</div></div>
          <button type="button" className="btn sm" onClick={view}>View</button>
          <button type="button" className="btn sm" onClick={() => input.current?.click()} disabled={busy}>Replace</button>
          <button type="button" className="btn sm ghost" onClick={remove} disabled={busy}>Remove</button>
        </div>
      ) : (
        <button type="button" className="resume-drop" onClick={() => input.current?.click()} disabled={busy}>
          <span className="resume-ic">📤</span>
          <span><strong>{busy ? "Uploading…" : "Upload your resume"}</strong><span className="tiny muted" style={{ display: "block" }}>PDF or Word, up to 5 MB</span></span>
        </button>
      )}
      {err && <div className="error" style={{ marginTop: 8 }}>{err}</div>}
    </div>
  );
}

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
    reservation_category: p.reservation_category || "", experience_years: String(p.experience_years ?? 0),
    bed_final_year: !!p.bed_final_year,
  });
  const [langs, setLangs] = useState(p.languages || []);
  const [places, setPlaces] = useState(p.preferred_locations || []);
  const [tets, setTets] = useState(p.tets_cleared || []);
  const [exams, setExams] = useState(p.exams_cleared || []);
  const [edu, setEdu] = useState(p.education?.length ? p.education.map((e) => ({ ...e, percentage: e.percentage ?? "", completion_year: e.completion_year ? String(e.completion_year) : "" })) : STARTER);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value });
  const setRow = (i, patch) => setEdu(edu.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  const save = async (e) => {
    e.preventDefault();
    setError(null);
    const onRoles = section === "roles";
    if (!roles.length) return setError("Pick at least one type of role you're looking for.");
    if (!f.full_name.trim()) return setError(onRoles ? "Add your name under My profile." : "Enter your name.");
    if (!PHONE_OK.test(normPhone(f.phone))) return setError(onRoles ? "Add your 10-digit mobile number under My profile." : "Enter your 10-digit mobile number. It's used for reminders about deadlines.");
    if (f.date_of_birth && f.date_of_birth >= new Date().toISOString().slice(0, 10)) return setError("Date of birth must be in the past.");
    // Drop untouched rows (no subject, marks or year) so they don't count as qualifications.
    const education = edu.filter((r) => r.level && (r.level === "10th" || r.level === "12th" ? r.percentage !== "" : (r.subject || r.percentage !== "" || r.completion_year || (r.degree && !DEGREES[r.level]?.includes(r.degree))))).map((r) => {
      const pct = r.percentage === "" ? null : Number(r.percentage);
      return { level: r.level, degree: r.degree || null, subject: r.subject || null, percentage: pct, status: r.status, completion_year: r.completion_year === "" ? null : Number(r.completion_year) };
    });
    if (education.some((r) => r.percentage != null && (isNaN(r.percentage) || r.percentage < 0 || r.percentage > 100))) return setError("Percentages must be between 0 and 100.");
    setBusy(true);
    try {
      const saved = await saveProfile(uid, email, {
        target_roles: roles,
        full_name: f.full_name.trim(), phone: normPhone(f.phone), date_of_birth: f.date_of_birth || null, home_state: f.home_state || null,
        reservation_category: f.reservation_category || null, experience_years: Number(f.experience_years || 0),
        languages: langs, tets_cleared: tets, exams_cleared: exams, preferred_locations: places, bed_final_year: f.bed_final_year, education,
      });
      // If the database can't store roles yet, keep them for this visit so filters still work.
      setProfile((old) => ({ ...old, ...(saved._rolesNotSaved ? { ...saved, target_roles: roles } : saved) }));
      if (saved._rolesNotSaved) notify("Profile saved. Roles will be remembered after the admin's one-time database update.", "error");
      else notify(firstTime ? "🎉 Profile saved. Here are the openings for your roles." : "💾 Profile saved. Eligibility updated.");
      if (firstTime) nav("/openings");
      onSaved?.();
    } catch (err) { setError(err.message); }
    setBusy(false);
  };

  const saveBtn = <button className="btn primary" disabled={busy}>{busy ? "Saving…" : "💾 Save profile"}</button>;
  const sec = inPanel ? "psec" : "panel mb";

  return (
    <form onSubmit={save} noValidate className={inPanel ? "stack" : ""}>
      {!inPanel && (
        <div className="head">
          <div>
            <h1><E>👋</E>Set up your profile</h1>
            <p>Takes 2 minutes. Your roles decide what you see first; your education, age and state decide what you're eligible for.</p>
          </div>
          {saveBtn}
        </div>
      )}
      {error && <div className={`error ${inPanel ? "" : "mb"}`}>{error}</div>}
      {showRoles && <section className={sec}>
        <h2 className="mb"><E>🎯</E>Roles I'm looking for</h2>
        <p className="small muted mb" style={{ marginTop: -8 }}>Pick one or more. Openings shows these first.</p>
        <RolePicker value={roles} onChange={setRoles} />
      </section>}
      {showDetails && <>
      <section className={sec}>
        <h2 className="mb"><E>🙋</E>About you</h2>
        <p className="small muted mb" style={{ marginTop: -8 }}>Date of birth, category and home state decide age limits and state-only or reserved posts.</p>
        <div className="form-grid">
          <Field label="Full name"><input id="p-name" value={f.full_name} onChange={set("full_name")} autoComplete="name" /></Field>
          <Field label="Mobile number" hint="For deadline reminders"><input id="p-phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="98765 43210" value={f.phone} onChange={set("phone")} required /></Field>
          <Field label="Date of birth" hint="Needed for age limits"><input id="p-dob" type="date" value={f.date_of_birth} onChange={set("date_of_birth")} /></Field>
          <Field label="Category" hint="For age relaxation and reserved recruitments">
            <select id="p-cat" value={f.reservation_category} onChange={set("reservation_category")}>
              <option value="">Choose</option><option value="GEN">General</option><option value="EWS">EWS</option>
              <option value="OBC">OBC / BC / MBC</option><option value="SC">SC</option><option value="ST">ST</option>
            </select>
          </Field>
          <Field label="Home state">
            <SelectOrOther ariaLabel="Home state" value={f.home_state} onChange={(v) => setF({ ...f, home_state: v })} options={STATES} otherPlaceholder="Your state" />
          </Field>
          <Field label="Work experience">
            <select id="p-exp" value={f.experience_years} onChange={set("experience_years")}>
              {[...EXPERIENCE, ...(EXPERIENCE.some(([v]) => v === f.experience_years) ? [] : [[f.experience_years, `${f.experience_years} years`]])].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </Field>
        </div>
        <div className="pick-block">
          <div className="pick-label">🗣️ Languages you know</div>
          <ChipMulti id="p-lang" label="Languages you know" options={LANGUAGES} value={langs} onChange={setLangs} otherLabel="Other language" />
        </div>
        <div className="pick-block">
          <div className="pick-label">📍 Where you'd like to work</div>
          <ChipMulti id="p-places" label="Preferred places" options={PLACES} value={places} onChange={setPlaces} otherLabel="Other place" />
        </div>
      </section>

      <section className={sec}>
        <div className="spread mb"><h2><E>🎓</E>Education</h2>
          <button type="button" className="btn sm" onClick={() => setEdu([...edu, blankRow("master")])}>➕ Add qualification</button></div>
        <div className="edu-list">
          {edu.map((r, i) => {
            const school = r.level === "10th" || r.level === "12th";
            return (
              <div className="edu" key={i} data-row={i}>
                <div className="edu-grid">
                  <label className="field">Level
                    <select value={r.level} aria-label="Level" onChange={(e) => setRow(i, blankRow(e.target.value))}>{LEVELS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
                  </label>
                  {!school && <label className="field">Degree
                    <SelectOrOther key={`d-${r.level}`} ariaLabel="Degree" value={r.degree} onChange={(v) => setRow(i, { degree: v })} options={DEGREES[r.level] || []} />
                  </label>}
                  {r.level !== "10th" && <label className="field">{r.level === "12th" ? "Stream" : r.level === "bed" ? "Teaching subject" : "Subject"}
                    <SelectOrOther key={`s-${r.level}`} ariaLabel={r.level === "12th" ? "Stream" : "Subject"} value={r.subject} onChange={(v) => setRow(i, { subject: v })} options={r.level === "12th" ? STREAMS : SUBJECTS} />
                  </label>}
                  <label className="field">Marks %
                    <input type="number" min="0" max="100" step="0.1" inputMode="decimal" value={r.percentage} aria-label="Percentage" onChange={(e) => setRow(i, { percentage: e.target.value })} />
                  </label>
                  <label className="field">Status
                    <select value={r.status} aria-label="Status" onChange={(e) => setRow(i, { status: e.target.value })}><option value="completed">Completed</option><option value="pursuing">Pursuing</option></select>
                  </label>
                  <label className="field">{r.status === "pursuing" ? "Finishing in" : "Year"}
                    <select value={r.completion_year} aria-label="Year" onChange={(e) => setRow(i, { completion_year: e.target.value })}><option value="">Choose</option>{YEARS.map((y) => <option key={y}>{y}</option>)}</select>
                  </label>
                </div>
                <button type="button" className="edu-x" aria-label="Remove this qualification" onClick={() => setEdu(edu.filter((_, j) => j !== i))}>✕</button>
              </div>
            );
          })}
        </div>
        {edu.some((r) => r.level === "bed" && r.status === "pursuing") && (
          <label className="check mt"><input id="p-bedfinal" type="checkbox" checked={f.bed_final_year} onChange={set("bed_final_year")} /> I'm in the final year of B.Ed (some exams like CTET accept this)</label>
        )}
      </section>

      <section className={sec}>
        <h2 className="mb"><E>🏅</E>Exams you've cleared</h2>
        <div className="pick-block" style={{ marginTop: 0 }}>
          <div className="pick-label">Teacher eligibility tests</div>
          <ChipMulti id="p-tet" label="TETs cleared" options={TETS} value={tets} onChange={setTets} otherLabel="Other test" />
        </div>
        <div className="pick-block">
          <div className="pick-label">Other qualifying exams</div>
          <ChipMulti id="p-exams" label="Exams cleared" options={EXAMS} value={exams} onChange={setExams} otherLabel="Other exam" />
        </div>
      </section>

      <section className={sec}>
        <h2 className="mb"><E>📄</E>Resume</h2>
        <p className="small muted mb" style={{ marginTop: -8 }}>Only you and the admin can open it. The admin uses it to recommend openings that suit you.</p>
        <ResumeBox />
      </section>
      </>}
      {inPanel ? <div className="panel-foot">{saveBtn}</div> : <div className="panel-foot" style={{ position: "static" }}>{saveBtn}</div>}
    </form>
  );
}
