import { Sparkles, ExternalLink } from "lucide-react";

export default function AdminDemoPage() {
  return (
    <div className="px-6 py-10 sm:px-10 sm:py-14">
      <div className="mx-auto max-w-[560px] rounded-3xl border border-k-gray-200 bg-k-white px-8 py-12 text-center shadow-[0_4px_24px_rgba(0,0,0,0.04)]">
        <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-k-primary/10 text-k-primary">
          <Sparkles size={22} />
        </div>
        <h1 className="mb-2 font-serif text-2xl font-light text-k-black">Demo Mode</h1>
        <p className="mb-6 text-sm font-light leading-relaxed text-k-gray-600">
          The public demo login is live at <code>/demo</code> — anyone can try
          the platform as a Student, Educator, Volunteer Client, or Employer
          without an account. Demo activity is fully isolated from real
          platform data and never includes Super Admin access.
        </p>
        <a
          href="/demo"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-full bg-k-primary px-6 py-3 text-sm font-medium text-k-white no-underline transition-colors duration-200 hover:bg-k-primary-light"
        >
          Open the demo picker
          <ExternalLink size={14} />
        </a>
        <p className="mt-6 text-xs font-light text-k-gray-400">
          Demo accounts are provisioned via <code>npm run seed:demo</code> —
          managing/regenerating demo data from this dashboard is planned for a
          later phase.
        </p>
      </div>
    </div>
  );
}
