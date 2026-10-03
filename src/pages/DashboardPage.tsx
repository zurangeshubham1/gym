import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { StatCard, money } from "../components/dashboard/StatCard";
import { Badge, EmptyState, ErrorState, PageHeader, Spinner, statusTone } from "../components/ui/Feedback";
import { useAuthedApi } from "../hooks/useAuthedApi";
import type { DashboardData } from "../types";
import { formatDate } from "../utils/format";

export function DashboardPage() {
  const { call } = useAuthedApi();
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let live = true;
    call((api, token) => api.getDashboard(token)).then((result) => {
      if (!live) return;
      setLoading(false);
      if (!result.ok) setError(result.error);
      else setData(result.data);
    });
    return () => {
      live = false;
    };
  }, [call]);

  if (loading) return <Spinner />;
  if (error) return <ErrorState message={error} />;
  if (!data) return <EmptyState title="No dashboard data" />;

  const max = Math.max(1, data.todayCollection, data.monthCollection, data.totalExpenses);

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Collections, memberships, and upcoming expiries." />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total members" value={data.totalMembers} />
        <StatCard label="Active members" value={data.activeMembers} />
        <StatCard label="Expired members" value={data.expiredMembers} />
        <StatCard label="Pending amount" value={money(data.pendingAmount)} />
        <StatCard label="Today's collection" value={money(data.todayCollection)} />
        <StatCard label="This month's collection" value={money(data.monthCollection)} />
        <StatCard label="Total expenses" value={money(data.totalExpenses)} />
        <StatCard label="Net income" value={money(data.netIncome)} />
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <ExpiryChip label="Expired" value={data.expiredCount} tone="red" />
        <ExpiryChip label="Expires today" value={data.expiresToday} tone="amber" />
        <ExpiryChip label="Within 7 days" value={data.expiresIn7Days} tone="amber" />
        <ExpiryChip label="Within 30 days" value={data.expiresIn30Days} tone="blue" />
      </div>

      <div className="card mt-6">
        <h2 className="mb-4 font-semibold">Collection snapshot</h2>
        <Bar label="Today" value={data.todayCollection} max={max} />
        <Bar label="This month" value={data.monthCollection} max={max} />
        <Bar label="Expenses" value={data.totalExpenses} max={max} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <ListCard title="Recent payments" empty="No payments yet">
          {data.recentPayments.map((p) => (
            <li key={p.paymentId}>
              <Link className="flex items-center justify-between py-2 text-sm hover:text-gym-700" to={`/members/${p.memberId}`}>
                <span>{p.paymentId} · {p.memberId}</span>
                <span className="font-medium">{money(p.amount)}</span>
              </Link>
            </li>
          ))}
        </ListCard>
        <ListCard title="New members" empty="No members yet">
          {data.recentMembers.map((m) => (
            <li key={m.memberId}>
              <Link className="flex items-center justify-between py-2 text-sm hover:text-gym-700" to={`/members/${m.memberId}`}>
                <span>{m.fullName}</span>
                <Badge tone={statusTone(m.status)}>{m.status}</Badge>
              </Link>
            </li>
          ))}
        </ListCard>
        <ListCard title="Expiring soon" empty="None in the next 30 days">
          {data.expiringSoon.map((m) => (
            <li key={m.memberId}>
              <Link className="flex items-center justify-between py-2 text-sm hover:text-gym-700" to={`/members/${m.memberId}`}>
                <span>{m.fullName}</span>
                <span className="text-slate-500">{formatDate(m.membershipEndDate)}</span>
              </Link>
            </li>
          ))}
        </ListCard>
        <ListCard title="Pending payments" empty="No pending dues">
          {data.pendingPayments.map((m) => (
            <li key={m.memberId}>
              <Link className="flex items-center justify-between py-2 text-sm hover:text-gym-700" to={`/members/${m.memberId}`}>
                <span>{m.fullName}</span>
                <span className="font-medium">{money(m.pendingAmount)}</span>
              </Link>
            </li>
          ))}
        </ListCard>
      </div>
    </div>
  );
}

function ExpiryChip({ label, value, tone }: { label: string; value: number; tone: "red" | "amber" | "blue" }) {
  const cls = tone === "red" ? "border-red-200 bg-red-50" : tone === "amber" ? "border-amber-200 bg-amber-50" : "border-sky-200 bg-sky-50";
  return (
    <div className={`rounded-xl border px-3 py-3 ${cls}`}>
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="text-xl font-bold">{value}</p>
    </div>
  );
}

function Bar({ label, value, max }: { label: string; value: number; max: number }) {
  return (
    <div className="mb-3">
      <div className="mb-1 flex justify-between text-sm">
        <span>{label}</span>
        <span>{money(value)}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full bg-gym-600" style={{ width: `${Math.round((value / max) * 100)}%` }} />
      </div>
    </div>
  );
}

function ListCard({ title, empty, children }: { title: string; empty: string; children: ReactNode }) {
  const count = Array.isArray(children) ? children.length : 0;
  return (
    <div className="card">
      <h2 className="mb-2 font-semibold">{title}</h2>
      {count === 0 ? <EmptyState title={empty} /> : <ul className="divide-y divide-slate-100">{children}</ul>}
    </div>
  );
}
