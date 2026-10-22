"use client";

import { Suspense, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

// Landing page for a student's "Add My Client" invite link. It remembers the
// token locally; the client layout claims it the first time they are signed in,
// attaching the student's pending bookings to their new account.
function InviteInner() {
  const token = useSearchParams().get("t");

  useEffect(() => {
    if (!token) return;
    try {
      localStorage.setItem("kosme_invite", token);
    } catch {
      /* storage unavailable — they can ask for a fresh link */
    }
  }, [token]);

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-5 px-6 text-center">
      <h1 className="font-serif text-2xl font-light text-k-black">You&apos;ve been invited to Kosmè</h1>
      <p className="text-sm text-k-gray-600">
        A cosmetology student would like to book a practical service with you. Create a volunteer client account (or sign in
        if you already have one) and you&apos;ll be able to confirm the booking.
      </p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Link href="/signup" className="rounded-full bg-k-primary px-6 py-2.5 text-sm font-medium text-k-white no-underline hover:bg-k-primary-light">
          Create an account
        </Link>
        <Link href="/login" className="rounded-full border border-k-gray-200 px-6 py-2.5 text-sm font-medium text-k-gray-600 no-underline hover:bg-k-gray-100">
          I already have one
        </Link>
      </div>
      {!token && <p className="text-xs text-red-600">This invite link looks incomplete. Ask the student to send it again.</p>}
    </main>
  );
}

export default function InvitePage() {
  return (
    <Suspense>
      <InviteInner />
    </Suspense>
  );
}
