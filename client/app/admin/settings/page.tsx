import { Settings } from "lucide-react";
import ModuleStub from "@/components/admin/ModuleStub";

export default function AdminSettingsPage() {
  return (
    <ModuleStub
      icon={Settings}
      title="Settings"
      description="Platform-wide configuration — service categories, durations, required hours, and feature flags."
      comingIn="Phase 2 (Admin Control Centre)"
    />
  );
}
