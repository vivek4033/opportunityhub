import { useCallback, useEffect, useState } from "react";
import { Navigate, NavLink, Route, Routes } from "react-router-dom";
import * as data from "./lib/data";
import Admin from "./pages/Admin";
import Applications from "./pages/Applications";
import Login from "./pages/Login";
import Mocks from "./pages/Mocks";
import Openings from "./pages/Openings";
import Profile from "./pages/Profile";
import Upcoming from "./pages/Upcoming";
import { AppContext, Loading } from "./ui";

function SetupNeeded() {
  return (
    <div className="auth"><div className="auth-box panel">
      <div className="brand-lg">OpportunityHub</div>
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

  const ctx = { session, uid, email: session.user.email, profile, setProfile, admin, openings, notify };
  const needsProfile = !profile || !profile.full_name;

  return (
    <AppContext.Provider value={ctx}>
      <header className="top">
        <div className="top-inner">
          <span className="brand">OpportunityHub</span>
          {!needsProfile && (
            <nav className="tabs" aria-label="Main">
              <NavLink to="/openings">Openings</NavLink>
              <NavLink to="/applications">My applications</NavLink>
              <NavLink to="/upcoming">Upcoming</NavLink>
              <NavLink to="/mocks">Mock scores</NavLink>
              <NavLink to="/profile">Profile</NavLink>
              {admin && <NavLink to="/admin" className="admin">Admin</NavLink>}
            </nav>
          )}
          <div className="who"><span className="email">{session.user.email}</span><button onClick={() => data.signOut()}>Log out</button></div>
        </div>
      </header>
      <main className="main">
        {needsProfile ? <Profile firstTime /> : (
          <Routes>
            <Route path="/openings" element={<Openings />} />
            <Route path="/applications" element={<Applications />} />
            <Route path="/upcoming" element={<Upcoming />} />
            <Route path="/mocks" element={<Mocks />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/admin" element={admin ? <Admin /> : <Navigate to="/openings" replace />} />
            <Route path="*" element={<Navigate to={admin ? "/admin" : "/openings"} replace />} />
          </Routes>
        )}
      </main>
      {toast && <div className={`toast ${toast.kind === "error" ? "error" : ""}`} role="status">{toast.message}</div>}
    </AppContext.Provider>
  );
}
