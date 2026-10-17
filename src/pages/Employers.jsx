import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { SUB_LABELS, TRACK } from "../lib/tracks";
import { todayISO } from "../lib/util";
import { E, Loading, useApp } from "../ui";

/** Top-level groups on this page. Each lists organisations by subcategory, in the order given. */
const TABS = [
  { key: "it", e: "💻", label: "IT companies", tracks: ["it", "corporate"], order: ["it_services", "product", "gcc", "analytics", "consulting", "operations", "analyst", "pmo", "trainee"] },
  { key: "banks", e: "🏦", label: "Banks", tracks: ["banking"], order: ["psu_bank", "private_bank", "small_finance_bank", "payments_bank", "rrb_bank", "foreign_bank", "regulator", "cooperative"] },
  { key: "psu", e: "🏭", label: "PSUs", tracks: ["psu"], order: ["maharatna", "navratna", "miniratna"] },
  { key: "gov", e: "🏛️", label: "Government", tracks: ["government"], order: ["recruitment_body", "ministry", "research_org", "regulator", "central_govt", "ssc", "railways", "psc", "state_govt", "court", "legislature", "postal"] },
  { key: "edu", e: "🎓", label: "Education & research", tracks: ["schools", "colleges", "physics_research"], order: [] },
  { key: "ins", e: "☂️", label: "Insurance", tracks: ["insurance", "apprenticeship"], order: ["public_insurer", "private_insurer", "regulator"] },
  { key: "syl", e: "📚", label: "Exam syllabus" },
];
const CITIES = ["Bengaluru", "Chennai", "Coimbatore"];
const host = (u) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return ""; } };
const norm = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

function OrgRow({ org, open }) {
  return (
    <li className="org">
      <div className="org-main">
        <div className="org-name">{org.name}</div>
        <div className="org-meta">
          {org.location && <span>📍 {org.location}</span>}
          {org.offices?.length > 0 && <span className="org-cities">{org.offices.map((c) => <span key={c} className="city">{c}</span>)}</span>}
          {org.fresher_program && <span className="fresher">🎓 {org.fresher_program}</span>}
        </div>
        {org.notes && <div className="org-note">{org.notes}</div>}
      </div>
      <div className="org-actions">
        {open > 0 && <Link className="badge green" to={`/openings?q=${encodeURIComponent(org.name)}`}>{open} open now</Link>}
        {org.recruitment_url ? <a className="btn sm" href={org.recruitment_url} target="_blank" rel="noreferrer">Careers page</a>
          : org.url && <a className="btn sm ghost" href={org.url} target="_blank" rel="noreferrer">{host(org.url) || "Website"}</a>}
      </div>
    </li>
  );
}

