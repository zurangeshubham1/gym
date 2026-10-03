import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Badge, EmptyState, ErrorState, PageHeader, Spinner, statusTone } from "../components/ui/Feedback";
import { useAuthedApi } from "../hooks/useAuthedApi";
import type { Member } from "../types";
import { formatDate, formatMoney } from "../utils/format";

export function MembersPage() {
  const { call } = useAuthedApi();
  const [rows, setRows] = useState<Member[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("ALL");

  useEffect(() => {
    call((api, token) => api.getMembers(token)).then((result) => {
      setLoading(false);
      if (!result.ok) setError(result.error);
      else setRows(result.data);
    });
  }, [call]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((m) => {
      if (status !== "ALL" && m.status !== status) return false;
      if (!needle) return true;
      return [m.memberId, m.fullName, m.mobile].some((v) => v.toLowerCase().includes(needle));
    });
  }, [rows, q, status]);

  if (loading) return <Spinner />;
  if (error) return <ErrorState message={error} />;

  return (
    <div>
      <PageHeader
        title="Members"
        subtitle="Search by ID, name, or mobile."
        actions={<Link className="btn-primary" to="/members/new">Add member</Link>}
      />
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <input className="input sm:col-span-2" placeholder="Search member ID, name, mobile" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="ALL">All statuses</option>
          <option>ACTIVE</option>
          <option>EXPIRED</option>
          <option>SUSPENDED</option>
          <option>INACTIVE</option>
        </select>
      </div>
      {filtered.length === 0 ? (
        <EmptyState title="No members match" hint="Try another search or add a member." />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Mobile</th>
                <th className="px-4 py-3">Plan</th>
                <th className="px-4 py-3">End</th>
                <th className="px-4 py-3">Pending</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m) => (
                <tr key={m.memberId} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-medium">
                    <Link className="text-gym-700 hover:underline" to={`/members/${m.memberId}`}>{m.memberId}</Link>
                  </td>
                  <td className="px-4 py-3">{m.fullName}</td>
                  <td className="px-4 py-3">{m.mobile}</td>
                  <td className="px-4 py-3">{m.membershipPlanId}</td>
                  <td className="px-4 py-3">{formatDate(m.membershipEndDate)}</td>
                  <td className="px-4 py-3">{formatMoney(m.pendingAmount)}</td>
                  <td className="px-4 py-3"><Badge tone={statusTone(m.status)}>{m.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
