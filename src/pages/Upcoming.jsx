import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { listApplications } from "../lib/data";
import { daysFrom, fmtDate, rate } from "../lib/util";
import { E, Loading, Stamp, useApp } from "../ui";

export default function Upcoming() {
  const { uid, profile, openings, notify } = useApp();
  const [apps, setApps] = useState(null);
  useEffect(() => { listApplications(uid).then(setApps).catch((e) => { notify(e.message, "error"); setApps([]); }); }, [uid, notify]);

  const events = useMemo(() => {
    if (!apps) return [];
    const out = [];
    const tracked = new Set(apps.map((a) => a.opening_id).filter(Boolean));
    for (const a of apps) {
      if (["selected", "rejected"].includes(a.status)) continue;
      if (a.status === "to_apply" && a.deadline) out.push({ date: a.deadline, what: "Last day to apply", e: "⏰", title: a.title, org: a.organization, mine: true });
      if (a.exam_date) out.push({ date: a.exam_date, what: "Exam", e: "✍️", title: a.title, org: a.organization, mine: true });
      if (a.interview_date) out.push({ date: a.interview_date, what: "Interview", e: "🎤", title: a.title, org: a.organization, mine: true });
    }
    for (const o of rate(openings.items, profile)) {
      if (tracked.has(o.id) || !o.application_end || !["CURRENTLY_ELIGIBLE", "POTENTIALLY_ELIGIBLE"].includes(o.elig.status)) continue;
      out.push({ date: o.application_end, what: "Closes", e: "🔔", title: o.title, org: o.organization, mine: false });
    }
    return out.map((e) => ({ ...e, days: daysFrom(e.date) })).filter((e) => e.days >= 0 && e.days <= 60).sort((a, b) => a.date.localeCompare(b.date));
  }, [apps, openings.items, profile]);

  if (!apps) return <Loading />;
  const thisWeek = events.filter((e) => e.days <= 7);
  return (
    <>
      <div className="head"><div><h1><E>📅</E>Upcoming</h1><p>Deadlines, exams and interviews in the next 60 days. 🔴 Red = 3 days or less.</p></div></div>
      {thisWeek.length > 0 && <div className="notice mb">🔥 <strong>{thisWeek.length}</strong> date{thisWeek.length > 1 ? "s" : ""} in the next 7 days.</div>}
      <section className="panel">
        {events.length ? (
          <div className="list">{events.map((e, i) => (
            <div className="item" key={i}>
              <Stamp date={e.date} days={e.days} />
              <div className="body">
                <span className="t"><E>{e.e}</E> {e.what}: {e.title}</span>
                <div className="meta"><span>{e.org}</span><span>· {fmtDate(e.date)}</span>{!e.mine && <span className="badge yellow">👀 You're eligible — not tracked</span>}</div>
              </div>
              {!e.mine && <Link className="btn sm" to="/openings">🔎 View</Link>}
            </div>
          ))}</div>
        ) : <div className="state"><span className="empty-e">🏖️</span><h3>No dates in the next 60 days</h3><p>Track openings or add exam dates to your applications to see them here.</p></div>}
      </section>
    </>
  );
}
