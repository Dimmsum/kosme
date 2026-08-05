import { UserCheck } from "lucide-react";
import ModuleStub from "@/components/admin/ModuleStub";

export default function AdminUsersPage() {
  return (
    <ModuleStub
      icon={UserCheck}
      title="User Verification"
      description="Review new sign-ups, confirm identities, and manage account status across every role."
      comingIn="Phase 2 (Admin Control Centre)"
    />
  );
}
