import { Users } from "lucide-react";
import ModuleStub from "@/components/admin/ModuleStub";

export default function AdminClientsPage() {
  return (
    <ModuleStub
      icon={Users}
      title="Volunteer Client Management"
      description="Browse volunteer client sign-ups, consent records, and availability across the platform."
      comingIn="Phase 6 (Kosmè Connect)"
    />
  );
}
