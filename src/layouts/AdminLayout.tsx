import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  CreditCard,
  Dumbbell,
  LayoutDashboard,
  LogOut,
  Menu,
  Receipt,
  Settings,
  Users,
  Wallet,
  ClipboardList,
  MessageSquare,
  X,
} from "lucide-react";
import { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { classNames } from "../utils/format";
import { isApiConfigured, IS_DEV } from "../config/env";

const links = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/members", label: "Members", icon: Users },
  { to: "/payments", label: "Payments", icon: CreditCard },
  { to: "/plans", label: "Plans", icon: Dumbbell },
  { to: "/expenses", label: "Expenses", icon: Wallet },
  { to: "/enquiries", label: "Enquiries", icon: MessageSquare },
  { to: "/reports", label: "Reports", icon: ClipboardList },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 lg:flex">
      {open ? (
        <button className="fixed inset-0 z-20 bg-black/40 lg:hidden" aria-label="Close menu" onClick={() => setOpen(false)} />
      ) : null}
      <aside
        className={classNames(
          "fixed inset-y-0 left-0 z-30 w-72 transform bg-gym-900 text-white transition lg:static lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-16 items-center justify-between px-5">
          <div className="flex items-center gap-2 font-semibold">
            <Dumbbell className="h-5 w-5 text-gym-accent" />
            Gym Admin
          </div>
          <button className="lg:hidden" onClick={() => setOpen(false)}>
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="space-y-1 px-3">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                classNames(
                  "flex items-center gap-3 rounded-xl px-3 py-2 text-sm",
                  isActive ? "bg-white/10 text-white" : "text-white/70 hover:bg-white/5 hover:text-white",
                )
              }
            >
              <link.icon className="h-4 w-4" />
              {link.label}
            </NavLink>
          ))}
        </nav>
        <div className="absolute bottom-0 left-0 right-0 border-t border-white/10 p-4 text-xs text-white/70">
          <p className="font-medium text-white">{user?.fullName}</p>
          <p>{user?.role}</p>
          <button
            className="mt-3 flex items-center gap-2 text-white/80 hover:text-white"
            onClick={() => {
              logout();
              navigate("/login");
            }}
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </aside>
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-2 border-b border-slate-200 bg-white px-3 no-print sm:h-16 sm:px-4">
          <button className="relative z-30 min-h-11 min-w-11 rounded-lg p-2 hover:bg-slate-100 lg:hidden" type="button" onClick={() => setOpen(true)}>
            <Menu className="h-5 w-5" />
          </button>
          <div className="hidden min-w-0 truncate text-sm text-slate-500 lg:block">
            {isApiConfigured() ? "Connected to Apps Script" : IS_DEV ? "Local demo mode (no Sheet yet)" : "API URL missing"}
          </div>
          <NavLink to="/payments/new" className="btn-primary relative z-30 shrink-0 px-3 text-xs sm:px-4 sm:text-sm">
            <Receipt className="h-4 w-4" />
            <span className="sm:inline">Pay</span>
          </NavLink>
        </header>
        <main className="relative z-0 p-3 pb-24 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
