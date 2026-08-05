import { Building2 } from "lucide-react";
import ModuleStub from "@/components/admin/ModuleStub";

export default function AdminInstitutionsPage() {
  return (
    <ModuleStub
      icon={Building2}
      title="Institutions, Programmes & Cohorts"
      description="Create institutions, programmes, and cohorts, and set required practical hours and counts per service."
      comingIn="Phase 2 (Admin Control Centre)"
    />
  );
}
