import { useEffect, useState } from "react";
import { addMock, deleteMock, EXAM_GROUPS, listMocks } from "../lib/data";
import { fmtDate, mockSummary, todayISO } from "../lib/util";
import { E, Field, Loading, useApp, useConfirm } from "../ui";

export function Spark({ series }) {
  if (!series || series.length < 2) return null;
  const w = 300, h = 60, pad = 6;
  const pts = series.map((v, i) => [pad + (i * (w - 2 * pad)) / (series.length - 1), h - pad - ((h - 2 * pad) * v) / 100]);
  return (
    <svg className="spark" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" role="img" aria-label="Score trend">
      <polyline points={pts.map((p) => p.join(",")).join(" ")} vectorEffect="non-scaling-stroke" />
      <circle cx={pts.at(-1)[0]} cy={pts.at(-1)[1]} r="3.5" />
    </svg>
  );
}

export default function Mocks() {
  const { uid, notify } = useApp();
  const [mocks, setMocks] = useState(null);
  const [group, setGroup] = useState("");
  const [f, setF] = useState({ exam_group: "banking", exam_name: "", test_date: todayISO(), score: "", total_marks: "100", accuracy: "" });
  const [error, setError] = useState(null);
  const { armed, ask } = useConfirm();

  useEffect(() => { listMocks(uid).then(setMocks).catch((e) => { notify(e.message, "error"); setMocks([]); }); }, [uid, notify]);
  if (!mocks) return <Loading />;

  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const add = async (e) => {
    e.preventDefault(); setError(null);
    const score = Number(f.score), total = Number(f.total_marks), acc = f.accuracy === "" ? null : Number(f.accuracy);
    if (f.exam_name.trim().length < 2) return setError("Enter the exam name, e.g. SBI PO Prelims.");
    if (f.score === "" || isNaN(score)) return setError("Enter your score.");
    if (!(total > 0)) return setError("Total marks must be more than 0.");
    if (score > total) return setError("Score can't be more than total marks.");
    if (acc != null && (acc < 0 || acc > 100)) return setError("Accuracy is a percentage between 0 and 100.");
    try {
      const m = await addMock({ user_id: uid, exam_group: f.exam_group, exam_name: f.exam_name.trim(), test_date: f.test_date, score, total_marks: total, accuracy: acc });
      setMocks([m, ...mocks]); setF({ ...f, score: "", accuracy: "" }); notify("💾 Score saved");
    } catch (err) { setError(err.message); }
  };
  const remove = async (m) => {
    if (!ask(m.id)) return;
    try { await deleteMock(m.id); setMocks(mocks.filter((x) => x.id !== m.id)); } catch (e) { notify(e.message, "error"); }
  };
  const list = mocks.filter((m) => !group || m.exam_group === group);
  const s = mockSummary(list);
  const groupsUsed = [...new Set(mocks.map((m) => m.exam_group))];

  return (
    <>
      <div className="head"><div><h1><E>📊</E>Mock scores</h1><p>Log every mock to see your average and whether you're improving.</p></div></div>
      <div className="grid-2 mb">
        <form className="panel stack" onSubmit={add} noValidate>
          <h2><E>✏️</E>Add a score</h2>
          {error && <div className="error">{error}</div>}
          <div className="form-grid">
            <Field label="Exam type"><select id="m-group" value={f.exam_group} onChange={set("exam_group")}>{Object.entries(EXAM_GROUPS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Field>
            <Field label="Exam name"><input id="m-name" value={f.exam_name} onChange={set("exam_name")} placeholder="e.g. SBI PO Prelims" /></Field>
            <Field label="Date"><input id="m-date" type="date" value={f.test_date} onChange={set("test_date")} /></Field>
            <Field label="Score"><input id="m-score" type="number" step="0.25" value={f.score} onChange={set("score")} /></Field>
            <Field label="Out of"><input id="m-total" type="number" value={f.total_marks} onChange={set("total_marks")} /></Field>
            <Field label="Accuracy % (optional)"><input id="m-acc" type="number" min="0" max="100" value={f.accuracy} onChange={set("accuracy")} /></Field>
          </div>
          <button className="btn primary">💾 Save score</button>
        </form>
        <section className="panel stack">
          <div className="spread"><h2><E>📈</E>Progress</h2>
            {groupsUsed.length > 1 && <select value={group} onChange={(e) => setGroup(e.target.value)} style={{ width: "auto" }} aria-label="Exam type">
              <option value="">All exams</option>{groupsUsed.map((g) => <option key={g} value={g}>{EXAM_GROUPS[g]}</option>)}</select>}
          </div>
          {s ? (
            <>
              <div className="strip flat">
                <div><span className="ic">🎯</span><div className="n">{s.average}%</div><div className="l">Average</div></div>
                <div><span className="ic">🏆</span><div className="n">{s.best}%</div><div className="l">Best</div></div>
                <div><span className="ic">{s.change >= 0 ? "🚀" : "📉"}</span><div className="n" style={{ color: s.change >= 0 ? "var(--green)" : "var(--red)" }}>{s.change > 0 ? "+" : ""}{s.change}</div><div className="l">Change (pts)</div></div>
              </div>
              <Spark series={s.series} />
              <p className="tiny muted">Change compares your later mocks with your earlier ones.</p>
            </>
          ) : <p className="muted small">🌱 Your average and trend appear after your first score.</p>}
        </section>
      </div>
      {list.length > 0 && (
        <section className="panel table-wrap">
          <table><thead><tr><th>Date</th><th>Exam</th><th>Score</th><th>Accuracy</th><th></th></tr></thead>
            <tbody>{list.map((m) => (
              <tr key={m.id}><td>{fmtDate(m.test_date, false)}</td><td>{m.exam_name} <span className="tiny muted">{EXAM_GROUPS[m.exam_group]}</span></td>
                <td className="strong">{m.score}/{m.total_marks} <span className="muted small">({Math.round((1000 * m.score) / m.total_marks) / 10}%)</span></td>
                <td>{m.accuracy != null ? `${m.accuracy}%` : "—"}</td>
                <td><button className="btn sm ghost danger" onClick={() => remove(m)}>{armed === m.id ? "⚠️ Confirm" : "🗑️ Delete"}</button></td></tr>
            ))}</tbody></table>
        </section>
      )}
    </>
  );
}
