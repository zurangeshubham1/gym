import type { ReceiptData } from "../../types";
import { formatDate, formatMoney } from "../../utils/format";

export function ReceiptView({ receipt }: { receipt: ReceiptData }) {
  const { gym, payment, member, planName, previousPending, currentPending, outstandingAmount } = receipt;
  const outstanding = outstandingAmount ?? currentPending;
  return (
    <div id="receipt-print" className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-8">
      <div className="border-b border-slate-200 pb-4">
        <h2 className="text-2xl font-bold text-gym-900">{gym.gymName}</h2>
        <p className="text-sm text-slate-600">{gym.gymAddress}</p>
        <p className="text-sm text-slate-600">
          {gym.gymMobile} · {gym.gymEmail}
        </p>
      </div>
      <h3 className="mt-4 text-lg font-semibold">Paid receipt</h3>
      <dl className="mt-4 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
        <Row label="Receipt number" value={payment.paymentId} />
        <Row label="Payment status" value={payment.paymentStatus} />
        <Row label="Member ID" value={member.memberId} />
        <Row label="Member name" value={member.fullName} />
        <Row label="Mobile" value={member.mobile} />
        <Row label="Method" value={payment.paymentMethod} />
        <Row label="Reference" value={payment.transactionReference || "—"} />
        <Row label="Plan" value={planName} />
        <Row label="Payment date" value={formatDate(payment.paymentDate)} />
        <Row label="Membership total" value={formatMoney(member.totalAmount, gym.currency)} />
        <Row label="Paid" value={formatMoney(member.paidAmount, gym.currency)} />
        <Row label="Outstanding" value={outstanding > 0 ? formatMoney(outstanding, gym.currency) : "Nil — fully paid"} />
        <Row label="Validity" value={`${formatDate(member.membershipStartDate)} – ${formatDate(member.membershipEndDate)}`} />
        <Row label="Amount this receipt" value={formatMoney(payment.amount, gym.currency)} />
        <Row label="Previous pending" value={formatMoney(previousPending, gym.currency)} />
      </dl>
      {outstanding > 0 ? (
        <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900">
          Outstanding / still pending: {formatMoney(outstanding, gym.currency)}
        </p>
      ) : (
        <p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800">
          No outstanding dues after this payment.
        </p>
      )}
      <p className="mt-8 text-xs text-slate-500">{gym.receiptFooter}</p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
