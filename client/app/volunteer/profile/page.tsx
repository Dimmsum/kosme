"use client";

import { useEffect, useState } from "react";
import {
  User,
  Mail,
  Phone,
  Building2,
  Calendar,
  Heart,
  Edit3,
  Save,
  LogOut,
  Shield,
  Camera,
} from "lucide-react";
import { apiGet, apiPatch } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

interface ProfileRes {
  profile: {
    full_name: string | null;
    phone: string | null;
    institutions: { name: string } | null;
    role: string | null;
  };
}

export default function VolunteerProfilePage() {
  const { user, signOut } = useAuth();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [institution, setInstitution] = useState("No institution listed");

  useEffect(() => {
    apiGet<ProfileRes>("/api/profile")
      .then((res) => {
        setName(res.profile.full_name ?? "");
        setPhone(res.profile.phone ?? "");
        setInstitution(
          res.profile.institutions?.name ?? "No institution listed",
        );
      })
      .catch((err: unknown) => {
        const message =
          err instanceof Error ? err.message : "Failed to load profile.";
        setError(message);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleEditOrSave = async () => {
    if (!editing) {
      setEditing(true);
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await apiPatch("/api/profile", {
        full_name: name.trim(),
        phone: phone.trim() === "" ? null : phone.trim(),
      });
      setEditing(false);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to save profile.";
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
  };

  const initials = (name || user?.email || "VC")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="px-4 py-6 sm:px-6 md:px-8 md:py-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8">
          <h1 className="font-serif text-2xl font-light text-k-black sm:text-3xl">
            My Profile
          </h1>
          <p className="mt-1 text-sm text-k-gray-400">
            Manage your personal information and account settings.
          </p>
          {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
        </div>

        {loading && (
          <div className="mb-6 rounded-3xl border border-k-gray-200 bg-k-white px-6 py-10 text-center">
            <p className="text-sm text-k-gray-400">Loading profile...</p>
          </div>
        )}

        <div className="mb-6 flex items-center gap-5 rounded-3xl border border-k-gray-200 bg-k-white p-6">
          <div className="relative">
            <div className="h-20 w-20 rounded-full bg-gradient-to-br from-k-primary to-k-primary-light flex items-center justify-center">
              <span className="font-serif text-2xl text-white">{initials}</span>
            </div>
            <button className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-k-white bg-k-gray-100 text-k-gray-600 hover:bg-k-gray-200 transition-colors">
              <Camera size={12} />
            </button>
          </div>
          <div className="flex-1">
            <h2 className="font-serif text-xl text-k-black">
              {name || "Volunteer"}
            </h2>
            <p className="text-sm text-k-gray-400 mt-0.5">{institution}</p>
            <div className="mt-2 flex items-center gap-2">
              <span className="rounded-full bg-k-primary/10 px-3 py-0.5 text-xs font-medium text-k-primary">
                Volunteer Client
              </span>
            </div>
          </div>
        </div>

        <div className="mb-6 rounded-3xl border border-k-gray-200 bg-k-white p-6">
          <div className="mb-5 flex items-center justify-between">
            <h3 className="font-serif text-lg text-k-black">
              Personal Information
            </h3>
            <button
              onClick={handleEditOrSave}
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-full border border-k-gray-200 px-4 py-1.5 text-xs font-medium text-k-gray-600 transition-colors hover:bg-k-gray-100"
            >
              {editing ? <Save size={12} /> : <Edit3 size={12} />}
              {saving ? "Saving..." : editing ? "Save" : "Edit"}
            </button>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-k-gray-100">
                <User size={16} className="text-k-gray-600" />
              </div>
              <div className="flex-1">
                <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-k-gray-400">
                  Full Name
                </p>
                {editing ? (
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full border-b border-k-gray-200 bg-transparent py-0.5 text-sm text-k-black outline-none focus:border-k-primary"
                  />
                ) : (
                  <p className="text-sm text-k-black">{name}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-k-gray-100">
                <Mail size={16} className="text-k-gray-600" />
              </div>
              <div className="flex-1">
                <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-k-gray-400">
                  Email
                </p>
                <p className="text-sm text-k-black">
                  {user?.email ?? "No email"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-k-gray-100">
                <Phone size={16} className="text-k-gray-600" />
              </div>
              <div className="flex-1">
                <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-k-gray-400">
                  Phone
                </p>
                {editing ? (
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full border-b border-k-gray-200 bg-transparent py-0.5 text-sm text-k-black outline-none focus:border-k-primary"
                  />
                ) : (
                  <p className="text-sm text-k-black">{phone || "No phone"}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="mb-6 rounded-3xl border border-k-gray-200 bg-k-white p-6">
          <div className="mb-5">
            <h3 className="font-serif text-lg text-k-black">
              Volunteer Details
            </h3>
            <p className="text-xs text-k-gray-400 mt-0.5">
              These details are managed by the institution and cannot be edited.
            </p>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-k-gray-100">
                <Calendar size={16} className="text-k-gray-600" />
              </div>
              <div>
                <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-k-gray-400">
                  Volunteer Since
                </p>
                <p className="text-sm text-k-black">Since account creation</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-k-gray-100">
                <Building2 size={16} className="text-k-gray-600" />
              </div>
              <div>
                <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-k-gray-400">
                  Institution
                </p>
                <p className="text-sm text-k-black">{institution}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-k-gray-100">
                <Heart size={16} className="text-k-gray-600" />
              </div>
              <div>
                <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-k-gray-400">
                  Services Received
                </p>
                <p className="text-sm text-k-black">Available on dashboard</p>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-k-gray-200 bg-k-white p-6">
          <h3 className="font-serif text-lg text-k-black mb-4">Account</h3>
          <div className="flex flex-col gap-2">
            <button className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-k-gray-600 transition-colors hover:bg-k-gray-100">
              <Shield size={16} />
              Change Password
            </button>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-red-500 transition-colors hover:bg-red-50"
            >
              <LogOut size={16} />
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
