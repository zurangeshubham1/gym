import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ErrorState, PageHeader, Spinner } from "../components/ui/Feedback";
import { PAYMENT_METHODS } from "../config/constants";
import { useAuthedApi } from "../hooks/useAuthedApi";
import { useToast } from "../hooks/useToast";
import type { MembershipPlan } from "../types";
import { addDaysIso, todayIso } from "../utils/dates";

export function MemberNewPage() {
  const { call, api, token } = useAuthedApi();
  const { push } = useToast();
  const navigate = useNavigate();
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    fullName: "",
    mobile: "",
    email: "",
    gender: "Male",
    dateOfBirth: "",
    address: "",
    joinDate: todayIso(),
    membershipPlanId: "",
    membershipStartDate: todayIso(),
    totalAmount: "",
    initialPayment: "0",
    paymentMethod: "CASH",
    transactionReference: "",
    notes: "",
  });

  useEffect(() => {
    if (!api) return;
    api.getPlans(token).then((result) => {
      setLoading(false);
      if (!result.ok) setError(result.error);
      else {
        const active = result.data.filter((p) => p.status === "ACTIVE");
        setPlans(active);
        if (active[0]) {
          setForm((f) => ({
            ...f,
            membershipPlanId: active[0].planId,
            totalAmount: String(active[0].price),
          }));
        }
      }
    });
  }, [api, token]);

  const selected = plans.find((p) => p.planId === form.membershipPlanId);
  const endDate = useMemo(() => {
    if (!selected) return "";
    return addDaysIso(form.membershipStartDate || form.joinDate, selected.durationDays);
  }, [selected, form.membershipStartDate, form.joinDate]);

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const result = await call((a, t) =>
      a.createMember(t, {
        ...form,
        totalAmount: form.totalAmount ? Number(form.totalAmount) : undefined,
        initialPayment: Number(form.initialPayment || 0),
        paymentMethod: form.paymentMethod as "CASH" | "UPI" | "CARD" | "BANK_TRANSFER",
        membershipEndDate: endDate,
      }),
    );
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      push(result.error, "error");
      return;
    }
    push("Member registered", "success");
    navigate(`/members/${result.data.memberId}`);
  }

  if (loading) return <Spinner />;

  return (
    <div className="max-w-3xl">
      <PageHeader title="New member" subtitle="Initial payment is saved as PENDING until you mark Paid (Yes) and generate a receipt." />
      {error ? <div className="mb-4"><ErrorState message={error} /></div> : null}
      <form onSubmit={onSubmit} className="card grid gap-4 sm:grid-cols-2">
        <Field label="Full name" value={form.fullName} onChange={(v) => set("fullName", v)} required />
        <Field label="Mobile" value={form.mobile} onChange={(v) => set("mobile", v)} required />
        <Field label="Email" value={form.email} onChange={(v) => set("email", v)} />
        <div>
          <label className="label">Gender</label>
          <select className="input" value={form.gender} onChange={(e) => set("gender", e.target.value)}>
            <option>Male</option>
            <option>Female</option>
            <option>Other</option>
          </select>
        </div>
        <Field label="Date of birth" type="date" value={form.dateOfBirth} onChange={(v) => set("dateOfBirth", v)} />
        <Field label="Join date" type="date" value={form.joinDate} onChange={(v) => set("joinDate", v)} required />
        <div className="sm:col-span-2">
          <label className="label">Address</label>
          <textarea className="input" value={form.address} onChange={(e) => set("address", e.target.value)} />
        </div>
        <div>
          <label className="label">Membership plan</label>
          <select
            className="input"
            value={form.membershipPlanId}
            onChange={(e) => {
              const plan = plans.find((p) => p.planId === e.target.value);
              setForm((f) => ({
                ...f,
                membershipPlanId: e.target.value,
                totalAmount: plan ? String(plan.price) : f.totalAmount,
              }));
            }}
          >
            {plans.map((p) => (
              <option key={p.planId} value={p.planId}>
                {p.planName} — {p.durationDays} days
              </option>
            ))}
          </select>
        </div>
        <Field label="Membership start" type="date" value={form.membershipStartDate} onChange={(v) => set("membershipStartDate", v)} required />
        <div>
          <label className="label">Membership end (calculated)</label>
          <input className="input bg-slate-50" value={endDate} readOnly />
        </div>
        <Field label="Total amount" type="number" value={form.totalAmount} onChange={(v) => set("totalAmount", v)} />
        <Field label="Initial payment" type="number" value={form.initialPayment} onChange={(v) => set("initialPayment", v)} />
        <div>
          <label className="label">Payment method</label>
          <select className="input" value={form.paymentMethod} onChange={(e) => set("paymentMethod", e.target.value)}>
            {PAYMENT_METHODS.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        </div>
        <Field label="Transaction reference" value={form.transactionReference} onChange={(v) => set("transactionReference", v)} />
        <div className="sm:col-span-2">
          <label className="label">Notes</label>
          <textarea className="input" value={form.notes} onChange={(e) => set("notes", e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <button className="btn-primary" disabled={saving} type="submit">
            {saving ? "Saving..." : "Register member"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="label">{label}</label>
      <input className="input" type={type} value={value} required={required} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
