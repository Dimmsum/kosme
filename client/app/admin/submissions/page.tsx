import { ClipboardList } from "lucide-react";
import ModuleStub from "@/components/admin/ModuleStub";

export default function AdminSubmissionsPage() {
  return (
    <ModuleStub
      icon={ClipboardList}
      title="Practical Submissions"
      description="Platform-wide view of every logged service — timing, evidence, client confirmation, and verification status."
      comingIn="Phase 3 (Kosmè Verify)"
    />
  );
}
