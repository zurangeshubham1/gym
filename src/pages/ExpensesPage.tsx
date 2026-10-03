import { useEffect, useState, type FormEvent } from "react";
import { ErrorState, PageHeader, Spinner } from "../components/ui/Feedback";
import { EXPENSE_CATEGORIES, PAYMENT_METHODS } from "../config/constants";
import { useAuthedApi } from "../hooks/useAuthedApi";
import { useToast } from "../hooks/useToast";
import type { Expense } from "../types";
import { todayIso } from "../utils/dates";
import { formatDate, formatMoney } from "../utils/format";

export function ExpensesPage() {
  const { call } = useAuthedApi();
  const { push } = useToast();
  const [rows, setRows] = useState<Expense[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    expenseDate: todayIso(),
    category: "Rent",
    description: "",
    amount: "",
    paymentMethod: "CASH",
  });

  function reload() {
    call((api, token) => api.getExpenses(token)).then((result) => {
      setLoading(false);
      if (!result.ok) setError(result.error);
      else setRows(result.data);
    });
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [call]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const result = await call((api, token) =>
      api.createExpense(token, {
        expenseDate: form.expenseDate,
        category: form.category,
        description: form.description,
        amount: Number(form.amount),
        paymentMethod: form.paymentMethod as "CASH" | "UPI" | "CARD" | "BANK_TRANSFER",
      }),
    );
    if (!result.ok) {
      push(result.error, "error");
      return;
    }
    push("Expense added", "success");
    setForm({ ...form, description: "", amount: "" });
    reload();
  }

  if (loading) return <Spinner />;
  if (error) return <ErrorState message={error} />;

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <PageHeader title="Expenses" />
        <div className="overflow-x-auto rounded-2xl border bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3 text-left">ID</th>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">Category</th>
                <th className="px-4 py-3 text-left">Amount</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((e) => (
                <tr key={e.expenseId} className="border-t">
                  <td className="px-4 py-3">{e.expenseId}</td>
                  <td className="px-4 py-3">{formatDate(e.expenseDate)}</td>
                  <td className="px-4 py-3">{e.category}<div className="text-xs text-slate-500">{e.description}</div></td>
                  <td className="px-4 py-3">{formatMoney(e.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <form onSubmit={onSubmit} className="card h-fit space-y-3">
        <h2 className="font-semibold">Add expense</h2>
        <input className="input" type="date" value={form.expenseDate} onChange={(e) => setForm({ ...form, expenseDate: e.target.value })} />
        <select className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
          {EXPENSE_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
        <textarea className="input" placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
        <input className="input" type="number" placeholder="Amount" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
        <select className="input" value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}>
          {PAYMENT_METHODS.map((m) => <option key={m}>{m}</option>)}
        </select>
        <button className="btn-primary" type="submit">Save</button>
      </form>
    </div>
  );
}
