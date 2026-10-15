import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { addApplication, listApplications, listRecommendations, localHidden, saveHidden, STATUS_LABEL } from "../lib/data";
import { fmtDate, leftText, rate } from "../lib/util";
import { defaultView } from "./Account";
import OpeningPanel from "./OpeningPanel";
import { E, ELIG_EMOJI, ELIG_TONE, Loading, NA, ROLE, ROLE_TYPES, rolesOf, Stamp, STATUS_EMOJI, useApp } from "../ui";

/** Eligibility groups, in the order they're shown. "later" and "no" only appear under Everything. */
const GROUPS = [
  { key: "ok", e: "✅", title: "You meet every rule", note: "Every rule we could check — education, age, state, category — fits your profile." },
  { key: "check", e: "🤔", title: "Likely eligible — a few details to check", note: "Nothing rules you out, but some rules aren't in our data or your profile yet. Open the summary to see which." },
  { key: "later", e: "⏳", title: "Eligible after B.Ed or TET", note: "You'll qualify once your B.Ed or teacher eligibility test is done." },
  { key: "no", e: "🚫", title: "Not eligible for you", note: "Shown so you know they exist. The reason is on each card." },
];
const groupOf = (o) => ({ CURRENTLY_ELIGIBLE: "ok", POTENTIALLY_ELIGIBLE: "check", ELIGIBLE_AFTER_BED: "later", ELIGIBLE_AFTER_TET: "later" }[o.elig.status] || "no");
// Most decisive reason first: state- or community-only posts rule people out regardless of anything else.
const REASON_ORDER = ["domicile", "category", "education", "phd", "bed", "exam", "age", "experience", "percentage"];
const whyNot = (o) => {
  const fails = o.elig.checks.filter((c) => c.result === "fail")
    .sort((a, b) => (REASON_ORDER.indexOf(a.key) + 99) % 99 - (REASON_ORDER.indexOf(b.key) + 99) % 99);
  if (!fails.length) return "Not eligible";
  return fails[0].detail + (fails.length > 1 ? ` (+${fails.length - 1} more)` : "");
};

function OpeningCard({ o, app, onTrack, onOpen, onHide, hidden }) {
  const g = groupOf(o);
  // Tap anywhere on the card (except links/buttons) to open the summary.
  const open = (e) => { if (!e.target.closest("a,button")) onOpen(o); };
  return (
    <article className={`card click g-${g}`} onClick={open} onKeyDown={(e) => e.key === "Enter" && e.target === e.currentTarget && onOpen(o)} tabIndex={0} aria-label={`${o.title}, ${o.organization}. Open summary`}>
      <div className="tags">
        {o.roles?.map((r) => <span key={r} className={`role-tag r-${r}`}><E>{ROLE[r].e}</E>{ROLE[r].label}</span>)}
        {o.mine && <span className="tag-yours">🎯 Your role</span>}
      </div>
      <div className="top-row">
        <Stamp date={o.application_end} days={o.daysLeft} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="title">{o.title}</div>
          <div className="small muted">{o.organization}</div>
        </div>
      </div>
      {g === "no" ? <div className="why-not">🚫 {whyNot(o)}</div>
        : <div><span className={`badge ${ELIG_TONE[o.elig.status]}`}><E>{ELIG_EMOJI[o.elig.status]}</E>{o.elig.label}</span></div>}
      <dl className="facts">
        <dt><E>⏰</E>Apply by</dt><dd>{o.application_end ? `${fmtDate(o.application_end)}, ${leftText(o.daysLeft)}` : <NA />}</dd>
        <dt><E>👥</E>Vacancies</dt><dd className="clamp">{o.vacancies || <NA />}</dd>
        <dt><E>📍</E>Location</dt><dd className="clamp">{o.location || <NA />}</dd>
        <dt><E>💰</E>Pay</dt><dd className="clamp">{o.salary_text || <NA />}</dd>
      </dl>
      <div className="actions">
        <button className="btn sm primary-soft" onClick={() => onOpen(o)}>📋 Summary</button>
        {o.notification_url && <a className="btn sm" href={o.notification_url} target="_blank" rel="noreferrer">📄 Notification</a>}
        {app ? <Link className="btn sm ghost" to="/applications">{STATUS_EMOJI[app.status]} Tracking: {STATUS_LABEL[app.status]}</Link>
          : <button className="btn sm primary" onClick={() => onTrack(o)}>➕ Track this</button>}
        {hidden ? <button className="btn sm" onClick={() => onHide(o, false)}>↩️ Bring back</button>
          : <button className="btn sm not-int" onClick={() => onHide(o, true)} title="Hide this from my list">🙈 Not interested</button>}
      </div>
    </article>
  );
}

