import { createContext, useContext, useEffect, useState } from "react";
import { urgency } from "./lib/util";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export const AppContext = createContext(null);
export const useApp = () => useContext(AppContext);

export function Stamp({ date, days }) {
  if (!date) return <div className="stamp none" title="No date stated"><span className="d">—</span><span className="m">no date</span></div>;
  const [, m, d] = date.slice(0, 10).split("-").map(Number);
  return <div className={`stamp ${urgency(days)}`}><span className="d">{d}</span><span className="m">{MONTHS[m - 1]}</span></div>;
}

export const NA = () => <span className="na">Not stated — check notification</span>;

export function Modal({ title, onClose, children, footer }) {
  useEffect(() => {
    const k = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);
  return (
    <div className="modal-back" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title}>
        <div className="spread mb"><h2>{title}</h2><button className="btn ghost" onClick={onClose} aria-label="Close">✕</button></div>
        {children}
        {footer && <div className="foot">{footer}</div>}
      </div>
    </div>
  );
}

export function Field({ label, hint, wide, children }) {
  return <label className={`field ${wide ? "wide" : ""}`}>{label}{children}{hint && <span className="hint">{hint}</span>}</label>;
}

export function Loading({ text = "Loading…" }) {
  return <div className="state"><p>{text}</p></div>;
}

/** Two-click confirm (avoids browser dialogs). */
export function useConfirm() {
  const [armed, setArmed] = useState(null);
  useEffect(() => { if (!armed) return; const t = setTimeout(() => setArmed(null), 4000); return () => clearTimeout(t); }, [armed]);
  return { armed, ask: (id) => { if (armed === id) { setArmed(null); return true; } setArmed(id); return false; } };
}

export const ELIG_TONE = { CURRENTLY_ELIGIBLE: "green", POTENTIALLY_ELIGIBLE: "yellow", ELIGIBLE_AFTER_BED: "blue", ELIGIBLE_AFTER_TET: "blue", NOT_ELIGIBLE: "red" };
export const STATUS_TONE = { to_apply: "", applied: "blue", exam: "orange", interview: "orange", selected: "green", rejected: "red" };
