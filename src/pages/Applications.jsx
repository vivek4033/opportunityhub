import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { addApplication, deleteApplication, listApplications, STATUSES, STATUS_LABEL, updateApplication } from "../lib/data";
import { TRACKS } from "../lib/tracks";
import { daysFrom, fmtDate, leftText } from "../lib/util";
import { E, Field, Loading, Modal, Stamp, STATUS_EMOJI, TRACK_EMOJI, useApp, useConfirm } from "../ui";

const BLANK = { organization: "", title: "", track: "banking", status: "to_apply", deadline: "", exam_date: "", interview_date: "", notes: "" };

function AppForm({ initial, onClose, onSaved }) {
  const { uid, notify } = useApp();
  const [f, setF] = useState({ ...BLANK, ...Object.fromEntries(Object.entries(initial || {}).map(([k, v]) => [k, v ?? ""])) });
  const [error, setError] = useState(null);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const save = async () => {
    if (f.organization.trim().length < 2) return setError("Enter the organization.");
    if (f.title.trim().length < 2) return setError("Enter the job or exam name.");
    const body = { organization: f.organization.trim(), title: f.title.trim(), track: f.track, status: f.status,
      deadline: f.deadline || null, exam_date: f.exam_date || null, interview_date: f.interview_date || null, notes: f.notes.trim() || null };
    try {
      const saved = initial?.id ? await updateApplication(initial, body) : await addApplication({ ...body, user_id: uid });
      notify("Saved"); onSaved(saved); onClose();
    } catch (e) { setError(e.message); }
  };
  return (
    <Modal title={initial?.id ? "✏️ Edit application" : "➕ Add an application"} onClose={onClose}
      footer={<><button className="btn" onClick={onClose}>Cancel</button><button className="btn primary" onClick={save}>Save</button></>}>
      {error && <div className="error mb">{error}</div>}
      <div className="form-grid">
        <Field label="Organization"><input id="a-org" value={f.organization} onChange={set("organization")} placeholder="e.g. SBI" /></Field>
        <Field label="Job / exam"><input id="a-title" value={f.title} onChange={set("title")} placeholder="e.g. PO 2026" /></Field>
        <Field label="Category"><select id="a-track" value={f.track || "banking"} onChange={set("track")}>{TRACKS.map((t) => <option key={t.key} value={t.key}>{TRACK_EMOJI[t.key]} {t.label}</option>)}</select></Field>
        <Field label="Status"><select id="a-status" value={f.status} onChange={set("status")}>{STATUSES.map((s) => <option key={s.key} value={s.key}>{STATUS_EMOJI[s.key]} {s.label}</option>)}</select></Field>
        <Field label="Apply by"><input id="a-deadline" type="date" value={f.deadline} onChange={set("deadline")} /></Field>
        <Field label="Exam date"><input id="a-exam" type="date" value={f.exam_date} onChange={set("exam_date")} /></Field>
        <Field label="Interview date"><input id="a-int" type="date" value={f.interview_date} onChange={set("interview_date")} /></Field>
        <Field label="Notes" wide><textarea id="a-notes" value={f.notes} onChange={set("notes")} placeholder="Registration no., documents sent, centre…" /></Field>
      </div>
    </Modal>
  );
}

