import { Briefcase } from "lucide-react";
import ModuleStub from "@/components/admin/ModuleStub";

export default function AdminEmployersPage() {
  return (
    <ModuleStub
      icon={Briefcase}
      title="Employer Management"
      description="Review registered employers and manage their access to student portfolios and shortlists."
      comingIn="Phase 2 (Admin Control Centre)"
    />
  );
}
