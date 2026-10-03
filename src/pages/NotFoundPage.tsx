import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3">
      <h1 className="text-2xl font-bold">Page not found</h1>
      <Link className="text-gym-700" to="/">Go home</Link>
    </div>
  );
}
