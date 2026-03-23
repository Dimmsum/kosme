"use client";

import { useState } from "react";
import {
  User,
  Mail,
  Phone,
  GraduationCap,
  Building2,
  BookOpen,
  Edit3,
  Save,
  LogOut,
  Shield,
  Camera,
} from "lucide-react";

const profileData = {
  name: "Maya Thompson",
  email: "maya.thompson@student.edu",
  phone: "+44 7700 900123",
  institution: "London College of Beauty",
  programme: "Level 3 Diploma in Cosmetology",
  year: "2025-26",
  studentId: "STU-2025-0847",
  role: "Student",
};

export default function ProfilePage() {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(profileData.name);
  const [email, setEmail] = useState(profileData.email);
  const [phone, setPhone] = useState(profileData.phone);

  return (
    <div className="px-4 py-6 sm:px-6 md:px-8 md:py-8">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-serif text-2xl font-light text-k-black sm:text-3xl">
            My Profile
          </h1>
          <p className="mt-1 text-sm text-k-gray-400">
            Manage your personal information and account settings.
          </p>
        </div>

        {/* Avatar & name card */}
        <div className="mb-6 flex items-center gap-5 rounded-3xl border border-k-gray-200 bg-k-white p-6">
          <div className="relative">
            <div className="h-20 w-20 rounded-full bg-gradient-to-br from-k-primary to-k-primary-light flex items-center justify-center">
              <span className="font-serif text-2xl text-white">MT</span>
            </div>
            <button className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-k-white bg-k-gray-100 text-k-gray-600 hover:bg-k-gray-200 transition-colors">
              <Camera size={12} />
            </button>
          </div>
          <div className="flex-1">
            <h2 className="font-serif text-xl text-k-black">{profileData.name}</h2>
            <p className="text-sm text-k-gray-400 mt-0.5">{profileData.programme}</p>
            <div className="mt-2 flex items-center gap-2">
              <span className="rounded-full bg-k-primary/10 px-3 py-0.5 text-xs font-medium text-k-primary">
                {profileData.role}
              </span>
              <span className="rounded-full bg-k-gray-100 px-3 py-0.5 text-xs font-medium text-k-gray-600">
                {profileData.studentId}
              </span>
            </div>
          </div>
        </div>

        {/* Personal information */}
        <div className="mb-6 rounded-3xl border border-k-gray-200 bg-k-white p-6">
          <div className="mb-5 flex items-center justify-between">
            <h3 className="font-serif text-lg text-k-black">Personal Information</h3>
            <button
              onClick={() => setEditing(!editing)}
              className="inline-flex items-center gap-1.5 rounded-full border border-k-gray-200 px-4 py-1.5 text-xs font-medium text-k-gray-600 transition-colors hover:bg-k-gray-100"
            >
              {editing ? <Save size={12} /> : <Edit3 size={12} />}
              {editing ? "Save" : "Edit"}
            </button>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-k-gray-100">
                <User size={16} className="text-k-gray-600" />
              </div>
              <div className="flex-1">
                <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-k-gray-400">Full Name</p>
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
                <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-k-gray-400">Email</p>
                {editing ? (
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full border-b border-k-gray-200 bg-transparent py-0.5 text-sm text-k-black outline-none focus:border-k-primary"
                  />
                ) : (
                  <p className="text-sm text-k-black">{email}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-k-gray-100">
                <Phone size={16} className="text-k-gray-600" />
              </div>
              <div className="flex-1">
                <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-k-gray-400">Phone</p>
                {editing ? (
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full border-b border-k-gray-200 bg-transparent py-0.5 text-sm text-k-black outline-none focus:border-k-primary"
                  />
                ) : (
                  <p className="text-sm text-k-black">{phone}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Programme information (read-only) */}
        <div className="mb-6 rounded-3xl border border-k-gray-200 bg-k-white p-6">
          <div className="mb-5">
            <h3 className="font-serif text-lg text-k-black">Programme Details</h3>
            <p className="text-xs text-k-gray-400 mt-0.5">
              These details are managed by your institution and cannot be edited.
            </p>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-k-gray-100">
                <Building2 size={16} className="text-k-gray-600" />
              </div>
              <div>
                <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-k-gray-400">Institution</p>
                <p className="text-sm text-k-black">{profileData.institution}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-k-gray-100">
                <BookOpen size={16} className="text-k-gray-600" />
              </div>
              <div>
                <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-k-gray-400">Programme</p>
                <p className="text-sm text-k-black">{profileData.programme}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-k-gray-100">
                <GraduationCap size={16} className="text-k-gray-600" />
              </div>
              <div>
                <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-k-gray-400">Academic Year</p>
                <p className="text-sm text-k-black">{profileData.year}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Account actions */}
        <div className="rounded-3xl border border-k-gray-200 bg-k-white p-6">
          <h3 className="font-serif text-lg text-k-black mb-4">Account</h3>
          <div className="flex flex-col gap-2">
            <button className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-k-gray-600 transition-colors hover:bg-k-gray-100">
              <Shield size={16} />
              Change Password
            </button>
            <button className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-red-500 transition-colors hover:bg-red-50">
              <LogOut size={16} />
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
