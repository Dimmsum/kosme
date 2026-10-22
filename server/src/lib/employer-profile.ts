export const BUSINESS_TYPES = ["salon", "spa", "barbershop", "mobile_service", "school_academy", "agency", "other"];
export const VERIFICATION_STATUSES = ["pending", "verified", "rejected"];

// Validates the business-detail fields present in `body`; returns DB-ready
// updates or an error. Shared by the employer's own endpoint and the admin one.
export function parseEmployerFields(body: Record<string, unknown>): { updates: Record<string, string | null> } | { error: string } {
  const updates: Record<string, string | null> = {};
  for (const field of ["business_name", "contact_person", "location"] as const) {
    const v = body[field];
    if (v === undefined) continue;
    if (v !== null && (typeof v !== "string" || v.length > 255)) return { error: `${field} must be a string up to 255 characters` };
    updates[field] = typeof v === "string" && v.trim() === "" ? null : (v as string | null);
  }
  if (body.business_type !== undefined) {
    if (body.business_type !== null && !BUSINESS_TYPES.includes(body.business_type as string)) {
      return { error: `business_type must be one of: ${BUSINESS_TYPES.join(", ")}` };
    }
    updates.business_type = body.business_type as string | null;
  }
  return { updates };
}
