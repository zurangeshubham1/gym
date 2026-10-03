import { Link, Outlet } from "react-router-dom";
import { Dumbbell } from "lucide-react";

export function PublicLayout() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gym-900 to-slate-950 text-white">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
        <Link to="/" className="flex items-center gap-2 font-semibold">
          <Dumbbell className="h-5 w-5 text-gym-accent" />
          IronForge
        </Link>
        <nav className="flex items-center gap-3 text-sm">
          <Link to="/enquire" className="rounded-lg px-3 py-2 hover:bg-white/10">
            Join
          </Link>
          <Link to="/login" className="rounded-lg bg-gym-accent px-3 py-2 font-semibold text-gym-900">
            Admin
          </Link>
        </nav>
      </header>
      <Outlet />
    </div>
  );
}
