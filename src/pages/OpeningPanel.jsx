import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { STATUS_LABEL } from "../lib/data";
import { EMPLOYMENT_TYPES } from "../lib/tracks";
import { fmtDate, leftText } from "../lib/util";
import { E, ELIG_EMOJI, ELIG_TONE, ROLE, STATUS_EMOJI } from "../ui";

const RESULT_ICON = { pass: "✅", fail: "❌", warn: "⚠️", unknown: "❔", pending_bed: "⏳", pending_tet: "📘" };
const NS = <span className="na">Not stated — check notification</span>;

/** One fact tile in the summary grid. */
function Fact({ e, label, value, wide }) {
  return (
    <div className={`fact ${wide ? "wide" : ""}`}>
      <div className="fact-l"><E>{e}</E>{label}</div>
      <div className="fact-v">{value || NS}</div>
    </div>
  );
}

const host = (u) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return u; } };

/** Summary of one opening: slides in from the right, like the profile panel. */
export default function OpeningPanel({ o, app, onTrack, onClose, hidden, onHide }) {
  const ref = useRef(null);
  useEffect(() => {
    const k = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    document.body.style.overflow = "hidden";
    ref.current?.focus();
    return () => { window.removeEventListener("keydown", k); document.body.style.overflow = ""; };
  }, [onClose]);

  const dates = [
    ["📢", "Notified", o.posted_date],
    ["🟢", "Applications open", o.application_start],
    ["⏰", "Last date to apply", o.application_end, true],
    ["🪪", "Admit card", o.admit_card_date],
    ["✍️", "Exam", o.exam_date, false, o.exam_date_text],
    ["🎤", "Interview", o.interview_date],
    ["🏁", "Result", o.result_date],
  ].filter(([, , d, , t]) => d || t);
  const other = o.requirements?.other_requirements || [];

  return (
    <div className="drawer-back" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <aside className="drawer opening" role="dialog" aria-modal="true" aria-label={`Summary: ${o.title}`} tabIndex={-1} ref={ref}>
        <div className="drawer-head">
          <div style={{ flex: 1, minWidth: 0 }}>
            {o.roles?.length > 0 && (
              <div className="tags">{o.roles.map((r) => <span key={r} className={`role-tag r-${r}`}><E>{ROLE[r].e}</E>{ROLE[r].label}</span>)}{o.mine && <span className="tag-yours">🎯 Your role</span>}</div>
            )}
            <h2 className="op-title">{o.title}</h2>
            <p className="small muted">🏢 {o.organization}{o.employment_type ? ` · ${EMPLOYMENT_TYPES[o.employment_type] || o.employment_type}` : ""}</p>
            <div className="row" style={{ gap: 6, marginTop: 8 }}>
              <span className={`badge ${ELIG_TONE[o.elig.status]}`}><E>{ELIG_EMOJI[o.elig.status]}</E>{o.elig.label}</span>
              {o.application_end && <span className={`badge ${o.daysLeft <= 3 ? "red" : o.daysLeft <= 7 ? "orange" : "blue"}`}>⏰ Apply by {fmtDate(o.application_end, false)} · {leftText(o.daysLeft)}</span>}
            </div>
          </div>
          <button className="btn ghost" onClick={onClose} aria-label="Close summary">✕</button>
        </div>

        <div className="drawer-body">
          {o.ai_summary && (
            <section className="psec">
              <h3 className="sec-h"><E>📝</E>In short</h3>
              <p>{o.ai_summary}</p>
            </section>
          )}

          <section className="psec">
            <h3 className="sec-h"><E>📋</E>Key facts</h3>
            <div className="fact-grid">
              <Fact e="💰" label="Pay / stipend" value={o.salary_text} />
              <Fact e="👥" label="Vacancies" value={o.vacancies} />
              <Fact e="📍" label="Location" value={o.location} />
              <Fact e="💳" label="Application fee" value={o.fee_text} />
              <Fact e="🎓" label="Qualification" value={o.qualification_text} wide />
              <Fact e="🎂" label="Age limit" value={o.age_limit_text} wide />
              {o.experience_text && <Fact e="💼" label="Experience" value={o.experience_text} wide />}
              {o.selection_text && <Fact e="🧭" label="Selection process" value={o.selection_text} wide />}
              {o.how_to_apply_text && <Fact e="📨" label="How to apply" value={o.how_to_apply_text} wide />}
            </div>
          </section>

          <section className="psec">
            <h3 className="sec-h"><E>📅</E>Important dates</h3>
            {dates.length ? (
              <ol className="timeline">{dates.map(([e, l, d, key, t]) => (
                <li key={l} className={key ? "key" : ""}><span className="t-e">{e}</span><span className="t-l">{l}</span><span className="t-d">{d ? fmtDate(d) : t}</span></li>
              ))}</ol>
            ) : <p className="small">{NS}</p>}
          </section>

          <section className="psec">
            <h3 className="sec-h"><E>🧾</E>Can you apply?</h3>
            <ul className="checks">{o.elig.checks.map((c, i) => (
              <li key={i} className={c.result}><span>{RESULT_ICON[c.result] || "•"}</span><span><strong>{c.label}:</strong> {c.detail}</span></li>
            ))}</ul>
            {other.length > 0 && <>
              <h4 className="small" style={{ margin: "12px 0 4px" }}>📌 Also check</h4>
              <ul className="plain">{other.map((x, i) => <li key={i}>{x}</li>)}</ul>
            </>}
          </section>

          <p className="tiny muted" style={{ margin: "4px 2px 16px" }}>
            Facts are taken only from official pages{o.verified_from?.length ? <> ({o.verified_from.slice(0, 3).map((u, i) => <span key={u}>{i ? ", " : ""}<a href={u} target="_blank" rel="noreferrer">{host(u)}</a></span>)})</> : ""}. Anything marked "Not stated" is in the official notification — always read it before applying.
          </p>
        </div>

        <div className="drawer-out op-actions">
          {o.notification_url ? <a className="btn" href={o.notification_url} target="_blank" rel="noreferrer">📄 Official notification</a> : <span className="small muted">No notification link yet</span>}
          {o.apply_url && <a className="btn" href={o.apply_url} target="_blank" rel="noreferrer">🌐 Apply</a>}
          {app ? <Link className="btn ghost" to="/applications" onClick={onClose}>{STATUS_EMOJI[app.status]} Tracking: {STATUS_LABEL[app.status]}</Link>
            : <button className="btn primary" onClick={() => onTrack(o)}>➕ Track this</button>}
          {onHide && (hidden ? <button className="btn" onClick={() => onHide(o, false)}>↩️ Bring back</button>
            : <button className="btn not-int" onClick={() => onHide(o, true)}>🙈 Not interested</button>)}
        </div>
      </aside>
    </div>
  );
}
