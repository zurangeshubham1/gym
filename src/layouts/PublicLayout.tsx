import { Link, Outlet } from "react-router-dom";
import { Dumbbell } from "lucide-react";
import { GymMotionHero } from "../components/public/GymMotionHero";

export function PublicLayout() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-gym-900 text-white">
      <GymMotionHero />
      <header className="relative z-10 mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
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
      <div className="relative z-10">
        <Outlet />
      </div>
    </div>
  );
}
