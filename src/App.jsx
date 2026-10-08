import { useCallback, useEffect, useRef, useState } from "react";
import { Navigate, NavLink, Route, Routes } from "react-router-dom";
import * as data from "./lib/data";
import Admin from "./pages/Admin";
import Applications from "./pages/Applications";
import Login from "./pages/Login";
import Mocks from "./pages/Mocks";
import Openings from "./pages/Openings";
import Profile from "./pages/Profile";
import Upcoming from "./pages/Upcoming";
import { AppContext, E, initials, Loading, Modal, ROLE, TAB_EMOJI as T, useApp, useInstall } from "./ui";

/** Profile panel: slides in from the right over the current page. */
function ProfilePanel({ onClose }) {
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
      <aside className="drawer" role="dialog" aria-modal="true" aria-label="Your profile" tabIndex={-1} ref={ref}>
        <div className="drawer-head">
          <div className="avatar lg" aria-hidden="true">{initials(profile?.full_name, email)}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2>{profile?.full_name || "Your profile"}</h2>
            <p className="small muted" style={{ overflowWrap: "anywhere" }}>{email}{profile?.phone ? ` · ${profile.phone}` : ""}</p>
            {roles.length > 0 && <div className="row" style={{ gap: 6, marginTop: 8 }}>{roles.map((r) => ROLE[r] && <span key={r} className="badge accent">{ROLE[r].e} {ROLE[r].label}</span>)}</div>}
          </div>
          <button className="btn ghost" onClick={onClose} aria-label="Close profile">✕</button>
        </div>
        <div className="drawer-body">
          <Profile inPanel onSaved={onClose} />
        </div>
        <div className="drawer-out">
          <button className="btn full" onClick={() => data.signOut()}>👋 Log out</button>
        </div>
      </aside>
    </div>
  );
}

/** Old /profile links: open the panel over Openings. */
function OpenProfile({ onOpen }) {
  useEffect(() => { onOpen(); }, [onOpen]);
  return <Navigate to="/openings" replace />;
}

function SetupNeeded() {
  return (
    <div className="auth"><div className="auth-box panel">
      <div className="brand-lg"><span className="e">🎯</span> OpportunityHub</div>
      <p className="tagline">This site isn't connected to its database yet.</p>
      <p className="small">Add <strong>VITE_SUPABASE_URL</strong> and <strong>VITE_SUPABASE_ANON_KEY</strong> in Vercel → Project → Settings → Environment Variables, then redeploy. See SETUP.md in the repository.</p>
    </div></div>
  );
}

export default function App() {
  const [session, setSession] = useState(undefined); // undefined = still checking
  const [profile, setProfile] = useState(undefined);
  const [admin, setAdmin] = useState(false);
  const [openings, setOpenings] = useState({ items: [], updatedAt: null, loading: true, error: null });
  const [toast, setToast] = useState(null);
  const [iosHelp, setIosHelp] = useState(false);
  const [panel, setPanel] = useState(false);
  const closePanel = useCallback(() => setPanel(false), []);
  const openPanel = useCallback(() => setPanel(true), []);
  const inst = useInstall();

  const notify = useCallback((message, kind = "ok") => {
    setToast({ message, kind });
    setTimeout(() => setToast(null), 3200);
  }, []);

  useEffect(() => {
    if (!data.configured) return;
    data.getSession().then(setSession).catch(() => setSession(null));
    const sub = data.onAuth((s) => setSession(s));
    return () => sub?.unsubscribe?.();
  }, []);

  const uid = session?.user?.id;
  useEffect(() => {
    if (!uid) { setProfile(undefined); setAdmin(false); return; }
    let live = true;
    data.getProfile(uid).then((p) => { if (live) setProfile(p); if (p) data.touchLastSeen(uid); }).catch(() => live && setProfile(null));
    data.isAdmin().then((a) => live && setAdmin(a)).catch(() => {});
    data.loadOpenings().then((o) => live && setOpenings({ ...o, loading: false, error: null }))
      .catch((e) => live && setOpenings({ items: [], updatedAt: null, loading: false, error: e.message }));
    return () => { live = false; };
  }, [uid]);

  if (!data.configured) return <SetupNeeded />;
  if (session === undefined) return <Loading text="Opening OpportunityHub…" />;
  if (!session) return <Login />;
  if (profile === undefined) return <Loading text="Loading your profile…" />;

  const ctx = { session, uid, email: session.user.email, profile, setProfile, admin, openings, notify, openProfile: openPanel };
  const needsProfile = !profile || !profile.full_name;

  return (
    <AppContext.Provider value={ctx}>
      <header className="top">
        <div className="top-inner">
          <span className="brand"><span className="e">🎯</span><span>OpportunityHub<small>Jobs, exams & your applications</small></span></span>
          <div className="who">
            {inst.can && <button className="icon-btn" onClick={() => (inst.ios ? setIosHelp(true) : inst.install())}><E>📲</E><span className="lbl">Install app</span></button>}
            {needsProfile ? <button className="icon-btn" onClick={() => data.signOut()}><E>👋</E><span className="lbl">Log out</span></button> : (
              <button className="me" onClick={openPanel} aria-label="Open your profile" aria-haspopup="dialog">
                <span className="me-text"><strong>{(profile.full_name || "").split(" ")[0]}</strong><small>{(profile.target_roles || []).map((r) => ROLE[r]?.e).join(" ") || "Set your roles"}</small></span>
                <span className="avatar" aria-hidden="true">{initials(profile.full_name, session.user.email)}</span>
              </button>
            )}
          </div>
          {!needsProfile && (
            <nav className="tabs" aria-label="Main">
              <NavLink to="/openings"><E>{T.openings}</E>Openings</NavLink>
              <NavLink to="/applications"><E>{T.applications}</E>Applications</NavLink>
              <NavLink to="/upcoming"><E>{T.upcoming}</E>Upcoming</NavLink>
              <NavLink to="/mocks"><E>{T.mocks}</E>Mocks</NavLink>
              {admin && <NavLink to="/admin"><E>{T.admin}</E>Admin</NavLink>}
            </nav>
          )}
        </div>
      </header>
      <main className="main">
        {needsProfile ? <Profile firstTime /> : (
          <Routes>
            <Route path="/openings" element={<Openings />} />
            <Route path="/applications" element={<Applications />} />
            <Route path="/upcoming" element={<Upcoming />} />
            <Route path="/mocks" element={<Mocks />} />
            <Route path="/profile" element={<OpenProfile onOpen={openPanel} />} />
            <Route path="/admin" element={admin ? <Admin /> : <Navigate to="/openings" replace />} />
            <Route path="*" element={<Navigate to={admin ? "/admin" : "/openings"} replace />} />
          </Routes>
        )}
      </main>
      {panel && !needsProfile && <ProfilePanel onClose={closePanel} />}
      {iosHelp && (
        <Modal title="📲 Install on iPhone" onClose={() => setIosHelp(false)}>
          <p>In Safari, tap the <strong>Share</strong> button (square with an arrow), then <strong>Add to Home Screen</strong>. OpportunityHub then opens like an app.</p>
        </Modal>
      )}
      {toast && <div className={`toast ${toast.kind === "error" ? "error" : ""}`} role="status">{toast.message}</div>}
    </AppContext.Provider>
  );
}
