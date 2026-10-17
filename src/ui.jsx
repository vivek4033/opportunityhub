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
export const TRACK_EMOJI = { it: "💻", psu: "🏭", banking: "🏦", government: "🏛️", insurance: "☂️", physics_research: "🔬", schools: "🏫", colleges: "🎓", apprenticeship: "🛠️", corporate: "💼" };
export const STATUS_EMOJI = { to_apply: "📝", applied: "📨", exam: "✍️", interview: "🎤", selected: "🎉", rejected: "🙁" };
export const ELIG_EMOJI = { CURRENTLY_ELIGIBLE: "✅", POTENTIALLY_ELIGIBLE: "🤔", ELIGIBLE_AFTER_BED: "⏳", ELIGIBLE_AFTER_TET: "📘", NOT_ELIGIBLE: "❌" };
export const E = ({ children }) => <span className="e" aria-hidden="true">{children}</span>;

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

// ---------------------------------------------------------------- role types people look for (map onto opening categories)
export const ROLE_TYPES = [
  { key: "banking", e: "🏦", label: "Banking", hint: "PO, clerk, bank officer" },
  { key: "government", e: "🏛️", label: "Government jobs & exams", hint: "SSC, railways, TNPSC" },
  { key: "it", e: "💻", label: "IT & software", hint: "Fresher developer, testing, support, analyst" },
  { key: "psu", e: "🏭", label: "PSU jobs", hint: "NLC, BEL, ONGC, NTPC — trainees, apprentices, engineers" },
  { key: "clerical", e: "🗂️", label: "Clerk & office assistant", hint: "Court clerk, LDC/JSA, typist, steno, junior assistant" },
  { key: "schools", e: "👩‍🏫", label: "Teaching", hint: "School teacher, PGT/TGT, CTET/TET" },
  { key: "physics_research", e: "🔬", label: "Research", hint: "NET, CSIR, GATE, project roles" },
  { key: "colleges", e: "🎓", label: "College & university staff", hint: "IIT/NIT project, lab, office roles" },
  { key: "insurance", e: "☂️", label: "Insurance", hint: "LIC, NIACL officer / assistant" },
  { key: "corporate", e: "💼", label: "Corporate / MNC", hint: "Operations, analyst, process roles" },
  { key: "apprenticeship", e: "🛠️", label: "Apprenticeship / internship", hint: "Paid training, work experience" },
];
export const ROLE = Object.fromEntries(ROLE_TYPES.map((r) => [r.key, r]));
/** Role type of an opening: its category, except teaching-eligibility exams (CTET, TNTET) count as Teaching. */
export const roleOf = (o) => (o.track === "physics_research" && o.subcategory === "teaching_exam" ? "schools" : o.track);
/** All role types an opening counts for: e.g. a Canara Bank apprenticeship is both Apprenticeship and Banking. */
// Clerical posts: the scan sets post_type "clerical"; titles are a fallback for older entries.
const CLERICAL = /\b(clerks?|clerical|typists?|steno(grapher)?s?|steno-typist|copyist|lower division|upper division|ldc|udc|junior (court |secretariat |judicial )?assistants?|court assistants?|office assistants?|social security assistant|data entry|deo|record clerk|bench clerk|junior associates?|chsl|group[ -]?(iv|4)|second division assistant|sda)\b/i;
const NOT_CLERICAL = /assistant (professor|engineer|manager|director|registrar|editor|librarian|commandant)|research assistant|lab(oratory)? assistant|teaching assistant/i;
export const isClerical = (o) => o.post_type === "clerical" || (Array.isArray(o.post_types) && o.post_types.includes("clerical"))
  || (CLERICAL.test(o.title || "") && !NOT_CLERICAL.test(o.title || ""));
export const rolesOf = (o) => {
  const out = [roleOf(o)];
  const sub = o.subcategory || "";
  if (isClerical(o)) out.push("clerical");
  if (/bank/.test(sub)) out.push("banking");
  if (sub === "public_insurer") out.push("insurance");
  return [...new Set(out)].filter((r) => ROLE[r]);
};

export function RolePicker({ value, onChange }) {
  const toggle = (k) => onChange(value.includes(k) ? value.filter((x) => x !== k) : [...value, k]);
  return (
    <div className="roles" role="group" aria-label="Roles I'm looking for">
      {ROLE_TYPES.map((r) => {
        const on = value.includes(r.key);
        return (
          <button type="button" key={r.key} className={`role ${on ? "on" : ""}`} aria-pressed={on} onClick={() => toggle(r.key)}>
            <span className="e">{r.e}</span><span><strong>{r.label}</strong><small>{r.hint}</small></span>{on && <span className="tick">✓</span>}
          </button>
        );
      })}
    </div>
  );
}

export const initials = (name, email) => {
  const s = String(name || "").trim();
  if (s) return s.split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  return String(email || "?")[0].toUpperCase();
};

// ---------------------------------------------------------------- pickers used in the profile form
/** Tap-to-pick chips (multi-select) with an optional "add your own". Value is an array of strings. */
export function ChipMulti({ id, options, value, onChange, otherLabel = "Add another", label }) {
  const [adding, setAdding] = useState("");
  const all = [...options, ...value.filter((v) => !options.includes(v))];
  const toggle = (o) => onChange(value.includes(o) ? value.filter((x) => x !== o) : [...value, o]);
  const add = () => { const v = adding.trim(); if (v && !value.includes(v)) onChange([...value, v]); setAdding(""); };
  return (
    <div className="chipmulti" role="group" aria-label={label} id={id}>
      {all.map((o) => (
        <button type="button" key={o} className={`pick ${value.includes(o) ? "on" : ""}`} aria-pressed={value.includes(o)} onClick={() => toggle(o)}>
          {value.includes(o) ? "✓ " : ""}{o}
        </button>
      ))}
      {otherLabel && (
        <span className="pick-add">
          <input value={adding} onChange={(e) => setAdding(e.target.value)} placeholder={`➕ ${otherLabel}`} aria-label={otherLabel}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }} onBlur={add} />
        </span>
      )}
    </div>
  );
}

/** A dropdown that also lets you type a value that isn't in the list ("Other…"). */
export function SelectOrOther({ value, onChange, options, placeholder = "Choose", ariaLabel, otherPlaceholder = "Type it" }) {
  const known = !value || options.includes(value);
  const [typing, setTyping] = useState(!known);
  return (
    <div className="sel-other">
      <select aria-label={ariaLabel} value={typing ? "__other" : value || ""} onChange={(e) => {
        if (e.target.value === "__other") { setTyping(true); onChange(""); } else { setTyping(false); onChange(e.target.value); }
      }}>
        <option value="">{placeholder}</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
        <option value="__other">Other…</option>
      </select>
      {typing && <input value={value || ""} onChange={(e) => onChange(e.target.value)} placeholder={otherPlaceholder} aria-label={`${ariaLabel} (other)`} autoFocus />}
    </div>
  );
}
