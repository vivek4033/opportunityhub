import { useCallback, useEffect, useRef, useState } from "react";
import { Navigate, NavLink, Route, Routes } from "react-router-dom";
import * as data from "./lib/data";
import Admin from "./pages/Admin";
import Applications from "./pages/Applications";
import Login from "./pages/Login";
import Employers from "./pages/Employers";
import Mocks from "./pages/Mocks";
import Openings from "./pages/Openings";
import Profile from "./pages/Profile";
import { ProfileMenu, ProfilePanel } from "./pages/Account";
import Upcoming from "./pages/Upcoming";
import { AppContext, E, Loading, Modal, TAB_EMOJI as T, useInstall } from "./ui";

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
  const [panel, setPanel] = useState(null); // null = closed, else "roles" | "details" | "settings"
  const closePanel = useCallback(() => setPanel(null), []);
  const openPanel = useCallback((tab) => setPanel(typeof tab === "string" ? tab : "roles"), []);
  const inst = useInstall();

  const toastTimer = useRef(null);
  const notify = useCallback((message, kind = "ok", action = null) => {
    setToast({ message, kind, action });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), action ? 6000 : 3200);
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

  const ctx = { session, uid, email: session.user.email, profile, setProfile, admin, openings, notify, openProfile: openPanel,
    install: { can: inst.can, run: () => (inst.ios ? setIosHelp(true) : inst.install()) } };
  const needsProfile = !profile || !profile.full_name;

  return (
    <AppContext.Provider value={ctx}>
      <header className="top">
        <div className="top-inner">
          <span className="brand"><span className="e">🎯</span><span>OpportunityHub<small>Jobs, exams & your applications</small></span></span>
          <div className="who">
            {inst.can && <button className="icon-btn" onClick={() => (inst.ios ? setIosHelp(true) : inst.install())}><E>📲</E><span className="lbl">Install app</span></button>}
            {needsProfile ? <button className="icon-btn" onClick={() => data.signOut()}><E>👋</E><span className="lbl">Log out</span></button>
              : <ProfileMenu onOpen={openPanel} />}
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
            <Route path="/employers" element={<Employers />} />
            <Route path="/sources" element={<Employers />} />
            <Route path="/mocks" element={<Mocks />} />
            <Route path="/profile" element={<OpenProfile onOpen={openPanel} />} />
            <Route path="/admin" element={admin ? <Admin /> : <Navigate to="/openings" replace />} />
            <Route path="*" element={<Navigate to={admin ? "/admin" : "/openings"} replace />} />
          </Routes>
        )}
      </main>
      {panel && !needsProfile && <ProfilePanel tab={panel} setTab={setPanel} onClose={closePanel} />}
      {iosHelp && (
        <Modal title="📲 Install on iPhone" onClose={() => setIosHelp(false)}>
          <p>In Safari, tap the <strong>Share</strong> button (square with an arrow), then <strong>Add to Home Screen</strong>. OpportunityHub then opens like an app.</p>
        </Modal>
      )}
      {toast && (
        <div className={`toast ${toast.kind === "error" ? "error" : ""}`} role="status">
          {toast.message}
          {toast.action && <button className="toast-act" onClick={() => { toast.action.fn(); setToast(null); }}>{toast.action.label}</button>}
        </div>
      )}
    </AppContext.Provider>
  );
}
