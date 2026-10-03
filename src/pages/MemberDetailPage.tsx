import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ReceiptActions, ReceiptView } from "../components/payments/ReceiptView";
import { Badge, ConfirmDialog, ErrorState, Modal, PageHeader, Spinner, statusTone } from "../components/ui/Feedback";
import { useAuthedApi } from "../hooks/useAuthedApi";
import { useToast } from "../hooks/useToast";
import type { Member, Payment, ReceiptData } from "../types";
import { computePendingAfterAdd, computePendingAmount, validateAddPayment } from "../utils/finance";
import { formatDate, formatMoney } from "../utils/format";

export function MemberDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { call } = useAuthedApi();
  const { push } = useToast();
  const [member, setMember] = useState<Member | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [savingFinance, setSavingFinance] = useState(false);
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [form, setForm] = useState({
    fullName: "",
    mobile: "",
    email: "",
    address: "",
    notes: "",
    status: "ACTIVE",
    membershipStartDate: "",
    membershipEndDate: "",
  });
  const [finance, setFinance] = useState({ totalAmount: "", addAmount: "" });

  async function reload() {
    if (!id) return;
    const [m, p] = await Promise.all([
      call((api, token) => api.getMember(token, id)),
      call((api, token) => api.getPayments(token)),
    ]);
    if (!m.ok) setError(m.error);
    else {
      setMember(m.data);
      setForm({
        fullName: m.data.fullName,
        mobile: m.data.mobile,
        email: m.data.email,
        address: m.data.address,
        notes: m.data.notes,
        status: m.data.status,
        membershipStartDate: m.data.membershipStartDate,
        membershipEndDate: m.data.membershipEndDate,
      });
      setFinance({
        totalAmount: String(m.data.totalAmount),
        addAmount: "",
      });
    }
    if (p.ok) setPayments(p.data.filter((row) => row.memberId === id));
  }

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    reload().finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [call, id]);

  const alreadyPaid = member?.paidAmount ?? 0;
  const previousPending = useMemo(
    () => computePendingAmount(Number(finance.totalAmount || 0), alreadyPaid),
    [finance.totalAmount, alreadyPaid],
  );
  const pendingPreview = useMemo(
    () => computePendingAfterAdd(Number(finance.totalAmount || 0), alreadyPaid, Number(finance.addAmount || 0)),
    [finance.totalAmount, finance.addAmount, alreadyPaid],
  );

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!id) return;
    const result = await call((api, token) =>
      api.updateMember(token, {
        memberId: id,
        fullName: form.fullName,
        mobile: form.mobile,
        email: form.email,
        address: form.address,
        notes: form.notes,
        status: form.status as Member["status"],
        membershipStartDate: form.membershipStartDate,
        membershipEndDate: form.membershipEndDate,
      }),
    );
    if (!result.ok) {
      push(result.error, "error");
      return;
    }
    setMember(result.data);
    setEditing(false);
    push("Member updated", "success");
  }

  async function saveFinance(e: FormEvent) {
    e.preventDefault();
    if (!id || !member) return;
    const totalAmount = Number(finance.totalAmount);
    const addAmount = Number(finance.addAmount || 0);
    const invalid = validateAddPayment(totalAmount, member.paidAmount, addAmount);
    if (invalid) {
      push(invalid, "error");
      return;
    }
    setSavingFinance(true);
    const result = await call((api, token) => api.updateMemberFinance(token, { memberId: id, totalAmount, addAmount }));
    setSavingFinance(false);
    if (!result.ok) {
      push(result.error, "error");
      return;
    }
    setMember(result.data.member);
    setFinance({
      totalAmount: String(result.data.member.totalAmount),
      addAmount: "",
    });
    await reload();
    setReceipt(result.data.receipt);
    push("Amounts saved. Receipt ready.", "success");
  }

  async function reactivate() {
    if (!id || !member) return;
    const result = await call((api, token) =>
      api.updateMember(token, {
        memberId: id,
        status: "ACTIVE",
        membershipStartDate: member.membershipStartDate,
        membershipEndDate: member.membershipEndDate,
        notes: form.notes,
      }),
    );
    if (!result.ok) {
      push(result.error, "error");
      return;
    }
    setMember(result.data);
    setForm((f) => ({
      ...f,
      status: result.data.status,
      membershipStartDate: result.data.membershipStartDate,
      membershipEndDate: result.data.membershipEndDate,
    }));
    push("Member activated. Membership dates renewed from today.", "success");
  }

  async function deactivate() {
    if (!id) return;
    const result = await call((api, token) => api.deactivateMember(token, id));
    setConfirm(false);
    if (!result.ok) {
      push(result.error, "error");
      return;
    }
    setMember(result.data);
    push("Member deactivated", "success");
  }

  if (loading) return <Spinner />;
  if (error) return <ErrorState message={error} />;
  if (!member) return <ErrorState message="Member not found." />;

  const lastPaid = [...payments]
    .filter((p) => p.paymentStatus === "PAID")
    .sort((a, b) => b.paymentDate.localeCompare(a.paymentDate) || b.createdAt.localeCompare(a.createdAt))[0];

  return (
    <div>
      <PageHeader
        title={member.fullName}
        subtitle={member.memberId}
        actions={
          <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap">
            <Link className="btn-primary col-span-2 sm:col-span-1" to={`/payments/new?memberId=${member.memberId}`}>Add payment</Link>
            <button className="btn-secondary relative z-20" type="button" onClick={() => setEditing((v) => !v)}>
              {editing ? "Close edit" : "Edit"}
            </button>
            {member.status === "EXPIRED" || member.status === "INACTIVE" || member.status === "SUSPENDED" ? (
              <button className="btn-primary" type="button" onClick={() => void reactivate()}>Activate again</button>
            ) : null}
            <button className="btn-danger" type="button" onClick={() => setConfirm(true)}>Deactivate</button>
          </div>
        }
      />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card lg:col-span-2 grid gap-2 text-sm sm:grid-cols-2">
          <Info label="Mobile" value={member.mobile} />
          <Info label="Email" value={member.email || "—"} />
          <Info label="Join date" value={formatDate(member.joinDate)} />
          <Info label="Plan" value={member.membershipPlanId} />
          <Info label="Start" value={formatDate(member.membershipStartDate)} />
          <Info label="End" value={formatDate(member.membershipEndDate)} />
          <Info label="Total" value={formatMoney(Number(finance.totalAmount || 0))} />
          <Info label="Already paid" value={formatMoney(alreadyPaid)} />
          <Info label="Pending" value={formatMoney(pendingPreview)} />
          <Info
            label="Last payment"
            value={
              lastPaid
                ? `${formatMoney(lastPaid.amount)} · ${formatDate(lastPaid.paymentDate)}`
                : formatDate(member.lastPaymentDate)
            }
          />
          <div>
            <p className="text-slate-500">Status</p>
            <Badge tone={statusTone(member.status)}>{member.status}</Badge>
          </div>
          <Info label="Notes" value={member.notes || "—"} />
        </div>
        <form onSubmit={saveFinance} className="card space-y-3">
          <h2 className="font-semibold">Membership amounts</h2>
          <p className="text-xs text-slate-500">
            Pehle ka paid clear nahi hota. Paid box khali = pending same rahegi. Naya amount previous pending se minus hoga.
          </p>
          <div>
            <label className="label">Total</label>
            <input
              className="input"
              type="number"
              min="0"
              step="0.01"
              value={finance.totalAmount}
              onChange={(e) => setFinance({ ...finance, totalAmount: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="label">Already paid (saved)</label>
            <input className="input bg-slate-50" value={formatMoney(alreadyPaid)} readOnly />
          </div>
          <div>
            <label className="label">Previous pending</label>
            <input className="input bg-slate-50" value={formatMoney(previousPending)} readOnly />
          </div>
          <div>
            <label className="label">Paid (this time only)</label>
            <input
              className="input"
              type="number"
              min="0"
              step="0.01"
              placeholder="e.g. 500"
              value={finance.addAmount}
              onChange={(e) => setFinance({ ...finance, addAmount: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Pending after this payment</label>
            <input className="input bg-slate-50" value={formatMoney(pendingPreview)} readOnly />
          </div>
          <button className="btn-primary w-full" disabled={savingFinance} type="submit">
            {savingFinance ? "Saving..." : "Save amounts & create receipt"}
          </button>
        </form>
        {editing ? (
          <form onSubmit={save} className="card space-y-3 lg:col-span-3">
            <h2 className="font-semibold">Edit member</h2>
            <input className="input" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
            <input className="input" value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} />
            <input className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <textarea className="input" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            <div>
              <label className="label">Status</label>
              <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="ACTIVE">ACTIVE</option>
                <option value="EXPIRED">EXPIRED</option>
                <option value="SUSPENDED">SUSPENDED</option>
                <option value="INACTIVE">INACTIVE</option>
              </select>
            </div>
            <div>
              <label className="label">Membership start</label>
              <input className="input" type="date" value={form.membershipStartDate} onChange={(e) => setForm({ ...form, membershipStartDate: e.target.value })} />
            </div>
            <div>
              <label className="label">Membership end</label>
              <input className="input" type="date" value={form.membershipEndDate} onChange={(e) => setForm({ ...form, membershipEndDate: e.target.value })} />
            </div>
            <p className="text-xs text-slate-500">Expired member ko ACTIVE karne par end date aaj se aage honi chahiye, ya Activate again use karo (plan duration se renew).</p>
            <textarea className="input" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            <button className="btn-primary" type="submit">Save</button>
          </form>
        ) : null}
      </div>
      <h2 className="mt-8 mb-3 font-semibold">Payment history</h2>
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3 text-left">ID</th>
              <th className="px-4 py-3 text-left">Date</th>
              <th className="px-4 py-3 text-left">Amount</th>
              <th className="px-4 py-3 text-left">Method</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Receipt</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((p) => (
              <tr key={p.paymentId} className="border-t">
                <td className="px-4 py-3">{p.paymentId}</td>
                <td className="px-4 py-3">{formatDate(p.paymentDate)}</td>
                <td className="px-4 py-3">{formatMoney(p.amount)}</td>
                <td className="px-4 py-3">{p.paymentMethod}</td>
                <td className="px-4 py-3"><Badge tone={statusTone(p.paymentStatus)}>{p.paymentStatus}</Badge></td>
                <td className="px-4 py-3">
                  {p.paymentStatus === "PAID" ? (
                    <Link className="text-gym-700 hover:underline" to={`/payments?focus=${p.paymentId}`}>Receipt</Link>
                  ) : (
                    <Link className="text-gym-700 hover:underline" to="/payments">Mark paid</Link>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Modal
        open={Boolean(receipt)}
        title="Receipt"
        showClose={false}
        onClose={() => setReceipt(null)}
        footer={receipt ? <ReceiptActions receipt={receipt} onDone={() => setReceipt(null)} /> : null}
      >
        {receipt ? <ReceiptView receipt={receipt} /> : null}
      </Modal>
      <ConfirmDialog
        open={confirm}
        title="Deactivate member"
        message="This sets status to INACTIVE. Payment history is kept."
        confirmLabel="Deactivate"
        onClose={() => setConfirm(false)}
        onConfirm={deactivate}
      />
      <button className="mt-6 text-sm text-slate-500" type="button" onClick={() => navigate("/members")}>
        Back to members
      </button>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-slate-500">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}
