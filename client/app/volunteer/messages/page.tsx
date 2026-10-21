"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import MessagesPanel from "@/components/appointments/MessagesPanel";

function MessagesInner() {
  const searchParams = useSearchParams();
  return (
    <div className="px-4 py-6 sm:px-6 md:px-8 md:py-8">
      <div className="mb-6">
        <h1 className="font-serif text-2xl font-light text-k-black sm:text-3xl">Messages</h1>
        <p className="mt-1 text-sm text-k-gray-400">
          Talk to students inside Kosmè — no phone numbers needed.
        </p>
      </div>
      <MessagesPanel openWith={searchParams.get("with")} />
    </div>
  );
}

export default function VolunteerMessagesPage() {
  return (
    <Suspense fallback={null}>
      <MessagesInner />
    </Suspense>
  );
}
