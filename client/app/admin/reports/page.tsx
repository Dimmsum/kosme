import { BarChart3 } from "lucide-react";
import ModuleStub from "@/components/admin/ModuleStub";

export default function AdminReportsPage() {
  return (
    <ModuleStub
      icon={BarChart3}
      title="Reports & Analytics"
      description="Timing trends, cohort progress, and verification throughput across the platform."
      comingIn="MVP basic reports, then Phase 4/5"
    />
  );
}
