import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import * as data from "../lib/data";
import { E, initials, ROLE, useApp } from "../ui";
import Profile from "./Profile";

export const TABS = [
  { key: "roles", e: "🎯", label: "My roles" },
  { key: "details", e: "👤", label: "My profile" },
  { key: "settings", e: "⚙️", label: "Settings" },
];

const VIEW_KEY = "oh_default_view";
export const defaultView = () => { try { return localStorage.getItem(VIEW_KEY) || ""; } catch { return ""; } };

/** Header button: name + avatar. Opens a small menu; each item opens the panel on that page. */
export function ProfileMenu({ onOpen }) {
  const { profile, email } = useApp();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const away = (e) => !ref.current?.contains(e.target) && setOpen(false);
    const esc = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", away);
    window.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", away); window.removeEventListener("keydown", esc); };
  }, [open]);
  const go = (tab) => { setOpen(false); onOpen(tab); };
  const roles = profile?.target_roles || [];
  return (
    <div className="me-wrap" ref={ref}>
      <button className={`me ${open ? "on" : ""}`} onClick={() => setOpen(!open)} aria-haspopup="menu" aria-expanded={open} aria-label="Your account">
        <span className="me-text"><strong>{(profile?.full_name || "").split(" ")[0]}</strong><small>{roles.map((r) => ROLE[r]?.e).join(" ") || "Set your roles"}</small></span>
        <span className="avatar" aria-hidden="true">{initials(profile?.full_name, email)}</span>
      </button>
      {open && (
        <div className="menu" role="menu">
          <div className="menu-who">
            <span className="avatar" aria-hidden="true">{initials(profile?.full_name, email)}</span>
            <div style={{ minWidth: 0 }}><strong>{profile?.full_name}</strong><div className="tiny muted" style={{ overflowWrap: "anywhere" }}>{email}</div></div>
          </div>
          {TABS.map((t) => (
            <button key={t.key} role="menuitem" className="menu-item" onClick={() => go(t.key)}><span className="e">{t.e}</span>{t.label}</button>
          ))}
          <div className="menu-sep" />
          <button role="menuitem" className="menu-item" onClick={() => data.signOut()}><span className="e">👋</span>Log out</button>
        </div>
      )}
    </div>
  );
}

function Settings({ onClose }) {
  const { email, profile, notify, install } = useApp();
  const nav = useNavigate();
  const [view, setView] = useState(defaultView());
  const [pw, setPw] = useState({ a: "", b: "" });
  const [pwErr, setPwErr] = useState(null);
  const [busy, setBusy] = useState(false);
  const hiddenCount = [...new Set([...(profile?.hidden_openings || []), ...data.localHidden(profile?.id)])].length;

  const saveView = (v) => {
    setView(v);
    try { localStorage.setItem(VIEW_KEY, v); } catch { /* private mode */ }
    notify("💾 Saved. Openings will open on this view.");
  };
  const changePw = async (e) => {
    e.preventDefault();
    setPwErr(null);
    if (pw.a.length < 6) return setPwErr("Use at least 6 characters.");
    if (pw.a !== pw.b) return setPwErr("The two passwords don't match.");
    setBusy(true);
    try { await data.changePassword(pw.a); setPw({ a: "", b: "" }); notify("🔐 Password changed"); }
    catch (err) { setPwErr(err.message); }
    setBusy(false);
  };

  return (
    <div className="stack">
      <section className="psec">
        <h3 className="sec-h"><E>🔎</E>When I open Openings, show</h3>
        <div className="seg" role="radiogroup" aria-label="Default view">
          {[["mine", "🎯 My roles"], ["fit", "✅ Eligible for me"], ["all", "🌍 Everything"]].map(([k, l]) => (
            <button key={k} role="radio" aria-checked={(view || "mine") === k} className={(view || "mine") === k ? "on" : ""} onClick={() => saveView(k)}>{l}</button>
          ))}
        </div>
        <p className="tiny muted" style={{ marginTop: 8 }}>Saved on this device.</p>
      </section>

      <section className="psec">
        <h3 className="sec-h"><E>🙈</E>Openings you're not interested in</h3>
        <div className="spread">
          <p className="small">{hiddenCount ? `${hiddenCount} hidden from your list.` : "Nothing hidden yet. Use “Not interested” on any opening to hide it."}</p>
          {hiddenCount > 0 && <button className="btn sm" onClick={() => { onClose(); nav("/openings?hidden=1"); }}>View them</button>}
        </div>
      </section>

      <section className="psec">
        <h3 className="sec-h"><E>🔐</E>Change password</h3>
        <form onSubmit={changePw} noValidate className="form-grid">
          <label className="field">New password<input id="s-pw1" type="password" autoComplete="new-password" value={pw.a} onChange={(e) => setPw({ ...pw, a: e.target.value })} /></label>
          <label className="field">Type it again<input id="s-pw2" type="password" autoComplete="new-password" value={pw.b} onChange={(e) => setPw({ ...pw, b: e.target.value })} /></label>
          {pwErr && <div className="error wide">{pwErr}</div>}
          <div className="wide"><button className="btn" disabled={busy}>{busy ? "Changing…" : "Change password"}</button></div>
        </form>
      </section>

      <section className="psec">
        <h3 className="sec-h"><E>📧</E>Account</h3>
        <p className="small">Signed in as <strong style={{ overflowWrap: "anywhere" }}>{email}</strong></p>
        {install?.can && <button className="btn sm mt" style={{ marginTop: 10 }} onClick={install.run}>📲 Install the app on this device</button>}
      </section>
    </div>
  );
}

/** Account panel: slides in from the right with three pages. */
export function ProfilePanel({ tab, setTab, onClose }) {
  const { profile, email } = useApp();
  const ref = useRef(null);
  useEffect(() => {
    const k = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    document.body.style.overflow = "hidden";
    ref.current?.focus();
    return () => { window.removeEventListener("keydown", k); document.body.style.overflow = ""; };
  }, [onClose]);
  const roles = profile?.target_roles || [];
  return (
    <div className="drawer-back" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <aside className="drawer" role="dialog" aria-modal="true" aria-label="Your account" tabIndex={-1} ref={ref}>
        <div className="drawer-head">
          <div className="avatar lg" aria-hidden="true">{initials(profile?.full_name, email)}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2>{profile?.full_name || "Your profile"}</h2>
            <p className="small muted" style={{ overflowWrap: "anywhere" }}>{email}{profile?.phone ? `, ${profile.phone}` : ""}</p>
            {roles.length > 0 && <div className="row" style={{ gap: 6, marginTop: 8 }}>{roles.map((r) => ROLE[r] && <span key={r} className="badge accent">{ROLE[r].e} {ROLE[r].label}</span>)}</div>}
          </div>
          <button className="btn ghost" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <nav className="ptabs" role="tablist" aria-label="Account pages">
          {TABS.map((t) => (
            <button key={t.key} role="tab" aria-selected={tab === t.key} className={tab === t.key ? "on" : ""} onClick={() => setTab(t.key)}><span className="e">{t.e}</span>{t.label}</button>
          ))}
        </nav>
        <div className="drawer-body">
          {/* Profile stays mounted while switching between Roles and Profile, so unsaved edits are kept. */}
          <div hidden={tab === "settings"}><Profile inPanel section={tab === "settings" ? "details" : tab} onSaved={onClose} /></div>
          {tab === "settings" && <Settings onClose={onClose} />}
        </div>
        <div className="drawer-out">
          <button className="btn full" onClick={() => data.signOut()}>👋 Log out</button>
        </div>
      </aside>
    </div>
  );
}
