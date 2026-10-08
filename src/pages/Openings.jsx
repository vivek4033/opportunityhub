import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { addApplication, listApplications, STATUS_LABEL } from "../lib/data";
import { TRACKS } from "../lib/tracks";
import { fmtDate, leftText, rate } from "../lib/util";
import { E, ELIG_EMOJI, ELIG_TONE, Loading, NA, Stamp, STATUS_EMOJI, TRACK_EMOJI, useApp } from "../ui";

const RESULT_CLASS = { pass: "pass", fail: "fail", pending_bed: "pend", pending_tet: "pend" };

function OpeningCard({ o, app, onTrack }) {
  const [open, setOpen] = useState(false);
  const notEligible = o.elig.status === "NOT_ELIGIBLE";
  return (
    <article className={`card ${notEligible ? "dim" : ""}`}>
      <div className="top-row">
        <Stamp date={o.application_end} days={o.daysLeft} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="title">{o.title}</div>
          <div className="small muted">{o.organization}</div>
        </div>
        <span className={`score ${o.label}`} title="How well this fits your profile">{o.match}<small>/100</small></span>
      </div>
      <div className="row" style={{ gap: 6 }}>
        <span className={`badge ${ELIG_TONE[o.elig.status]}`}><E>{ELIG_EMOJI[o.elig.status]}</E>{o.elig.label}</span>
        <span className="badge"><E>{TRACK_EMOJI[o.track] || "📌"}</E>{TRACKS.find((t) => t.key === o.track)?.label || o.track}</span>
      </div>
      <dl className="facts">
        <dt><E>⏰</E>Apply by</dt><dd>{o.application_end ? `${fmtDate(o.application_end)} · ${leftText(o.daysLeft)}` : <NA />}</dd>
        <dt><E>✍️</E>Exam</dt><dd>{o.exam_date ? fmtDate(o.exam_date) : o.exam_date_text || <NA />}</dd>
        <dt><E>📍</E>Location</dt><dd>{o.location || <NA />}</dd>
        <dt><E>💰</E>Pay</dt><dd>{o.salary_text || <NA />}</dd>
      </dl>
      {open && (
        <div className="why">
          {o.ai_summary && <p className="mb" style={{ marginBottom: 8 }}>{o.ai_summary}</p>}
          <strong><E>🧾</E> Your eligibility</strong>
          <ul>{o.elig.checks.map((c, i) => <li key={i} className={RESULT_CLASS[c.result] || ""}>{c.label}: {c.detail}</li>)}</ul>
          {o.qualification_text && <p className="mt" style={{ marginTop: 8 }}><strong>Qualification (as stated):</strong> {o.qualification_text}</p>}
          {o.age_limit_text && <p><strong>Age (as stated):</strong> {o.age_limit_text}</p>}
          <p className="tiny muted" style={{ marginTop: 8 }}>Always check the official notification before applying.</p>
        </div>
      )}
      <div className="actions">
        <button className="btn sm" onClick={() => setOpen(!open)}>{open ? "🔼 Hide details" : "🔽 Details"}</button>
        {o.notification_url && <a className="btn sm" href={o.notification_url} target="_blank" rel="noreferrer">📄 Notification</a>}
        {o.apply_url && <a className="btn sm" href={o.apply_url} target="_blank" rel="noreferrer">🌐 Apply site</a>}
        {app ? <Link className="btn sm ghost" to="/applications">{STATUS_EMOJI[app.status]} Tracking: {STATUS_LABEL[app.status]}</Link>
          : <button className="btn sm primary" onClick={() => onTrack(o)}>➕ Track this</button>}
      </div>
    </article>
  );
}

export default function Openings() {
  const { uid, profile, openings, notify } = useApp();
  const [apps, setApps] = useState(null);
  const [filter, setFilter] = useState("fit");
  const [track, setTrack] = useState("");
  const [q, setQ] = useState("");

  useEffect(() => { listApplications(uid).then(setApps).catch((e) => notify(e.message, "error")); }, [uid, notify]);

  const rated = useMemo(() => rate(openings.items, profile), [openings.items, profile]);
  const byOpening = useMemo(() => new Map((apps || []).filter((a) => a.opening_id).map((a) => [a.opening_id, a])), [apps]);
  const shown = rated
    .filter((o) => o.daysLeft == null || o.daysLeft >= 0)
    .filter((o) => filter === "all" || (filter === "fit" ? o.elig.status !== "NOT_ELIGIBLE" : true))
    .filter((o) => !track || o.track === track)
    .filter((o) => !q || `${o.title} ${o.organization} ${o.location || ""}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => b.match - a.match || (a.application_end || "9").localeCompare(b.application_end || "9"));

  const track_ = async (o) => {
    try {
      const a = await addApplication({ user_id: uid, opening_id: o.id, organization: o.organization, title: o.title, track: o.track,
        status: "to_apply", deadline: o.application_end || null, exam_date: o.exam_date || null });
      setApps([a, ...(apps || [])]);
      notify("➕ Added to My applications");
    } catch (e) { notify(e.message, "error"); }
  };

  if (openings.loading) return <Loading text="Loading openings…" />;
  return (
    <>
      <div className="head">
        <div><h1><E>🔎</E>Openings</h1><p>Found by the daily scan of official sites{openings.updatedAt ? ` · updated ${fmtDate(openings.updatedAt.slice(0, 10))}` : ""}. Sorted by how well they fit you.</p></div>
      </div>
      {openings.error && <div className="error mb">{openings.error}</div>}
      <div className="panel mb stack">
        <input id="o-search" placeholder="🔍 Search openings…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search openings" />
        <div className="row">
          <div className="chips">
            <button className={`chip ${filter === "fit" ? "on" : ""}`} onClick={() => setFilter("fit")}>✅ For me</button>
            <button className={`chip ${filter === "all" ? "on" : ""}`} onClick={() => setFilter("all")}>🌍 Show all</button>
          </div>
          <select id="o-track" value={track} onChange={(e) => setTrack(e.target.value)} style={{ width: "auto" }} aria-label="Category">
            <option value="">📂 All categories</option>{TRACKS.map((t) => <option key={t.key} value={t.key}>{TRACK_EMOJI[t.key]} {t.label}</option>)}
          </select>
        </div>
      </div>
      {shown.length ? <div className="cards">{shown.map((o) => <OpeningCard key={o.id} o={o} app={byOpening.get(o.id)} onTrack={track_} />)}</div>
        : <div className="panel state"><span className="empty-e">🌱</span><h3>No open openings match</h3><p>New openings are added every morning. Try "Show all" or another category.</p></div>}
    </>
  );
}
