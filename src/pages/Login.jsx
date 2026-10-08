import { useState } from "react";
import { signIn, signUp } from "../lib/data";

export default function Login() {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setError(null); setInfo(null);
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) return setError("Enter a valid email address.");
    if (password.length < 6) return setError("Password must be at least 6 characters.");
    setBusy(true);
    try {
      if (mode === "login") await signIn(email, password);
      else {
        const res = await signUp(email, password);
        if (!res?.session) setInfo("Account created. Check your email for a confirmation link, then log in.");
      }
    } catch (err) { setError(err.message); }
    setBusy(false);
  };

  return (
    <div className="auth">
      <form className="auth-box panel stack" onSubmit={submit} noValidate>
        <div>
          <div className="brand-lg"><span className="e">🎯</span> OpportunityHub</div>
          <p className="tagline">🏦 Bank, 🏛️ government, 🏫 teaching and 💼 company openings — and your applications — in one place.</p>
        </div>
        <div className="chips" role="tablist">
          <button type="button" className={`chip ${mode === "login" ? "on" : ""}`} onClick={() => setMode("login")}>🔑 Log in</button>
          <button type="button" className={`chip ${mode === "signup" ? "on" : ""}`} onClick={() => setMode("signup")}>✨ Create account</button>
        </div>
        <label className="field">Email<input id="login-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
        <label className="field">Password
          <input id="login-password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} value={password} onChange={(e) => setPassword(e.target.value)} />
          {mode === "signup" && <span className="hint">At least 6 characters.</span>}
        </label>
        {error && <div className="error">{error}</div>}
        {info && <div className="notice info">{info}</div>}
        <button className="btn primary full" disabled={busy}>{busy ? "Please wait…" : mode === "login" ? "Log in" : "Create account"}</button>
        <p className="tiny muted">🔒 Your data is private: only you and the site admin can see it.</p>
      </form>
    </div>
  );
}
