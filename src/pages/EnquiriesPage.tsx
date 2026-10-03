import { useEffect, useState } from "react";
import { Badge, EmptyState, ErrorState, PageHeader, Spinner, statusTone } from "../components/ui/Feedback";
import { useAuthedApi } from "../hooks/useAuthedApi";
import type { Enquiry } from "../types";

export function EnquiriesPage() {
  const { call } = useAuthedApi();
  const [rows, setRows] = useState<Enquiry[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    call((api, token) => api.getEnquiries(token)).then((result) => {
      setLoading(false);
      if (!result.ok) setError(result.error);
      else setRows(result.data);
    });
  }, [call]);

  if (loading) return <Spinner />;
  if (error) return <ErrorState message={error} />;

  return (
    <div>
      <PageHeader title="Website enquiries" subtitle="Public join form writes here through Apps Script. No Sheet password on the website." />
      {rows.length === 0 ? <EmptyState title="No enquiries yet" /> : (
        <div className="overflow-x-auto rounded-2xl border bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3 text-left">ID</th>
                <th className="px-4 py-3 text-left">Name</th>
                <th className="px-4 py-3 text-left">Mobile</th>
                <th className="px-4 py-3 text-left">Message</th>
                <th className="px-4 py-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((e) => (
                <tr key={e.enquiryId} className="border-t">
                  <td className="px-4 py-3">{e.enquiryId}</td>
                  <td className="px-4 py-3">{e.fullName}</td>
                  <td className="px-4 py-3">{e.mobile}</td>
                  <td className="px-4 py-3">{e.message}</td>
                  <td className="px-4 py-3"><Badge tone={statusTone(e.status)}>{e.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
