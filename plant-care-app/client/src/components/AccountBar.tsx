import { useState } from "react";
import type { User } from "../auth";
import { login, logout, register } from "../auth";

export function AccountBar({
  user,
  onAuthChanged,
}: {
  user: User | null;
  onAuthChanged: (user: User | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const u = mode === "login" ? await login(email, password) : await register(email, password);
      onAuthChanged(u);
      setOpen(false);
      setEmail("");
      setPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  async function handleLogout() {
    await logout();
    onAuthChanged(null);
  }

  if (user) {
    return (
      <div className="account-bar">
        <span className="acct-email" title={user.email}>
          👤 {user.email}
        </span>
        <button className="btn ghost sm" onClick={handleLogout}>
          Sign out
        </button>
      </div>
    );
  }

  return (
    <div className="account-bar">
      {!open ? (
        <>
          <span className="acct-hint">Sign in to sync &amp; get reminders on any device</span>
          <button className="btn ghost sm" onClick={() => setOpen(true)}>
            Sign in
          </button>
        </>
      ) : (
        <form className="auth-form" onSubmit={submit}>
          <div className="auth-tabs">
            <button
              type="button"
              className={mode === "login" ? "active" : ""}
              onClick={() => setMode("login")}
            >
              Sign in
            </button>
            <button
              type="button"
              className={mode === "register" ? "active" : ""}
              onClick={() => setMode("register")}
            >
              Create account
            </button>
          </div>
          <input
            type="email"
            placeholder="you@example.com"
            value={email}
            autoComplete="email"
            required
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            type="password"
            placeholder={mode === "register" ? "Password (min 8 chars)" : "Password"}
            value={password}
            autoComplete={mode === "register" ? "new-password" : "current-password"}
            required
            minLength={8}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error && <p className="auth-error">{error}</p>}
          <div className="auth-actions">
            <button type="submit" className="btn primary sm" disabled={busy}>
              {busy ? "…" : mode === "login" ? "Sign in" : "Create account"}
            </button>
            <button
              type="button"
              className="btn ghost sm"
              onClick={() => {
                setOpen(false);
                setError(null);
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
