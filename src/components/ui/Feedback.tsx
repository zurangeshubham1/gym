import type { ReactNode } from "react";
import { classNames } from "../../utils/format";

export function Spinner({ label = "Loading..." }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 text-sm text-slate-600">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-gym-700" />
      {label}
    </div>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center">
      <p className="font-medium text-slate-800">{title}</p>
      {hint ? <p className="mt-1 text-sm text-slate-500">{hint}</p> : null}
    </div>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{message}</div>
  );
}

export function Badge({
  children,
  tone = "slate",
}: {
  children: ReactNode;
  tone?: "slate" | "green" | "amber" | "red" | "blue";
}) {
  const map = {
    slate: "bg-slate-100 text-slate-700",
    green: "bg-emerald-100 text-emerald-800",
    amber: "bg-amber-100 text-amber-800",
    red: "bg-red-100 text-red-800",
    blue: "bg-sky-100 text-sky-800",
  };
  return <span className={classNames("rounded-full px-2.5 py-0.5 text-xs font-semibold", map[tone])}>{children}</span>;
}

export function Modal({
  open,
  title,
  children,
  footer,
  onClose,
  showClose = true,
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
  showClose?: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[80] flex items-stretch justify-center bg-black/50 p-0 sm:items-center sm:p-4">
      <button className="absolute inset-0" aria-label="Close" onClick={onClose} />
      <div className="relative z-10 flex h-[100dvh] w-full max-w-lg flex-col overflow-hidden rounded-none bg-white shadow-xl sm:h-auto sm:max-h-[90dvh] sm:rounded-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <h2 className="text-lg font-semibold">{title}</h2>
          {showClose ? (
            <button className="min-h-11 min-w-11 text-slate-500" type="button" onClick={onClose}>
              ✕
            </button>
          ) : null}
        </div>
        <div className="modal-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">{children}</div>
        {footer ? (
          <div className="no-print shrink-0 border-t border-slate-200 bg-white px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            {footer}
          </div>
        ) : (
          <div className="h-[env(safe-area-inset-bottom)] shrink-0 sm:hidden" />
        )}
      </div>
    </div>
  );
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Modal open={open} title={title} onClose={onClose}>
      <p className="mb-5 text-sm text-slate-600">{message}</p>
      <div className="flex justify-end gap-2">
        <button className="btn-secondary" type="button" onClick={onClose}>
          Cancel
        </button>
        <button className="btn-danger" type="button" onClick={onConfirm}>
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="relative z-10 mb-6 flex flex-col gap-3">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
      </div>
      {actions ? <div className="relative z-20 flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

export function statusTone(status: string): "green" | "amber" | "red" | "slate" | "blue" {
  if (status === "ACTIVE" || status === "PAID") return "green";
  if (status === "PENDING" || status === "TODAY" || status === "D7") return "amber";
  if (status === "EXPIRED" || status === "CANCELLED" || status === "SUSPENDED") return "red";
  if (status === "INACTIVE") return "slate";
  return "blue";
}