const hello = () => { const h = new Date().getHours(); return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening"; };

export default function Openings() {
  const { uid, profile, setProfile, openings, notify, openProfile } = useApp();
  const myRoles = profile?.target_roles || [];
  const [params, setParams] = useSearchParams();
  const [apps, setApps] = useState(null);
  const [filter, setFilter] = useState(() => { const v = defaultView(); return v === "mine" && !myRoles.length ? "fit" : v || (myRoles.length ? "mine" : "fit"); });
  const [track, setTrack] = useState("");
  const [q, setQ] = useState("");
  const [openId, setOpenId] = useState(null);
  const [showNo, setShowNo] = useState(true);
  // Saved on the profile; anything saved on this device before the database update is merged in.
  const [hidden, setHidden] = useState(() => [...new Set([...(profile?.hidden_openings || []), ...localHidden(uid)])]);
  const hiddenRef = useRef(hidden);
  hiddenRef.current = hidden;
  const showHidden = params.get("hidden") === "1";
  const setShowHidden = (v) => setParams(v ? { hidden: "1" } : {});
  const hiddenSet = useMemo(() => new Set(hidden), [hidden]);
  const closeSummary = useCallback(() => setOpenId(null), []);

  const [recs, setRecs] = useState([]);
  useEffect(() => { listApplications(uid).then(setApps).catch((e) => notify(e.message, "error")); }, [uid, notify]);
  useEffect(() => { listRecommendations(uid).then(setRecs).catch(() => {}); }, [uid]);

  const rated = useMemo(() => rate(openings.items, profile).map((o) => {
    const roles = rolesOf(o);
    return { ...o, roles, mine: roles.some((r) => myRoles.includes(r)) };
  }), [openings.items, profile]); // eslint-disable-line react-hooks/exhaustive-deps
  const byOpening = useMemo(() => new Map((apps || []).filter((a) => a.opening_id).map((a) => [a.opening_id, a])), [apps]);
  const live = rated.filter((o) => o.daysLeft == null || o.daysLeft >= 0);
  const visible = live.filter((o) => !hiddenSet.has(o.id));
  const hiddenItems = live.filter((o) => hiddenSet.has(o.id));
  const fits = (o) => ["ok", "check"].includes(groupOf(o));
  const counts = { mine: visible.filter((o) => o.mine && fits(o)).length, fit: visible.filter(fits).length, all: visible.length };
  const matchQ = (o) => (!track || o.roles.includes(track)) && (!q || `${o.title} ${o.organization} ${o.location || ""}`.toLowerCase().includes(q.toLowerCase()));
  const pool = (showHidden ? hiddenItems : visible)
    .filter((o) => showHidden || filter === "all" || fits(o))
    .filter((o) => showHidden || filter !== "mine" || o.mine)
    .filter(matchQ)
    .sort((a, b) => Number(b.mine) - Number(a.mine) || (a.application_end || "9").localeCompare(b.application_end || "9") || b.match - a.match);
  const groups = GROUPS.map((g) => ({ ...g, items: pool.filter((o) => groupOf(o) === g.key) })).filter((g) => g.items.length);

  const recommended = recs.map((r) => ({ r, o: live.find((o) => o.id === r.opening_id) })).filter((x) => x.o && !hiddenSet.has(x.o.id));
  const needs = [!profile?.phone && "mobile number", !profile?.resume_path && "resume", !profile?.home_state && "home state", !profile?.date_of_birth && "date of birth"].filter(Boolean);
  const soon = visible.filter((o) => fits(o) && o.daysLeft != null && o.daysLeft <= 7).sort((a, b) => a.daysLeft - b.daysLeft);
  const firstName = (profile?.full_name || "").split(" ")[0];

  const hide = async (o, yes) => {
    const prev = hiddenRef.current;
    const next = yes ? [...new Set([...prev, o.id])] : prev.filter((x) => x !== o.id);
    hiddenRef.current = next;
    setHidden(next);
    if (yes && openId === o.id) setOpenId(null);
    try {
      const r = await saveHidden(uid, next);
      setProfile((p) => ({ ...p, hidden_openings: next }));
      if (yes) notify(r.synced ? "🙈 Marked as not interested" : "🙈 Marked as not interested on this device", "ok", { label: "Undo", fn: () => hide(o, false) });
      else notify("↩️ Back in your list");
    } catch (e) { hiddenRef.current = prev; setHidden(prev); notify(e.message, "error"); }
  };
  const selected = openId ? rated.find((o) => o.id === openId) : null;
  const track_ = async (o) => {
    try {
      const a = await addApplication({ user_id: uid, opening_id: o.id, organization: o.organization, title: o.title, track: o.track,
        status: "to_apply", deadline: o.application_end || null, exam_date: o.exam_date || null });
      setApps([a, ...(apps || [])]);
      notify("➕ Added to My applications");
    } catch (e) { notify(e.message, "error"); }
  };
  const card = (o) => <OpeningCard key={o.id} o={o} app={byOpening.get(o.id)} onTrack={track_} onOpen={(x) => setOpenId(x.id)} onHide={hide} hidden={hiddenSet.has(o.id)} />;

  if (openings.loading) return <Loading text="Loading openings…" />;
  return (
    <>
      <section className="hello">
        <h1>{hello()}{firstName ? `, ${firstName}` : ""}.</h1>
        <p className="hello-line">
          {counts.fit ? <><strong>{counts.fit} {counts.fit === 1 ? "opening fits" : "openings fit"} you</strong> right now{myRoles.length ? `, ${counts.mine} in your roles` : ""}.</> : "Nothing fits your profile right now — new openings are added as they're announced."}
        </p>
        {soon.length > 0 && (
          <div className="soon">
            <span className="soon-l">⏰ Closing this week</span>
            {soon.slice(0, 3).map((o) => (
              <button key={o.id} className="soon-item" onClick={() => setOpenId(o.id)}><strong>{o.organization}</strong> {leftText(o.daysLeft)}</button>
            ))}
          </div>
        )}
        <p className="tiny muted">Checked on official sites{openings.updatedAt ? `, last updated ${fmtDate(openings.updatedAt.slice(0, 10))}` : ""}.</p>
      </section>
      {openings.error && <div className="error mb">{openings.error}</div>}
      {needs.length > 0 && !showHidden && (
        <div className="nudge">
          <span className="e">✍️</span>
          <div style={{ flex: 1 }}><strong>Finish your profile</strong> — add your {needs.join(", ").replace(/, ([^,]*)$/, " and $1")}. It makes the eligibility check accurate and helps us recommend the right openings for you.</div>
          <button className="btn sm primary" onClick={() => openProfile("details")}>Complete profile</button>
        </div>
      )}
      {recommended.length > 0 && !showHidden && (
        <section className="group group-rec" aria-label="Recommended for you">
          <div className="group-head"><h2><E>💡</E>Recommended for you <span className="count">{recommended.length}</span></h2></div>
          <p className="group-note">Picked for you based on your profile and resume.</p>
          <div className="cards">{recommended.map(({ r, o }) => (
            <div key={r.id} className="rec-wrap">
              {r.note && <div className="rec-note">💬 “{r.note}”</div>}
              {card(o)}
            </div>
          ))}</div>
        </section>
      )}

      <div className="toolbar">
        <div className="seg" role="tablist" aria-label="Which openings">
          {[["mine", "🎯 My roles"], ["fit", "✅ Eligible for me"], ["all", "🌍 Everything"]].map(([k, l]) => (
            <button key={k} role="tab" aria-selected={!showHidden && filter === k} className={!showHidden && filter === k ? "on" : ""} disabled={k === "mine" && !myRoles.length}
              onClick={() => { setFilter(k); if (showHidden) setShowHidden(false); }}>{l}<span className="n">{counts[k]}</span></button>
          ))}
        </div>
        <div className="toolbar-row">
          <input id="o-search" placeholder="🔍 Search by name, organisation or place" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search openings" />
          <select id="o-track" value={track} onChange={(e) => setTrack(e.target.value)} aria-label="Role type">
            <option value="">📂 Every role type</option>{ROLE_TYPES.map((r) => <option key={r.key} value={r.key}>{r.e} {r.label}</option>)}
          </select>
        </div>
        <div className="small muted">
          {myRoles.length ? <>Your roles: {myRoles.map((r) => ROLE[r] && `${ROLE[r].e} ${ROLE[r].label}`).filter(Boolean).join(", ")}. </> : "You haven't picked your roles yet. "}
          <button className="linkish" onClick={() => openProfile("roles")}>Change roles</button>
          {(hiddenItems.length > 0 || showHidden) && <> &nbsp;|&nbsp; <button className="linkish" onClick={() => setShowHidden(!showHidden)}>{showHidden ? "← Back to openings" : `🙈 Not interested (${hiddenItems.length})`}</button></>}
        </div>
      </div>

      {showHidden && <div className="install"><span className="e">🙈</span><div>Openings you marked <strong>Not interested</strong>. Tap <strong>Bring back</strong> to put one back in your list.</div></div>}
      {showHidden ? (pool.length ? <div className="cards">{pool.map(card)}</div> : <div className="panel state"><span className="empty-e">🙈</span><h3>Nothing hidden</h3><p>Use “Not interested” on an opening to hide it from your list.</p></div>)
        : groups.length ? groups.map((g) => (
          <section key={g.key} className={`group group-${g.key}`} aria-label={g.title}>
            <div className="group-head">
              <h2><E>{g.e}</E>{g.title} <span className="count">{g.items.length}</span></h2>
              {g.key === "no" && <button className="btn sm ghost" onClick={() => setShowNo(!showNo)}>{showNo ? "Hide" : "Show"}</button>}
            </div>
            <p className="group-note">{g.note}</p>
            {(g.key !== "no" || showNo) && <div className="cards">{g.items.map(card)}</div>}
          </section>
        ))
        : <div className="panel state"><span className="empty-e">🌱</span>
            <h3>{filter === "mine" ? "Nothing open in your roles that fits you right now" : "No open openings match"}</h3>
            <p>{filter === "mine" ? "See what fits you in other roles, or everything that's open." : "Try Everything, or another role type."}</p>
            <div className="row" style={{ justifyContent: "center" }}>
              {filter === "mine" && <button className="btn primary" onClick={() => setFilter("fit")}>✅ Eligible for me</button>}
              <button className="btn" onClick={() => setFilter("all")}>🌍 Everything</button>
            </div></div>}
      {selected && <OpeningPanel o={selected} app={byOpening.get(selected.id)} onTrack={track_} onClose={closeSummary} hidden={hiddenSet.has(selected.id)} onHide={hide} />}
    </>
  );
}
