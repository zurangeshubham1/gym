import { useEffect, useState, type ReactNode } from "react";
import { ErrorState, PageHeader, Spinner } from "../components/ui/Feedback";
import { useAuthedApi } from "../hooks/useAuthedApi";
import type { ReportsData } from "../types";
import { toCsv } from "../utils/csv";
import { downloadTextFile, formatMoney } from "../utils/format";
import { todayIso } from "../utils/dates";

export function ReportsPage() {
  const { call } = useAuthedApi();
  const [fromDate, setFromDate] = useState(todayIso().slice(0, 8) + "01");
  const [toDate, setToDate] = useState(todayIso());
  const [data, setData] = useState<ReportsData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    call((api, token) => api.getReports(token, { fromDate, toDate })).then((result) => {
      setLoading(false);
      if (!result.ok) setError(result.error);
      else setData(result.data);
    });
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [call]);

  function exportCsv(name: string, rows: Record<string, unknown>[]) {
    downloadTextFile(`${name}.csv`, toCsv(rows));
  }

  return (
    <div>
      <PageHeader title="Reports" subtitle="Totals come from Apps Script / payment records, not only the UI." />
      <div className="mb-4 flex flex-wrap gap-3">
        <input className="input max-w-40" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
        <input className="input max-w-40" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
        <button className="btn-primary" type="button" onClick={load}>Apply dates</button>
      </div>
      {loading ? <Spinner /> : null}
      {error ? <ErrorState message={error} /> : null}
      {data ? (
        <div className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="card"><p className="text-sm text-slate-500">Income</p><p className="text-2xl font-bold">{formatMoney(data.totalIncome)}</p></div>
            <div className="card"><p className="text-sm text-slate-500">Expenses</p><p className="text-2xl font-bold">{formatMoney(data.totalExpenses)}</p></div>
            <div className="card"><p className="text-sm text-slate-500">Net income</p><p className="text-2xl font-bold">{formatMoney(data.netIncome)}</p></div>
          </div>
          <Section title="Daily collection" onExport={() => exportCsv("daily-collection", data.dailyCollection)}>
            {data.dailyCollection.map((r) => <Row key={r.date} left={r.date} right={formatMoney(r.amount)} />)}
          </Section>
          <Section title="Monthly collection" onExport={() => exportCsv("monthly-collection", data.monthlyCollection)}>
            {data.monthlyCollection.map((r) => <Row key={r.month} left={r.month} right={formatMoney(r.amount)} />)}
          </Section>
          <Section title="Payment history" onExport={() => exportCsv("payment-history", data.paymentHistory as unknown as Record<string, unknown>[])}>
            {data.paymentHistory.map((p) => <Row key={p.paymentId} left={`${p.paymentId} ${p.memberId}`} right={formatMoney(p.amount)} />)}
          </Section>
          <Section title="Pending payments" onExport={() => exportCsv("pending", data.pendingMembers as unknown as Record<string, unknown>[])}>
            {data.pendingMembers.map((m) => <Row key={m.memberId} left={m.fullName} right={formatMoney(m.pendingAmount)} />)}
          </Section>
          <Section title="Expired members" onExport={() => exportCsv("expired", data.expiredMembers as unknown as Record<string, unknown>[])}>
            {data.expiredMembers.map((m) => <Row key={m.memberId} left={m.fullName} right={m.membershipEndDate} />)}
          </Section>
          <Section title="Active members" onExport={() => exportCsv("active", data.activeMembers as unknown as Record<string, unknown>[])}>
            {data.activeMembers.map((m) => <Row key={m.memberId} left={m.fullName} right={m.memberId} />)}
          </Section>
          <Section title="New registrations" onExport={() => exportCsv("registrations", data.newRegistrations as unknown as Record<string, unknown>[])}>
            {data.newRegistrations.map((m) => <Row key={m.memberId} left={m.fullName} right={m.joinDate} />)}
          </Section>
          <Section title="Expenses" onExport={() => exportCsv("expenses", data.expenses as unknown as Record<string, unknown>[])}>
            {data.expenses.map((e) => <Row key={e.expenseId} left={e.category} right={formatMoney(e.amount)} />)}
          </Section>
        </div>
      ) : null}
    </div>
  );
}

function Section({ title, onExport, children }: { title: string; onExport: () => void; children: ReactNode }) {
  return (
    <div className="card">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold">{title}</h2>
        <button className="btn-secondary" type="button" onClick={onExport}>CSV</button>
      </div>
      <div className="max-h-56 overflow-auto text-sm">{children}</div>
    </div>
  );
}

function Row({ left, right }: { left: string; right: string }) {
  return (
    <div className="flex justify-between border-b border-slate-100 py-1.5">
      <span>{left}</span>
      <span className="font-medium">{right}</span>
    </div>
  );
}
