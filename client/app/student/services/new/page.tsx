"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function NewServiceRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/student/services");
  }, [router]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <p className="text-sm text-k-gray-400">Redirecting…</p>
    </div>
  );
}
