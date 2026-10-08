import { useEffect, useMemo, useState } from "react";
import { adminAll, EXAM_GROUPS, STATUSES, STATUS_LABEL } from "../lib/data";
import { candidateSummary } from "../lib/eligibility";
import { daysFrom, fmtDate, fmtWhen, mockSummary } from "../lib/util";
import { E, Loading, ROLE, STATUS_EMOJI, STATUS_TONE, useApp } from "../ui";
import { Spark } from "./Mocks";

const RoleList = ({ roles, short }) => (roles?.length
  ? <span className="row" style={{ gap: 4 }}>{roles.filter((r) => ROLE[r]).map((r) => <span key={r} className="badge accent" title={ROLE[r].label}>{ROLE[r].e}{short ? "" : ` ${ROLE[r].label}`}</span>)}</span>
  : <span className="muted">Not set</span>);

const ROLES_SQL = "alter table public.profiles add column if not exists target_roles text[] not null default '{}';";

function FriendDetail({ p, apps, mocks, onClose }) {
  const s = mockSummary(mocks);
  return (
    <section className="panel mt" aria-label={`Details for ${p.full_name}`}>
      <div className="spread mb">
        <div><h2>{p.full_name || "(no name yet)"}</h2><p className="small muted">{p.email}{p.phone ? ` · ${p.phone}` : ""}</p></div>
        <button className="btn sm" onClick={onClose}>✖️ Close</button>
      </div>
      <div className="grid-2">
        <div className="stack">
          <dl className="facts">
            <dt>Looking for</dt><dd><RoleList roles={p.target_roles} /></dd>
            <dt>Qualification</dt><dd>{candidateSummary(p) || "—"}</dd>
            <dt>Date of birth</dt><dd>{p.date_of_birth ? fmtDate(p.date_of_birth) : "—"}</dd>
            <dt>Home state</dt><dd>{p.home_state || "—"}</dd>
            <dt>TET / exams</dt><dd>{[...(p.tets_cleared || []), ...(p.exams_cleared || [])].join(", ") || "None yet"}</dd>
            <dt>Joined</dt><dd>{fmtDate(p.created_at?.slice(0, 10))}</dd>
            <dt>Last active</dt><dd>{fmtWhen(p.last_seen_at)}</dd>
          </dl>
          <div>
            <h3 style={{ marginBottom: 6 }}><E>📊</E>Mock tests</h3>
            {s ? (<>
              <p className="small">{s.count} mocks · average <strong>{s.average}%</strong> · best {s.best}% · change {s.change > 0 ? "+" : ""}{s.change} pts</p>
              <Spark series={s.series} />
              <div className="list">{mocks.slice(0, 6).map((m) => (
                <div className="item" key={m.id} style={{ padding: "6px 0" }}><span className="body small">{fmtDate(m.test_date, false)} · {m.exam_name} <span className="muted">({EXAM_GROUPS[m.exam_group]})</span></span>
                  <span className="strong small">{Math.round((1000 * m.score) / m.total_marks) / 10}%</span></div>))}</div>
            </>) : <p className="small muted">No mock scores yet.</p>}
          </div>
        </div>
        <div>
          <h3 style={{ marginBottom: 6 }}><E>📝</E>Applications ({apps.length})</h3>
          {apps.length ? (
            <div className="list">{apps.map((a) => (
              <div className="item" key={a.id} style={{ alignItems: "flex-start" }}>
                <div className="body">
                  <span className="t" style={{ fontSize: 14 }}>{a.title}</span>
                  <div className="meta">
                    <span>{a.organization}</span>
                    {a.applied_date && <span>· applied {fmtDate(a.applied_date, false)}</span>}
                    {a.exam_date && <span>· exam {fmtDate(a.exam_date, false)}</span>}
                    {a.interview_date && <span>· interview {fmtDate(a.interview_date, false)}</span>}
                    {a.status === "to_apply" && a.deadline && <span>· deadline {fmtDate(a.deadline, false)}{daysFrom(a.deadline) < 0 ? " (missed)" : ""}</span>}
                  </div>
                  {a.history?.length > 1 && <div className="tiny muted" style={{ marginTop: 2 }}>{a.history.map((h) => `${STATUS_EMOJI[h.to]} ${STATUS_LABEL[h.to]}`).join(" → ")}</div>}
                </div>
                <span className={`badge ${STATUS_TONE[a.status]}`}>{STATUS_EMOJI[a.status]} {STATUS_LABEL[a.status]}</span>
              </div>))}</div>
          ) : <p className="small muted">Hasn't tracked any applications yet.</p>}
        </div>
      </div>
    </section>
  );
}

export default function Admin() {
  const { notify, openings, email } = useApp();
  const [d, setD] = useState(null);
  const [sel, setSel] = useState(null);
  const [q, setQ] = useState("");

  const load = () => adminAll().then(setD).catch((e) => { notify(e.message, "error"); setD({ profiles: [], applications: [], mocks: [] }); });
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const rows = useMemo(() => {
    if (!d) return [];
    return d.profiles.filter((p) => (p.email || "").toLowerCase() !== (email || "").toLowerCase()).map((p) => {
      const apps = d.applications.filter((a) => a.user_id === p.id).sort((a, b) => (b.updated_at || "").localeCompare(a.updated_at || ""));
      const mocks = d.mocks.filter((m) => m.user_id === p.id).sort((a, b) => b.test_date.localeCompare(a.test_date));
      const c = Object.fromEntries(STATUSES.map((s) => [s.key, apps.filter((a) => a.status === s.key).length]));
      const lastAct = [p.last_seen_at, ...apps.map((a) => a.updated_at), ...mocks.map((m) => m.created_at)].filter(Boolean).sort().at(-1);
      return { p, apps, mocks, c, submitted: apps.length - c.to_apply, mock: mockSummary(mocks), lastAct };
    }).sort((a, b) => (b.lastAct || "").localeCompare(a.lastAct || ""));
  }, [d, email]);

  if (!d) return <Loading text="Loading everyone's progress…" />;
  const weekAgo = new Date(Date.now() - 7 * 864e5).toISOString();
  const shown = rows.filter((r) => !q || `${r.p.full_name} ${r.p.email} ${r.p.phone || ""}`.toLowerCase().includes(q.toLowerCase()));
  const selected = rows.find((r) => r.p.id === sel);
  const total = (k) => rows.reduce((a, r) => a + r.c[k], 0);
  const needsRolesColumn = d.profiles.length > 0 && !d.profiles.some((p) => "target_roles" in p);
  const byRole = Object.values(ROLE).map((r) => ({ ...r, n: rows.filter((x) => x.p.target_roles?.includes(r.key)).length })).filter((r) => r.n);

  return (
    <>
      <div className="head">
        <div><h1><E>🛡️</E>Admin</h1><p>Everyone who signed up, what they applied for, and how they're doing. 👀 Read-only.</p></div>
        <button className="btn" onClick={load}>🔄 Refresh</button>
      </div>
      {needsRolesColumn && (
        <div className="install" role="alert">
          <span className="e">🛠️</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <strong>One-time database update needed to save everyone's roles.</strong>
            <div className="small">Supabase → SQL Editor → New query → paste this → Run:</div>
            <code className="sql">{ROLES_SQL}</code>
          </div>
          <button className="btn sm" onClick={() => navigator.clipboard?.writeText(ROLES_SQL).then(() => notify("📋 SQL copied"))}>📋 Copy</button>
        </div>
      )}
      <div className="strip">
        <div><span className="ic">👥</span><div className="n">{rows.length}</div><div className="l">Friends signed up</div></div>
        <div><span className="ic">🟢</span><div className="n">{rows.filter((r) => (r.lastAct || "") >= weekAgo).length}</div><div className="l">Active this week</div></div>
        <div><span className="ic">📨</span><div className="n">{rows.reduce((a, r) => a + r.submitted, 0)}</div><div className="l">Applications sent</div></div>
        <div><span className="ic">✍️</span><div className="n">{total("exam") + total("interview")}</div><div className="l">At exam / interview</div></div>
        <div><span className="ic">🎉</span><div className="n">{total("selected")}</div><div className="l">Selected</div></div>
        <div><span className="ic">🔎</span><div className="n">{openings.items.length}</div><div className="l">Openings listed</div></div>
      </div>
      {byRole.length > 0 && (
        <div className="row mb" style={{ gap: 6 }} aria-label="What friends are looking for">
          <span className="small muted">🎯 Looking for:</span>
          {byRole.map((r) => <span key={r.key} className="badge accent">{r.e} {r.label} · {r.n}</span>)}
        </div>
      )}
      <section className="panel">
        <div className="spread mb"><h2><E>👥</E>Friends</h2><input id="admin-search" placeholder="🔍 Search name, email, phone…" value={q} onChange={(e) => setQ(e.target.value)} style={{ maxWidth: 260 }} aria-label="Search friends" /></div>
        {shown.length ? (
          <div className="table-wrap"><table>
            <thead><tr><th>👤 Name</th><th>🎯 Looking for</th><th>🎓 Qualification</th><th>📝 To apply</th><th>📨 Applied</th><th>✍️ Exam / 🎤 Interview</th><th>🎉 Selected</th><th>📊 Mock avg</th><th>🕒 Last active</th></tr></thead>
            <tbody>{shown.map((r) => (
              <tr key={r.p.id} className={`click ${sel === r.p.id ? "sel" : ""}`} onClick={() => setSel(sel === r.p.id ? null : r.p.id)} tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && setSel(sel === r.p.id ? null : r.p.id)}>
                <td><div className="strong">{r.p.full_name || "(no name yet)"}</div><div className="tiny muted">{r.p.email}{r.p.phone ? ` · ${r.p.phone}` : ""}</div></td>
                <td className="small"><RoleList roles={r.p.target_roles} short /></td>
                <td className="small">{candidateSummary(r.p) || "—"}</td>
                <td>{r.c.to_apply}</td><td>{r.c.applied}</td><td>{r.c.exam + r.c.interview}</td>
                <td>{r.c.selected ? <span className="badge green">🎉 {r.c.selected}</span> : 0}</td>
                <td>{r.mock ? `${r.mock.average}%` : "—"}</td>
                <td className="small">{fmtWhen(r.lastAct)}</td>
              </tr>))}</tbody>
          </table></div>
        ) : <div className="state"><span className="empty-e">📣</span><h3>No one has signed up yet</h3><p>Share the website link with your friends. They'll appear here after they create an account and fill in their profile.</p></div>}
      </section>
      {selected && <FriendDetail p={selected.p} apps={selected.apps} mocks={selected.mocks} onClose={() => setSel(null)} />}
    </>
  );
}
