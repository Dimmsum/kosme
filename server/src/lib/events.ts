import { supabaseAdmin } from "./supabase";

type EventType =
  | "service_started"
  | "service_stopped"
  | "duration_over"
  | "duration_under"
  | "confirmation_completed"
  | "ready_for_verification";

// Append a row to public.events (migration 0023). Best-effort: never throws,
// so an event-logging failure can never break the service action it is
// recording — same convention as lib/audit.ts's logAudit. is_demo is set by
// the events_set_is_demo trigger from student_id, so it's not passed here.
export async function logEvent(
  tier: "activity" | "priority",
  eventType: EventType,
  studentId: string,
  serviceId: string | null,
  message: string,
): Promise<void> {
  try {
    const { error } = await supabaseAdmin.from("events").insert({
      tier,
      event_type: eventType,
      student_id: studentId,
      service_id: serviceId,
      message,
    });
    if (error) console.error("logEvent insert error:", error.message);
  } catch (err) {
    console.error("logEvent unexpected error:", err);
  }
}
