import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { addApplication, listApplications, STATUS_LABEL } from "../lib/data";
import { fmtDate, leftText, rate } from "../lib/util";
import OpeningPanel from "./OpeningPanel";
import { E, ELIG_EMOJI, ELIG_TONE, Loading, NA, ROLE, ROLE_TYPES, rolesOf, Stamp, STATUS_EMOJI, useApp } from "../ui";

function OpeningCard({ o, app, onTrack, onOpen }) {
  const notEligible = o.elig.status === "NOT_ELIGIBLE";
  // Tap anywhere on the card (except links/buttons) to open the summary.
  const open = (e) => { if (!e.target.closest("a,button")) onOpen(o); };
  return (
    <article className={`card click ${notEligible ? "dim" : ""}`} onClick={open} onKeyDown={(e) => e.key === "Enter" && e.target === e.currentTarget && onOpen(o)} tabIndex={0} aria-label={`${o.title}, ${o.organization}. Open summary`}>
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
        <dt><E>👥</E>Vacancies</dt><dd className="clamp">{o.vacancies || <NA />}</dd>
        <dt><E>📍</E>Location</dt><dd className="clamp">{o.location || <NA />}</dd>
        <dt><E>💰</E>Pay</dt><dd className="clamp">{o.salary_text || <NA />}</dd>
      </dl>
      <div className="actions">
        <button className="btn sm primary-soft" onClick={() => onOpen(o)}>📋 Summary</button>
        {o.notification_url && <a className="btn sm" href={o.notification_url} target="_blank" rel="noreferrer">📄 Notification</a>}
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
  const [openId, setOpenId] = useState(null);
  const closeSummary = useCallback(() => setOpenId(null), []);

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

  const selected = openId ? rated.find((o) => o.id === openId) : null;
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
      {shown.length ? <div className="cards">{shown.map((o) => <OpeningCard key={o.id} o={o} app={byOpening.get(o.id)} onTrack={track_} onOpen={(x) => setOpenId(x.id)} />)}</div>
        : <div className="panel state"><span className="empty-e">🌱</span>
            <h3>{filter === "mine" ? "No open openings for your roles right now" : "No open openings match"}</h3>
            <p>New openings are added every morning.{filter === "mine" ? " Meanwhile, see what's open in other roles." : " Try \"Show all\" or another role type."}</p>
            {filter === "mine" && <button className="btn primary" onClick={() => setFilter("fit")}>✅ All I'm eligible for</button>}</div>}
      {selected && <OpeningPanel o={selected} app={byOpening.get(selected.id)} onTrack={track_} onClose={closeSummary} />}
    </>
  );
}
