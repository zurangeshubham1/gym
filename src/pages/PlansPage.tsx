import { useEffect, useState, type FormEvent } from "react";
import { ErrorState, Modal, PageHeader, Spinner } from "../components/ui/Feedback";
import { useAuthedApi } from "../hooks/useAuthedApi";
import { useToast } from "../hooks/useToast";
import type { MembershipPlan } from "../types";
import { formatMoney } from "../utils/format";

export function PlansPage() {
  const { call } = useAuthedApi();
  const { push } = useToast();
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ planId: "", planName: "", durationDays: "30", price: "", description: "", status: "ACTIVE" });

  function reload() {
    call((api, token) => api.getPlans(token)).then((result) => {
      setLoading(false);
      if (!result.ok) setError(result.error);
      else setPlans(result.data);
    });
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [call]);

  async function save(e: FormEvent) {
    e.preventDefault();
    const payload = {
      planName: form.planName,
      durationDays: Number(form.durationDays),
      price: Number(form.price),
      description: form.description,
      status: form.status as "ACTIVE" | "INACTIVE",
    };
    const result = form.planId
      ? await call((api, token) => api.updatePlan(token, { ...payload, planId: form.planId }))
      : await call((api, token) => api.createPlan(token, payload));
    if (!result.ok) {
      push(result.error, "error");
      return;
    }
    setOpen(false);
    push("Plan saved", "success");
    reload();
  }

  if (loading) return <Spinner />;
  if (error) return <ErrorState message={error} />;

  return (
    <div>
      <PageHeader
        title="Membership plans"
        actions={
          <button className="btn-primary" type="button" onClick={() => {
            setForm({ planId: "", planName: "", durationDays: "30", price: "", description: "", status: "ACTIVE" });
            setOpen(true);
          }}>
            New plan
          </button>
        }
      />
      <div className="grid gap-3 md:grid-cols-2">
        {plans.map((p) => (
          <button
            key={p.planId}
            className="card text-left"
            type="button"
            onClick={() => {
              setForm({
                planId: p.planId,
                planName: p.planName,
                durationDays: String(p.durationDays),
                price: String(p.price),
                description: p.description,
                status: p.status,
              });
              setOpen(true);
            }}
          >
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">{p.planName}</h2>
              <span className="text-sm text-slate-500">{p.status}</span>
            </div>
            <p className="mt-2 text-2xl font-bold">{formatMoney(p.price)}</p>
            <p className="text-sm text-slate-500">{p.durationDays} days · {p.description}</p>
          </button>
        ))}
      </div>
      <Modal open={open} title={form.planId ? "Edit plan" : "New plan"} onClose={() => setOpen(false)}>
        <form onSubmit={save} className="space-y-3">
          <input className="input" placeholder="Plan name" value={form.planName} onChange={(e) => setForm({ ...form, planName: e.target.value })} required />
          <input className="input" type="number" placeholder="Duration days" value={form.durationDays} onChange={(e) => setForm({ ...form, durationDays: e.target.value })} required />
          <input className="input" type="number" placeholder="Price" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required />
          <textarea className="input" placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            <option>ACTIVE</option>
            <option>INACTIVE</option>
          </select>
          <button className="btn-primary" type="submit">Save</button>
        </form>
      </Modal>
    </div>
  );
}
