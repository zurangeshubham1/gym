import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ReceiptActions, ReceiptView } from "../components/payments/ReceiptView";
import { Badge, ConfirmDialog, EmptyState, ErrorState, Modal, PageHeader, Spinner, statusTone } from "../components/ui/Feedback";
import { PAYMENT_METHODS } from "../config/constants";
import { useAuthedApi } from "../hooks/useAuthedApi";
import { useToast } from "../hooks/useToast";
import type { Member, Payment, ReceiptData } from "../types";
import { formatDate, formatMoney } from "../utils/format";

export function PaymentsPage() {
  const { call } = useAuthedApi();
  const { push } = useToast();
  const [params] = useSearchParams();
  const [rows, setRows] = useState<Payment[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [method, setMethod] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [cancelId, setCancelId] = useState("");
  const [paidId, setPaidId] = useState("");
  const [unpaidId, setUnpaidId] = useState("");

  useEffect(() => {
    Promise.all([
      call((api, token) => api.getPayments(token)),
      call((api, token) => api.getMembers(token)),
    ]).then(([payments, memberList]) => {
      setLoading(false);
      if (!payments.ok) setError(payments.error);
      else setRows(payments.data);
      if (memberList.ok) setMembers(memberList.data);
    });
  }, [call]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((p) => {
      if (method !== "ALL" && p.paymentMethod !== method) return false;
      if (status !== "ALL" && p.paymentStatus !== status) return false;
      if (from && p.paymentDate < from) return false;
      if (to && p.paymentDate > to) return false;
      if (needle && ![p.paymentId, p.memberId, p.transactionReference].some((v) => String(v || "").toLowerCase().includes(needle))) return false;
      return true;
    });
  }, [rows, q, method, status, from, to]);

  const pendingMembers = useMemo(
    () =>
      members
        .filter((m) => Number(m.pendingAmount) > 0)
        .sort((a, b) => Number(b.pendingAmount) - Number(a.pendingAmount)),
    [members],
  );
  const pendingTotal = pendingMembers.reduce((sum, m) => sum + Number(m.pendingAmount || 0), 0);

  async function openReceipt(paymentId: string) {
    const result = await call((api, token) => api.getReceipt(token, paymentId));
    if (!result.ok) {
      push(result.error, "error");
      return;
    }
    setReceipt(result.data);
  }

  useEffect(() => {
    const focus = params.get("focus");
    if (focus) void openReceipt(focus);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  async function confirmPaid() {
    const result = await call((api, token) => api.confirmPaymentPaid(token, paidId));
    setPaidId("");
    if (!result.ok) {
      push(result.error, "error");
      return;
    }
    setRows((list) => list.map((p) => (p.paymentId === result.data.payment.paymentId ? result.data.payment : p)));
    push("Marked paid. Receipt is ready.", "success");
    setReceipt(result.data.receipt);
  }

  async function markUnpaid() {
    const result = await call((api, token) => api.markPaymentUnpaid(token, unpaidId));
    setUnpaidId("");
    if (!result.ok) {
      push(result.error, "error");
      return;
    }
    setRows((list) => list.map((p) => (p.paymentId === result.data.paymentId ? result.data : p)));
    push("Marked not paid. Outstanding restored.", "success");
  }

  async function cancel() {
    const result = await call((api, token) => api.cancelPayment(token, cancelId));
    setCancelId("");
    if (!result.ok) {
      push(result.error, "error");
      return;
    }
    setRows((list) => list.map((p) => (p.paymentId === result.data.paymentId ? result.data : p)));
    push("Payment cancelled. History kept.", "success");
  }

  if (loading) return <Spinner />;
  if (error) return <ErrorState message={error} />;

  return (
    <div>
      <PageHeader
        title="Payments"
        subtitle={`${pendingMembers.length} members still have pending dues · ${formatMoney(pendingTotal)}`}
        actions={<Link className="btn-primary" to="/payments/new">Add payment</Link>}
      />
      {pendingMembers.length > 0 ? (
        <div className="mb-6 overflow-x-auto rounded-2xl border border-amber-200 bg-amber-50">
          <div className="flex items-center justify-between px-4 py-3">
            <h2 className="font-semibold text-amber-950">Members with pending amount</h2>
            <span className="text-sm font-medium text-amber-900">Total outstanding {formatMoney(pendingTotal)}</span>
          </div>
          <table className="min-w-full text-sm">
            <thead className="text-xs uppercase text-amber-800">
              <tr>
                <th className="px-4 py-2 text-left">Member</th>
                <th className="px-4 py-2 text-left">Name</th>
                <th className="px-4 py-2 text-left">Pending</th>
                <th className="px-4 py-2 text-left">Status</th>
                <th className="px-4 py-2 text-left">Collect</th>
              </tr>
            </thead>
            <tbody>
              {pendingMembers.map((m) => (
                <tr key={m.memberId} className="border-t border-amber-200/70">
                  <td className="px-4 py-2">
                    <Link className="font-medium text-gym-800 hover:underline" to={`/members/${m.memberId}`}>{m.memberId}</Link>
                  </td>
                  <td className="px-4 py-2">{m.fullName}</td>
                  <td className="px-4 py-2 font-semibold text-amber-950">{formatMoney(m.pendingAmount)}</td>
                  <td className="px-4 py-2"><Badge tone={statusTone(m.status)}>{m.status}</Badge></td>
                  <td className="px-4 py-2">
                    <Link className="text-gym-800 hover:underline" to={`/members/${m.memberId}`}>Open member</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          No member has a pending amount.
        </p>
      )}
      <div className="mb-4 grid gap-3 md:grid-cols-5">
        <input className="input md:col-span-2" placeholder="Search payment / member / reference" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="input" value={method} onChange={(e) => setMethod(e.target.value)}>
          <option value="ALL">All methods</option>
          {PAYMENT_METHODS.map((m) => <option key={m}>{m}</option>)}
        </select>
        <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="ALL">All statuses</option>
          <option>PAID</option>
          <option>PENDING</option>
          <option>CANCELLED</option>
        </select>
        <div className="grid grid-cols-2 gap-2 md:col-span-5 lg:col-span-2">
          <input className="input" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          <input className="input" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
      </div>
      {filtered.length === 0 ? <EmptyState title="No payments found" /> : (
        <div className="overflow-x-auto rounded-2xl border bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3 text-left">ID</th>
                <th className="px-4 py-3 text-left">Member</th>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">Amount</th>
                <th className="px-4 py-3 text-left">Method</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.paymentId} className="border-t">
                  <td className="px-4 py-3">{p.paymentId}</td>
                  <td className="px-4 py-3"><Link className="text-gym-700" to={`/members/${p.memberId}`}>{p.memberId}</Link></td>
                  <td className="px-4 py-3">{formatDate(p.paymentDate)}</td>
                  <td className="px-4 py-3">{formatMoney(p.amount)}</td>
                  <td className="px-4 py-3">{p.paymentMethod}</td>
                  <td className="px-4 py-3"><Badge tone={statusTone(p.paymentStatus)}>{p.paymentStatus}</Badge></td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-x-3 gap-y-1">
                      {p.paymentStatus === "PENDING" ? (
                        <button className="font-semibold text-gym-700" type="button" onClick={() => setPaidId(p.paymentId)}>Mark paid (Yes)</button>
                      ) : null}
                      {p.paymentStatus === "PAID" ? (
                        <>
                          <button className="text-gym-700" type="button" onClick={() => void openReceipt(p.paymentId)}>Receipt / PDF</button>
                          <button className="text-amber-700" type="button" onClick={() => setUnpaidId(p.paymentId)}>Not paid</button>
                          <button className="text-red-600" type="button" onClick={() => setCancelId(p.paymentId)}>Cancel</button>
                        </>
                      ) : null}
                      {p.paymentStatus === "PENDING" ? (
                        <button className="text-red-600" type="button" onClick={() => setCancelId(p.paymentId)}>Cancel</button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Modal
        open={Boolean(receipt)}
        title="Paid receipt"
        showClose={false}
        onClose={() => setReceipt(null)}
        footer={receipt ? <ReceiptActions receipt={receipt} onDone={() => setReceipt(null)} /> : null}
      >
        {receipt ? <ReceiptView receipt={receipt} /> : null}
      </Modal>
      <ConfirmDialog
        open={Boolean(paidId)}
        title="Mark payment as paid?"
        message="Select Yes to confirm money received. A paid receipt will open. If membership dues remain, outstanding will print on the PDF."
        confirmLabel="Yes, paid"
        onClose={() => setPaidId("")}
        onConfirm={() => void confirmPaid()}
      />
      <ConfirmDialog
        open={Boolean(unpaidId)}
        title="Mark as not paid?"
        message="This sets the payment back to PENDING and restores member outstanding."
        confirmLabel="Not paid"
        onClose={() => setUnpaidId("")}
        onConfirm={() => void markUnpaid()}
      />
      <ConfirmDialog
        open={Boolean(cancelId)}
        title="Cancel payment"
        message="This marks the payment CANCELLED and recalculates the member balance. History is not deleted."
        confirmLabel="Cancel payment"
        onClose={() => setCancelId("")}
        onConfirm={() => void cancel()}
      />
    </div>
  );
}
