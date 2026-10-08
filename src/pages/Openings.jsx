import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { addApplication, listApplications, STATUS_LABEL } from "../lib/data";
import { fmtDate, leftText, rate } from "../lib/util";
import { E, ELIG_EMOJI, ELIG_TONE, Loading, NA, ROLE, ROLE_TYPES, rolesOf, Stamp, STATUS_EMOJI, useApp } from "../ui";

const RESULT_CLASS = { pass: "pass", fail: "fail", pending_bed: "pend", pending_tet: "pend" };

function OpeningCard({ o, app, onTrack }) {
  const [open, setOpen] = useState(false);
  const notEligible = o.elig.status === "NOT_ELIGIBLE";
  return (
    <article className={`card ${notEligible ? "dim" : ""}`}>
      {o.roles?.length > 0 && (
        <div className={`role-tag r-${o.roles[0]}`}>
          {o.roles.map((r) => <span key={r}><E>{ROLE[r].e}</E>{ROLE[r].label}</span>)}
          {o.mine && <span className="yours">🎯 your role</span>}
        </div>
      )}
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
  const { uid, profile, openings, notify, openProfile } = useApp();
  const myRoles = profile?.target_roles || [];
  const [apps, setApps] = useState(null);
  const [filter, setFilter] = useState(myRoles.length ? "mine" : "fit");
  const [track, setTrack] = useState("");
  const [q, setQ] = useState("");

  useEffect(() => { listApplications(uid).then(setApps).catch((e) => notify(e.message, "error")); }, [uid, notify]);

  const rated = useMemo(() => rate(openings.items, profile).map((o) => {
    const roles = rolesOf(o);
    return { ...o, roles, mine: roles.some((r) => myRoles.includes(r)) };
  }), [openings.items, profile]); // eslint-disable-line react-hooks/exhaustive-deps
  const byOpening = useMemo(() => new Map((apps || []).filter((a) => a.opening_id).map((a) => [a.opening_id, a])), [apps]);
  const shown = rated
    .filter((o) => o.daysLeft == null || o.daysLeft >= 0)
    .filter((o) => filter === "all" || o.elig.status !== "NOT_ELIGIBLE")
    .filter((o) => filter !== "mine" || o.mine)
    .filter((o) => !track || o.roles.includes(track))
    .filter((o) => !q || `${o.title} ${o.organization} ${o.location || ""}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => Number(b.mine) - Number(a.mine) || b.match - a.match || (a.application_end || "9").localeCompare(b.application_end || "9"));

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
        <div><h1><E>🔎</E>Openings</h1><p>Found by the daily scan of official sites{openings.updatedAt ? ` · updated ${fmtDate(openings.updatedAt.slice(0, 10))}` : ""}. Your roles first, then by how well they fit you.</p></div>
      </div>
      {openings.error && <div className="error mb">{openings.error}</div>}
      <div className="panel mb stack">
        <input id="o-search" placeholder="🔍 Search openings…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search openings" />
        <div className="row">
          <div className="chips">
            <button className={`chip ${filter === "mine" ? "on" : ""}`} onClick={() => setFilter("mine")} disabled={!myRoles.length}>🎯 My roles</button>
            <button className={`chip ${filter === "fit" ? "on" : ""}`} onClick={() => setFilter("fit")}>✅ All I'm eligible for</button>
            <button className={`chip ${filter === "all" ? "on" : ""}`} onClick={() => setFilter("all")}>🌍 Show all</button>
          </div>
          <select id="o-track" value={track} onChange={(e) => setTrack(e.target.value)} style={{ width: "auto" }} aria-label="Role type">
            <option value="">📂 Every role type</option>{ROLE_TYPES.map((r) => <option key={r.key} value={r.key}>{r.e} {r.label}</option>)}
          </select>
        </div>
        <div className="small muted">
          {myRoles.length ? <>Your roles: {myRoles.map((r) => ROLE[r] && `${ROLE[r].e} ${ROLE[r].label}`).filter(Boolean).join(" · ")} · </> : "You haven't picked your roles yet · "}
          <button className="linkish" onClick={openProfile}>change</button>
        </div>
      </div>
      {shown.length ? <div className="cards">{shown.map((o) => <OpeningCard key={o.id} o={o} app={byOpening.get(o.id)} onTrack={track_} />)}</div>
        : <div className="panel state"><span className="empty-e">🌱</span>
            <h3>{filter === "mine" ? "No open openings for your roles right now" : "No open openings match"}</h3>
            <p>New openings are added every morning.{filter === "mine" ? " Meanwhile, see what's open in other roles." : " Try \"Show all\" or another role type."}</p>
            {filter === "mine" && <button className="btn primary" onClick={() => setFilter("fit")}>✅ All I'm eligible for</button>}</div>}
    </>
  );
}
