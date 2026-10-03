import { useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Dumbbell } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { ErrorState, Spinner } from "../components/ui/Feedback";
import { isApiConfigured, IS_DEV } from "../config/env";

export function LoginPage() {
  const { login, token, loading } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!loading && token) return <Navigate to="/dashboard" replace />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    const message = await login(username, password, remember);
    setSubmitting(false);
    if (message) setError(message);
    else navigate("/dashboard");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gym-900 px-4">
      <form onSubmit={onSubmit} className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl">
        <div className="mb-6 flex items-center gap-2 text-gym-800">
          <Dumbbell className="h-6 w-6" />
          <h1 className="text-xl font-bold">Gym Admin Login</h1>
        </div>
        <p className="mb-6 text-sm text-slate-500">
          Credentials stay on the Apps Script server. This page never embeds Google Sheet passwords.
        </p>
        {error ? <div className="mb-4"><ErrorState message={error} /></div> : null}
        <label className="label" htmlFor="username">Username</label>
        <input id="username" className="input mb-4" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" required />
        <label className="label" htmlFor="password">Password</label>
        <input id="password" type="password" className="input mb-4" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
        <label className="mb-6 flex items-center gap-2 text-sm">
          <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
          Remember this browser
        </label>
        <button className="btn-primary w-full" disabled={submitting || loading} type="submit">
          {submitting ? "Signing in..." : "Sign in"}
        </button>
        {loading ? <div className="mt-4"><Spinner label="Preparing API..." /></div> : null}
        {!isApiConfigured() && IS_DEV ? (
          <p className="mt-4 text-xs text-slate-500">Local demo: username <b>admin</b> / password <b>Admin@123</b></p>
        ) : null}
      </form>
    </div>
  );
}
