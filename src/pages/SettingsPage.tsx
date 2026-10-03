import { useEffect, useState, type FormEvent } from "react";
import { ErrorState, PageHeader, Spinner } from "../components/ui/Feedback";
import { useAuthedApi } from "../hooks/useAuthedApi";
import { useToast } from "../hooks/useToast";
import type { GymSettings } from "../types";

const empty: GymSettings = {
  gymName: "",
  gymAddress: "",
  gymMobile: "",
  gymEmail: "",
  currency: "INR",
  receiptFooter: "",
  timezone: "Asia/Kolkata",
};

export function SettingsPage() {
  const { call } = useAuthedApi();
  const { push } = useToast();
  const [form, setForm] = useState<GymSettings>(empty);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [pw, setPw] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [savingPw, setSavingPw] = useState(false);

  useEffect(() => {
    call((api, token) => api.getSettings(token)).then((result) => {
      setLoading(false);
      if (!result.ok) setError(result.error);
      else setForm(result.data);
    });
  }, [call]);

  async function save(e: FormEvent) {
    e.preventDefault();
    const result = await call((api, token) => api.updateSettings(token, form));
    if (!result.ok) {
      push(result.error, "error");
      return;
    }
    setForm(result.data);
    push("Settings saved", "success");
  }

  async function changePassword(e: FormEvent) {
    e.preventDefault();
    if (pw.newPassword.length < 8) {
      push("New password must be at least 8 characters.", "error");
      return;
    }
    if (pw.newPassword !== pw.confirmPassword) {
      push("New password and confirm password do not match.", "error");
      return;
    }
    setSavingPw(true);
    const result = await call((api, token) => api.changePassword(token, pw.currentPassword, pw.newPassword));
    setSavingPw(false);
    if (!result.ok) {
      push(result.error, "error");
      return;
    }
    setPw({ currentPassword: "", newPassword: "", confirmPassword: "" });
    push("Password changed. Use it next time you log in.", "success");
  }

  if (loading) return <Spinner />;
  if (error) return <ErrorState message={error} />;

  return (
    <div className="max-w-xl">
      <PageHeader title="Settings" subtitle="Shown on receipts. Currency default INR, timezone Asia/Kolkata." />
      <form onSubmit={save} className="card space-y-3">
        <input className="input" placeholder="Gym name" value={form.gymName} onChange={(e) => setForm({ ...form, gymName: e.target.value })} />
        <textarea className="input" placeholder="Address" value={form.gymAddress} onChange={(e) => setForm({ ...form, gymAddress: e.target.value })} />
        <input className="input" placeholder="Mobile" value={form.gymMobile} onChange={(e) => setForm({ ...form, gymMobile: e.target.value })} />
        <input className="input" placeholder="Email" value={form.gymEmail} onChange={(e) => setForm({ ...form, gymEmail: e.target.value })} />
        <input className="input" placeholder="Currency" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} />
        <input className="input" placeholder="Timezone" value={form.timezone} onChange={(e) => setForm({ ...form, timezone: e.target.value })} />
        <textarea className="input" placeholder="Receipt footer" value={form.receiptFooter} onChange={(e) => setForm({ ...form, receiptFooter: e.target.value })} />
        <button className="btn-primary" type="submit">Save settings</button>
      </form>
      <form onSubmit={changePassword} className="card mt-6 space-y-3">
        <h2 className="font-semibold">Change password</h2>
        <p className="text-xs text-slate-500">Current password, then a new password (minimum 8 characters). Nothing is stored in the website source.</p>
        <input
          className="input"
          type="password"
          autoComplete="current-password"
          placeholder="Current password"
          value={pw.currentPassword}
          onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })}
          required
        />
        <input
          className="input"
          type="password"
          autoComplete="new-password"
          placeholder="New password"
          value={pw.newPassword}
          onChange={(e) => setPw({ ...pw, newPassword: e.target.value })}
          required
        />
        <input
          className="input"
          type="password"
          autoComplete="new-password"
          placeholder="Confirm new password"
          value={pw.confirmPassword}
          onChange={(e) => setPw({ ...pw, confirmPassword: e.target.value })}
          required
        />
        <button className="btn-primary" disabled={savingPw} type="submit">
          {savingPw ? "Updating..." : "Update password"}
        </button>
      </form>
    </div>
  );
}
