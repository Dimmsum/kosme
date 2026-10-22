import { redirect } from "next/navigation";

// Educator assignments now live under Institutions & Cohorts (Institution →
// Programme → Cohort → Educators → Students).
export default function AdminEducatorsRedirect() {
  redirect("/admin/institutions");
}