function Syllabus() {
  const [d, setD] = useState(null);
  const [q, setQ] = useState("");
  useEffect(() => { fetch(`/syllabus.json?t=${Date.now()}`).then((r) => r.json()).then(setD).catch(() => setD({ syllabi: [] })); }, []);
  if (!d) return <Loading text="Loading syllabus links…" />;
  const items = (d.syllabi || []).filter((x) => !q || norm(`${x.exam} ${x.body}`).includes(norm(q)));
  const bodies = [...new Set(items.map((x) => x.body))];
  return (
    <>
      <input className="emp-search" placeholder="🔍 Search an exam, e.g. IBPS PO, TNPSC Group IV" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search exams" />
      {bodies.length ? bodies.map((b) => (
        <section key={b} className="emp-group">
          <h2>{b} <span className="count">{items.filter((x) => x.body === b).length}</span></h2>
          <ul className="org-list">{items.filter((x) => x.body === b).map((x) => (
            <li key={x.exam} className="org">
              <div className="org-main">
                <div className="org-name">{x.exam}</div>
                {x.pattern_summary && <div className="org-note">{x.pattern_summary}</div>}
                {x.note && <div className="org-note muted">{x.note}</div>}
              </div>
              <div className="org-actions">{x.syllabus_url ? <a className="btn sm" href={x.syllabus_url} target="_blank" rel="noreferrer">📚 Syllabus</a> : <span className="tiny muted">Not published yet</span>}</div>
            </li>
          ))}</ul>
        </section>
      )) : <div className="panel state"><span className="empty-e">📚</span><h3>No syllabus links yet</h3><p>They'll appear here once collected from the official exam sites.</p></div>}
    </>
  );
}

export default function Employers() {
  const { openings } = useApp();
  const [dir, setDir] = useState(null);
  const [tab, setTab] = useState("it");
  const [q, setQ] = useState("");
  const [city, setCity] = useState("");
  useEffect(() => { fetch(`/directory.json?t=${Date.now()}`).then((r) => r.json()).then((d) => setDir(d.organisations || [])).catch(() => setDir([])); }, []);

  // Count open openings per organisation (by name).
  const openCount = useMemo(() => {
    const m = new Map();
    const today = todayISO();
    for (const o of openings.items) {
      if (o.application_end && o.application_end < today) continue;
      const k = norm(o.organization);
      m.set(k, (m.get(k) || 0) + 1);
    }
    return m;
  }, [openings.items]);

  if (!dir) return <Loading text="Loading employers…" />;
  const t = TABS.find((x) => x.key === tab);
  const counts = Object.fromEntries(TABS.filter((x) => x.tracks).map((x) => [x.key, dir.filter((o) => x.tracks.includes(o.track)).length]));
  const list = t.tracks ? dir.filter((o) => t.tracks.includes(o.track))
    .filter((o) => !q || norm(`${o.name} ${o.location || ""} ${o.fresher_program || ""}`).includes(norm(q)))
    .filter((o) => !city || o.offices?.includes(city)) : [];
  const subs = t.tracks ? [...new Set([...t.order, ...list.map((o) => o.subcategory)])].filter((s) => list.some((o) => o.subcategory === s)) : [];
  const withCareers = dir.filter((o) => o.recruitment_url).length;

  return (
    <>
      <div className="head">
        <div>
          <h1><E>📚</E>Career sites & exam syllabus</h1>
          <p>The {dir.length} organisations our scan checks — jobs in Tamil Nadu, Kerala and Karnataka, plus central government jobs from anywhere in India ({withCareers} with a direct careers link). You don't need to visit these yourself — anything open appears on <Link to="/openings">Openings</Link>. Use this page to open a careers site directly or read an exam's official syllabus.</p>
        </div>
      </div>
      <div className="seg emp-tabs" role="tablist" aria-label="Employer type">
        {TABS.map((x) => (
          <button key={x.key} role="tab" aria-selected={tab === x.key} className={tab === x.key ? "on" : ""} onClick={() => { setTab(x.key); setCity(""); }}>
            <span className="e">{x.e}</span>{x.label}{x.tracks && <span className="n">{counts[x.key]}</span>}
          </button>
        ))}
      </div>

      {tab === "syl" ? <Syllabus /> : (
        <>
          <div className="emp-tools">
            <input className="emp-search" placeholder={`🔍 Search ${t.key === "it" || t.key === "psu" ? t.label : t.label.toLowerCase()} by name`} value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search employers" />
            {tab === "it" && (
              <div className="chips" role="group" aria-label="City">
                <button className={`chip ${!city ? "on" : ""}`} onClick={() => setCity("")}>All cities</button>
                {CITIES.map((c) => <button key={c} className={`chip ${city === c ? "on" : ""}`} onClick={() => setCity(c)}>📍 {c}</button>)}
              </div>
            )}
          </div>
          {subs.length ? subs.map((s) => {
            const items = list.filter((o) => o.subcategory === s).sort((a, b) => (openCount.get(norm(b.name)) || 0) - (openCount.get(norm(a.name)) || 0) || a.name.localeCompare(b.name));
            return (
              <section key={s} className="emp-group">
                <h2>{SUB_LABELS[s] || TRACK[items[0].track]?.label || s} <span className="count">{items.length}</span></h2>
                <ul className="org-list">{items.map((o) => <OrgRow key={o.slug} org={o} open={openCount.get(norm(o.name)) || 0} />)}</ul>
              </section>
            );
          }) : <div className="panel state"><span className="empty-e">🔍</span><h3>No match</h3><p>Try another name{tab === "it" ? " or city" : ""}.</p></div>}
        </>
      )}
    </>
  );
}
