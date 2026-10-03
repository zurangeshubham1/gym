import { Link } from "react-router-dom";

export function PublicHomePage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-16">
      <p className="text-gym-accent">Strength · Coaching · Community</p>
      <h1 className="mt-3 max-w-2xl text-4xl font-bold leading-tight sm:text-5xl">Train with a gym that keeps memberships simple.</h1>
      <p className="mt-4 max-w-xl text-white/70">
        Fill a join enquiry on this public site. The form talks only to Google Apps Script. Your Google Sheet stays private.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link to="/enquire" className="rounded-xl bg-gym-accent px-5 py-3 font-semibold text-gym-900">Membership enquiry</Link>
        <Link to="/login" className="rounded-xl border border-white/20 px-5 py-3">Staff login</Link>
      </div>
    </main>
  );
}
