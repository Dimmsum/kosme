import { Flag } from "lucide-react";
import ModuleStub from "@/components/admin/ModuleStub";

export default function AdminFlagsPage() {
  return (
    <ModuleStub
      icon={Flag}
      title="Flagged Issues"
      description="Services and accounts flagged by educators for review — disputes, irregular timing, or evidence concerns."
      comingIn="Phase 3 (Kosmè Verify)"
    />
  );
}
