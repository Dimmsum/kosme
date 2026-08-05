import { FolderOpen } from "lucide-react";
import ModuleStub from "@/components/admin/ModuleStub";

export default function AdminPortfoliosPage() {
  return (
    <ModuleStub
      icon={FolderOpen}
      title="Portfolio Oversight"
      description="Review every student's generated portfolio and the verified work it's built from."
      comingIn="Phase 5 (Kosmè Portfolio)"
    />
  );
}
