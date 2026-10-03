import { useEffect, useState, type FormEvent } from "react";
import { getGymApi } from "../services/gymApi";
import type { MembershipPlan } from "../types";

export function PublicEnquirePage() {
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ fullName: "", mobile: "", email: "", planId: "", message: "" });

  useEffect(() => {
    getGymApi().then((api) => {
      api.getPlans().then((result) => {
        if (result.ok) setPlans(result.data.filter((p) => p.status === "ACTIVE"));
      });
    });
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    const api = await getGymApi();
    const result = await api.submitEnquiry(form);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <main className="mx-auto max-w-lg px-4 py-16">
        <h1 className="text-3xl font-bold">Enquiry sent</h1>
        <p className="mt-3 text-white/70">Our team will contact you on the mobile number you shared.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-lg px-4 py-12">
      <h1 className="text-3xl font-bold">Join enquiry</h1>
      <p className="mt-2 text-sm text-white/70">No Google password is used on this page. Data is posted to Apps Script.</p>
      {error ? <p className="mt-4 rounded-lg bg-red-500/20 p-3 text-sm">{error}</p> : null}
      <form onSubmit={onSubmit} className="mt-6 space-y-3 text-slate-900">
        <input className="input" placeholder="Full name" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required />
        <input className="input" placeholder="Mobile" value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} required />
        <input className="input" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <select className="input" value={form.planId} onChange={(e) => setForm({ ...form, planId: e.target.value })}>
          <option value="">Any plan</option>
          {plans.map((p) => (
            <option key={p.planId} value={p.planId}>{p.planName}</option>
          ))}
        </select>
        <textarea className="input" placeholder="Message" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
        <button className="btn-primary w-full" type="submit">Submit enquiry</button>
      </form>
    </main>
  );
}
