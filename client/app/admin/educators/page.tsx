import { GraduationCap } from "lucide-react";
import ModuleStub from "@/components/admin/ModuleStub";

export default function AdminEducatorsPage() {
  return (
    <ModuleStub
      icon={GraduationCap}
      title="Educator Assignments"
      description="Assign educators to programmes and cohorts so they only see the students they're responsible for."
      comingIn="Phase 2 (Admin Control Centre)"
    />
  );
}
