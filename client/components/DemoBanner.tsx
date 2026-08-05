"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, X } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

const ROLE_LABEL: Record<string, string> = {
  student: "Student",
  educator: "Educator",
  client: "Volunteer Client",
  employer: "Employer",
};

export default function DemoBanner() {
  const { isDemo, role, signOut } = useAuth();
  const router = useRouter();
  const [exiting, setExiting] = useState(false);

  if (!isDemo) return null;

  const label = role ? ROLE_LABEL[role] ?? role : "Demo";

  const exitDemo = async () => {
    setExiting(true);
    await signOut();
    router.push("/");
  };

  return (
    <div className="sticky top-0 z-40 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 bg-k-primary px-4 py-2 text-center text-xs font-medium text-k-white sm:text-sm">
      <span className="flex items-center gap-1.5">
        <Sparkles size={14} />
        You're browsing a demo — viewing Kosmè as a {label}
      </span>
      <a
        href="/demo"
        className="no-underline text-k-white/90 underline decoration-k-white/40 underline-offset-2 hover:text-k-white"
      >
        Switch role
      </a>
      <button
        type="button"
        onClick={exitDemo}
        disabled={exiting}
        className="inline-flex items-center gap-1 no-underline text-k-white/90 underline decoration-k-white/40 underline-offset-2 hover:text-k-white disabled:opacity-60"
      >
        <X size={12} />
        {exiting ? "Exiting…" : "Exit demo"}
      </button>
    </div>
  );
}
