import { Bell } from "lucide-react";
import ModuleStub from "@/components/admin/ModuleStub";

export default function AdminAlertsPage() {
  return (
    <ModuleStub
      icon={Bell}
      title="Alerts"
      description="Priority alerts — services exceeding recommended time, ready for verification, or awaiting client confirmation."
      comingIn="Phase 4 (Timing, Hours & Educator Alerts)"
    />
  );
}
