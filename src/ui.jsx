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

// ---------------------------------------------------------------- emoji vocabulary (one meaning each, used everywhere)
export const TAB_EMOJI = { openings: "🔎", applications: "📝", upcoming: "📅", mocks: "📊", profile: "👤", admin: "🛡️" };
export const TRACK_EMOJI = { banking: "🏦", government: "🏛️", insurance: "☂️", physics_research: "🔬", schools: "🏫", colleges: "🎓", apprenticeship: "🛠️", corporate: "💼" };
export const STATUS_EMOJI = { to_apply: "📝", applied: "📨", exam: "✍️", interview: "🎤", selected: "🎉", rejected: "🙁" };
export const ELIG_EMOJI = { CURRENTLY_ELIGIBLE: "✅", POTENTIALLY_ELIGIBLE: "🤔", ELIGIBLE_AFTER_BED: "⏳", ELIGIBLE_AFTER_TET: "📘", NOT_ELIGIBLE: "❌" };
export const E = ({ children }) => <span className="e" aria-hidden="true">{children}</span>;

/** Light/dark: follows the device until the user taps 🌗 (choice remembered on this device). */
export function useTheme() {
  const read = () => { try { return localStorage.getItem("oh-theme"); } catch { return null; } };
  const [theme, setTheme] = useState(read);
  useEffect(() => {
    if (theme) document.documentElement.setAttribute("data-theme", theme); else document.documentElement.removeAttribute("data-theme");
    try { theme ? localStorage.setItem("oh-theme", theme) : localStorage.removeItem("oh-theme"); } catch { /* private mode */ }
  }, [theme]);
  const isDark = () => theme ? theme === "dark" : window.matchMedia?.("(prefers-color-scheme: dark)").matches;
  return { toggle: () => setTheme(isDark() ? "light" : "dark") };
}

/** "Install app" — Android/desktop Chrome gives a prompt event; iPhone needs Share → Add to Home Screen. */
export function useInstall() {
  const [evt, setEvt] = useState(null);
  const standalone = typeof window !== "undefined" && (window.matchMedia?.("(display-mode: standalone)").matches || window.navigator.standalone);
  const ios = typeof navigator !== "undefined" && /iphone|ipad|ipod/i.test(navigator.userAgent);
  useEffect(() => {
    const h = (e) => { e.preventDefault(); setEvt(e); };
    window.addEventListener("beforeinstallprompt", h);
    return () => window.removeEventListener("beforeinstallprompt", h);
  }, []);
  return {
    can: !standalone && (Boolean(evt) || ios), ios,
    install: async () => { if (evt) { evt.prompt(); await evt.userChoice.catch(() => {}); setEvt(null); } },
  };
}