export default function Applications() {
  const { uid, notify } = useApp();
  const [apps, setApps] = useState(null);
  const [editing, setEditing] = useState(null);
  const [show, setShow] = useState("active");
  const { armed, ask } = useConfirm();

  useEffect(() => { listApplications(uid).then(setApps).catch((e) => { notify(e.message, "error"); setApps([]); }); }, [uid, notify]);
  if (!apps) return <Loading />;

  const replace = (a) => setApps((cur) => [a, ...cur.filter((x) => x.id !== a.id)]);
  const setStatus = async (a, status) => {
    try { replace(await updateApplication(a, { status })); notify(`Marked as ${STATUS_LABEL[status]}`); } catch (e) { notify(e.message, "error"); }
  };
  const remove = async (a) => {
    if (!ask(a.id)) return;
    try { await deleteApplication(a.id); setApps(apps.filter((x) => x.id !== a.id)); notify("Removed"); } catch (e) { notify(e.message, "error"); }
  };
  const counts = Object.fromEntries(STATUSES.map((s) => [s.key, apps.filter((a) => a.status === s.key).length]));
  const visible = apps.filter((a) => (show === "active" ? !["selected", "rejected"].includes(a.status) : show === "done" ? ["selected", "rejected"].includes(a.status) : true))
    .sort((a, b) => (a.deadline || "9999").localeCompare(b.deadline || "9999"));

  return (
    <>
      <div className="head">
        <div><h1><E>📝</E>My applications</h1><p>Move each one along as you go: 📝 To apply → 📨 Applied → ✍️ Exam → 🎤 Interview → 🎉 Selected.</p></div>
        <button className="btn primary" onClick={() => setEditing({})}>➕ Add your own</button>
      </div>
      <div className="strip">{STATUSES.map((s) => <div key={s.key}><span className="ic">{STATUS_EMOJI[s.key]}</span><div className="n">{counts[s.key]}</div><div className="l">{s.label}</div></div>)}</div>
      <div className="chips mb">
        {[["active", "⏳ In progress"], ["done", "🏁 Finished"], ["all", "📋 All"]].map(([k, l]) => <button key={k} className={`chip ${show === k ? "on" : ""}`} onClick={() => setShow(k)}>{l}</button>)}
      </div>
      <section className="panel">
        {visible.length ? (
          <div className="list">{visible.map((a) => {
            const d = daysFrom(a.deadline);
            const next = [["Exam", a.exam_date], ["Interview", a.interview_date]].filter(([, x]) => x && daysFrom(x) >= 0);
            return (
              <div className="item" key={a.id}>
                <Stamp date={a.status === "to_apply" ? a.deadline : next[0]?.[1] || a.deadline} days={a.status === "to_apply" ? d : daysFrom(next[0]?.[1] || a.deadline)} />
                <div className="body">
                  <span className="t">{a.title}</span>
                  <div className="meta">
                    <span>{a.organization}</span>
                    {a.status === "to_apply" && a.deadline && <span>· ⏰ apply by {fmtDate(a.deadline, false)} ({leftText(d)})</span>}
                    {next.map(([l, x]) => <span key={l}>· {l === "Exam" ? "✍️" : "🎤"} {l} {fmtDate(x, false)}</span>)}
                  </div>
                  {a.notes && <div className="tiny muted" style={{ marginTop: 3 }}>🗒️ {a.notes}</div>}
                </div>
                <select value={a.status} onChange={(e) => setStatus(a, e.target.value)} style={{ width: 150 }} aria-label={`Status of ${a.title}`}>
                  {STATUSES.map((s) => <option key={s.key} value={s.key}>{STATUS_EMOJI[s.key]} {s.label}</option>)}
                </select>
                <div className="row" style={{ gap: 2 }}>
                  <button className="btn sm ghost" onClick={() => setEditing(a)}>✏️ Edit</button>
                  <button className="btn sm ghost danger" onClick={() => remove(a)}>{armed === a.id ? "⚠️ Confirm" : "🗑️ Remove"}</button>
                </div>
              </div>
            );
          })}</div>
        ) : (
          <div className="state"><span className="empty-e">📭</span><h3>{apps.length ? "Nothing here" : "No applications yet"}</h3>
            <p>Tap "Track this" on an opening, or add one you found yourself.</p>
            <Link className="btn primary" to="/openings">🔎 See openings</Link></div>
        )}
      </section>
      {editing && <AppForm initial={editing.id ? editing : null} onClose={() => setEditing(null)} onSaved={replace} />}
    </>
  );
}
