import { History } from "lucide-react";
import ModuleStub from "@/components/admin/ModuleStub";

export default function AdminAuditPage() {
  return (
    <ModuleStub
      icon={History}
      title="Audit Trail"
      description="A record of every approval, rejection, correction, and admin action taken on the platform."
      comingIn="Phase 2 (Admin Control Centre)"
    />
  );
}
