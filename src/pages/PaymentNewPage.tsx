import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ErrorState, PageHeader, Spinner } from "../components/ui/Feedback";
import { PAYMENT_METHODS } from "../config/constants";
import { useAuthedApi } from "../hooks/useAuthedApi";
import { useToast } from "../hooks/useToast";
import type { Member } from "../types";
import { todayIso } from "../utils/dates";
import { formatMoney } from "../utils/format";
import { validatePaymentAmount, paymentErrorMessage } from "../utils/finance";

export function PaymentNewPage() {
  const { call } = useAuthedApi();
  const { push } = useToast();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [members, setMembers] = useState<Member[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    memberId: params.get("memberId") ?? "",
    paymentDate: todayIso(),
    amount: "",
    paymentMethod: "UPI",
    transactionReference: "",
    notes: "",
  });

  useEffect(() => {
    call((api, token) => api.getMembers(token)).then((result) => {
      setLoading(false);
      if (!result.ok) setError(result.error);
      else setMembers(result.data);
    });
  }, [call]);

  const member = useMemo(() => members.find((m) => m.memberId === form.memberId), [members, form.memberId]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!member) {
      setError("Select a valid member.");
      return;
    }
    const invalid = validatePaymentAmount(Number(form.amount), member.pendingAmount);
    if (invalid) {
      setError(paymentErrorMessage(invalid));
      return;
    }
    setSaving(true);
    const result = await call((api, token) =>
      api.createPayment(token, {
        memberId: form.memberId,
        paymentDate: form.paymentDate,
        amount: Number(form.amount),
        paymentMethod: form.paymentMethod as "CASH" | "UPI" | "CARD" | "BANK_TRANSFER",
        transactionReference: form.transactionReference,
        notes: form.notes,
      }),
    );
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      push(result.error, "error");
      return;
    }
    push("Saved as PENDING. Confirm Paid (Yes) to generate a receipt.", "success");
    navigate("/payments");
  }

  if (loading) return <Spinner />;

  return (
    <div className="max-w-xl">
      <PageHeader
        title="Record payment"
        subtitle="New entries stay PENDING. Member dues do not change until you mark Paid (Yes)."
      />
      {error ? <div className="mb-4"><ErrorState message={error} /></div> : null}
      <form onSubmit={onSubmit} className="card space-y-4">
        <div>
          <label className="label">Member</label>
          <select className="input" value={form.memberId} onChange={(e) => setForm({ ...form, memberId: e.target.value })} required>
            <option value="">Select member</option>
            {members.map((m) => (
              <option key={m.memberId} value={m.memberId}>
                {m.memberId} — {m.fullName}
              </option>
            ))}
          </select>
        </div>
        {member ? (
          <p className="text-sm text-slate-600">
            Outstanding: <b>{formatMoney(member.pendingAmount)}</b> · Paid: {formatMoney(member.paidAmount)}
          </p>
        ) : null}
        <div>
          <label className="label">Date</label>
          <input className="input" type="date" value={form.paymentDate} onChange={(e) => setForm({ ...form, paymentDate: e.target.value })} required />
        </div>
        <div>
          <label className="label">Amount</label>
          <input className="input" type="number" min="0" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
        </div>
        <div>
          <label className="label">Method</label>
          <select className="input" value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}>
            {PAYMENT_METHODS.map((m) => <option key={m}>{m}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Transaction reference</label>
          <input className="input" value={form.transactionReference} onChange={(e) => setForm({ ...form, transactionReference: e.target.value })} />
        </div>
        <div>
          <label className="label">Notes</label>
          <textarea className="input" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </div>
        <button className="btn-primary" disabled={saving} type="submit">{saving ? "Saving..." : "Save as pending"}</button>
      </form>
    </div>
  );
}
