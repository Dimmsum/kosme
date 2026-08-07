import { supabaseAdmin } from "./supabase";

// Append a row to public.audit_log. Best-effort: never throws, so a logging
// failure can never break the admin action it is recording. Call it after a
// mutation has succeeded.
export async function logAudit(
  actorId: string | undefined,
  action: string,
  entityType: string,
  entityId: string | null,
  metadata?: Record<string, unknown> | null,
): Promise<void> {
  try {
    const { error } = await supabaseAdmin.from("audit_log").insert({
      actor_id: actorId ?? null,
      action,
      entity_type: entityType,
      entity_id: entityId,
      metadata: metadata ?? null,
    });
    if (error) console.error("logAudit insert error:", error.message);
  } catch (err) {
    console.error("logAudit unexpected error:", err);
  }
}
