"use client";

import React, { useState, useEffect } from "react";
import {
  Shield,
  Bell,
  Users,
  Key,
  Check,
  Save,
  UserPlus,
  Trash2,
  Copy,
  CheckCheck,
  AlertCircle,
  Loader2,
  Mail,
  UserCheck,
  Info,
  ChevronDown,
} from "lucide-react";
import AppHeader from "@/components/app/app-header";
import { WorkspaceMemberInfo, WorkspaceRole } from "@/types/formiq";

const ROLE_PERMISSIONS: Record<WorkspaceRole, { description: string; badgeClass: string }> = {
  Owner: {
    description: "Full Access: Create/edit forms, responses, RLS, deletions & team management",
    badgeClass: "bg-[#090A0A] text-[#F4F2EC] font-bold border border-[#090A0A]",
  },
  Editor: {
    description: "Build & Edit: Create forms, configure questions, validation & conditional logic",
    badgeClass: "bg-[#EEF2FF] text-[#315CFF] font-semibold border border-[#C7D2FE]",
  },
  Analyst: {
    description: "Insights & Analytics: View responses, run AI intelligence & export data",
    badgeClass: "bg-[#F3E8FF] text-[#7E22CE] font-semibold border border-[#E9D5FF]",
  },
  Viewer: {
    description: "Read-Only: View published forms and summary response metrics only",
    badgeClass: "bg-[#E8E5DD] text-[#3A3D3A] font-normal border border-[#D5D2C7]",
  },
};

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [workspaceId, setWorkspaceId] = useState("");
  const [workspaceName, setWorkspaceName] = useState("");
  const [slug, setSlug] = useState("");
  const [members, setMembers] = useState<WorkspaceMemberInfo[]>([]);
  const [currentUserRole, setCurrentUserRole] = useState<WorkspaceRole>("Owner");

  // Notifications
  const [notifNewResponse, setNotifNewResponse] = useState(true);
  const [notifDailySummary, setNotifDailySummary] = useState(false);
  const [notifAiInsight, setNotifAiInsight] = useState(true);
  const [notifThreshold, setNotifThreshold] = useState(true);

  // UI state
  const [saved, setSaved] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Invite Modal
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState<WorkspaceRole>("Editor");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

  // Remove Modal
  const [memberToRemove, setMemberToRemove] = useState<WorkspaceMemberInfo | null>(null);
  const [removeLoading, setRemoveLoading] = useState(false);

  // Fetch workspace and team data on mount
  const loadWorkspaceData = async () => {
    try {
      setErrorMsg(null);
      const res = await fetch("/api/workspace");
      if (!res.ok) throw new Error("Failed to load workspace data");
      const data = await res.json();

      setWorkspaceId(data.workspace?.id || "");
      setWorkspaceName(data.workspace?.name || "FormIQ Workspace");
      setSlug(data.workspace?.slug || "formiq-workspace");
      setMembers(data.members || []);
      setCurrentUserRole(data.currentUser?.role || "Owner");

      if (data.notifications) {
        setNotifNewResponse(!!data.notifications.newResponse);
        setNotifAiInsight(!!data.notifications.aiInsight);
        setNotifThreshold(!!data.notifications.threshold);
        setNotifDailySummary(!!data.notifications.dailySummary);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Could not connect to workspace service");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWorkspaceData();
  }, []);

  const handleCopyId = () => {
    if (!workspaceId) return;
    navigator.clipboard.writeText(workspaceId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleSaveSettings = async () => {
    setSaveLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/workspace", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: workspaceName,
          slug,
          notifications: {
            newResponse: notifNewResponse,
            aiInsight: notifAiInsight,
            threshold: notifThreshold,
            dailySummary: notifDailySummary,
          },
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to update workspace settings");
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSaveLoading(false);
    }
  };

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail || !inviteEmail.includes("@")) {
      setInviteError("Please provide a valid email address");
      return;
    }

    setInviteLoading(true);
    setInviteError(null);

    try {
      const res = await fetch("/api/workspace/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: inviteEmail.trim(),
          name: inviteName.trim() || undefined,
          role: inviteRole,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to invite member");
      }

      setIsInviteOpen(false);
      setInviteEmail("");
      setInviteName("");
      setInviteRole("Editor");
      await loadWorkspaceData();
    } catch (err: any) {
      setInviteError(err.message);
    } finally {
      setInviteLoading(false);
    }
  };

  const handleRoleChange = async (memberId: string, newRole: WorkspaceRole) => {
    try {
      const res = await fetch(`/api/workspace/members/${memberId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to update role");
      }

      setMembers((prev) =>
        prev.map((m) => (m.id === memberId || m.user_id === memberId ? { ...m, role: newRole } : m))
      );
    } catch (err: any) {
      alert(err.message || "Failed to change role");
    }
  };

  const handleConfirmRemove = async () => {
    if (!memberToRemove) return;
    setRemoveLoading(true);
    try {
      const res = await fetch(`/api/workspace/members/${memberToRemove.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to remove member");
      }

      setMemberToRemove(null);
      setMembers((prev) => prev.filter((m) => m.id !== memberToRemove.id));
    } catch (err: any) {
      alert(err.message || "Failed to remove member");
    } finally {
      setRemoveLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-[#F8F7F4]">
      <AppHeader
        title="Settings"
        subtitle="Manage workspace identity, team role-based access control, and notification triggers."
      />

      <div className="p-8 space-y-10 max-w-5xl w-full mx-auto font-sans text-xs">
        {errorMsg && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 flex items-center gap-3">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
            <span className="font-mono text-xs">{errorMsg}</span>
          </div>
        )}

        {/* Workspace Identity */}
        <div className="border border-[#E5E3DB] bg-[#FAFAF7] p-6 space-y-5">
          <div className="border-b border-[#E5E3DB] pb-3 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-[#090A0A]">Workspace Identity</h3>
              <p className="text-[11px] text-[#5E605E] mt-0.5">
                Primary namespace for forms, datasets, and respondent submissions.
              </p>
            </div>
            <button
              onClick={handleCopyId}
              title="Click to copy Workspace ID"
              className="flex items-center gap-1.5 px-2.5 py-1 bg-white hover:bg-[#F2EFE9] border border-[#E5E3DB] font-mono text-[10px] text-[#5E605E] transition-colors"
            >
              {copiedId ? (
                <>
                  <CheckCheck className="w-3 h-3 text-emerald-600" />
                  <span className="text-emerald-700 font-bold">COPIED</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3 text-[#8A8A82]" />
                  <span>ID: {workspaceId ? `${workspaceId.slice(0, 13)}...` : "Loading"}</span>
                </>
              )}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-[#090A0A] mb-1">Workspace Name</label>
              <input
                type="text"
                disabled={loading || currentUserRole === "Viewer" || currentUserRole === "Analyst"}
                value={workspaceName}
                onChange={(e) => setWorkspaceName(e.target.value)}
                placeholder="e.g. Acme Product Research"
                className="w-full p-2.5 border border-[#E5E3DB] bg-white text-[#090A0A] font-medium focus:outline-none focus:border-[#315CFF] disabled:bg-gray-100 disabled:text-gray-500"
              />
            </div>

            <div>
              <label className="block font-bold text-[#090A0A] mb-1">Workspace Slug</label>
              <input
                type="text"
                disabled={loading || currentUserRole === "Viewer" || currentUserRole === "Analyst"}
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="e.g. acme-product-research"
                className="w-full p-2.5 border border-[#E5E3DB] bg-white text-[#090A0A] font-mono focus:outline-none focus:border-[#315CFF] disabled:bg-gray-100 disabled:text-gray-500"
              />
            </div>
          </div>
        </div>

        {/* Team & RBAC Permissions */}
        <div className="border border-[#E5E3DB] bg-[#FAFAF7] p-6 space-y-5">
          <div className="border-b border-[#E5E3DB] pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-[#090A0A]">Team & Role-Based Access Control</h3>
                <span className="px-2 py-0.5 bg-[#E8E5DD] font-mono text-[10px] text-[#222422] rounded-full">
                  {members.length} {members.length === 1 ? "Member" : "Members"}
                </span>
              </div>
              <p className="text-[11px] text-[#5E605E] mt-0.5">
                Roles enforced via Postgres Row Level Security (RLS) and server authentication policies.
              </p>
            </div>

            {currentUserRole === "Owner" && (
              <button
                onClick={() => setIsInviteOpen(true)}
                className="px-3.5 py-2 border border-[#090A0A] bg-[#090A0A] hover:bg-[#222422] text-[#F4F2EC] font-mono text-[11px] uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors self-start sm:self-auto"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>+ Invite Member</span>
              </button>
            )}
          </div>

          {/* Members Table */}
          <div className="border border-[#E5E3DB] bg-white overflow-hidden shadow-sm">
            {loading ? (
              <div className="py-12 flex flex-col items-center justify-center text-[#8A8A82] gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="font-mono text-xs">Loading team roster...</span>
              </div>
            ) : members.length === 0 ? (
              <div className="py-8 text-center text-[#8A8A82] font-mono text-xs">
                No team members found.
              </div>
            ) : (
              <table className="w-full text-left border-collapse font-sans text-xs">
                <thead>
                  <tr className="border-b border-[#E5E3DB] bg-[#F2EFE9] font-mono text-[10px] text-[#5E605E] uppercase tracking-wider">
                    <th className="py-2.5 px-4 font-semibold">User</th>
                    <th className="py-2.5 px-4 font-semibold">Role</th>
                    <th className="py-2.5 px-4 font-semibold hidden md:table-cell">Permissions</th>
                    <th className="py-2.5 px-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E3DB]">
                  {members.map((m) => {
                    const roleInfo = ROLE_PERMISSIONS[m.role] || ROLE_PERMISSIONS.Viewer;
                    return (
                      <tr key={m.id} className="hover:bg-[#F8F7F4] transition-colors">
                        {/* User Identity */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-[#E5E3DB] flex items-center justify-center font-bold text-xs text-[#090A0A] uppercase shrink-0">
                              {m.name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")
                                .slice(0, 2) || "U"}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-[#090A0A]">{m.name}</span>
                                {m.isCurrentUser && (
                                  <span className="px-1.5 py-0.2 bg-emerald-100 border border-emerald-300 text-emerald-800 text-[10px] font-mono font-bold">
                                    YOU
                                  </span>
                                )}
                                {m.status === "Pending" && (
                                  <span className="px-1.5 py-0.2 bg-amber-100 border border-amber-300 text-amber-800 text-[10px] font-mono">
                                    INVITED
                                  </span>
                                )}
                              </div>
                              <div className="font-mono text-[11px] text-[#8A8A82] flex items-center gap-1 mt-0.5">
                                <Mail className="w-3 h-3 text-[#A8A8A0]" />
                                <span>{m.email}</span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Role */}
                        <td className="py-3.5 px-4 font-mono text-[11px]">
                          {currentUserRole === "Owner" && !m.isCurrentUser ? (
                            <select
                              value={m.role}
                              onChange={(e) => handleRoleChange(m.id, e.target.value as WorkspaceRole)}
                              className="px-2 py-1 bg-white border border-[#E5E3DB] text-[#090A0A] font-bold text-[11px] focus:outline-none focus:border-[#315CFF] cursor-pointer"
                            >
                              <option value="Owner">Owner</option>
                              <option value="Editor">Editor</option>
                              <option value="Analyst">Analyst</option>
                              <option value="Viewer">Viewer</option>
                            </select>
                          ) : (
                            <span className={`px-2.5 py-1 uppercase text-[10px] tracking-wider ${roleInfo.badgeClass}`}>
                              {m.role}
                            </span>
                          )}
                        </td>

                        {/* Permissions Description */}
                        <td className="py-3.5 px-4 text-[#5E605E] font-mono text-[11px] hidden md:table-cell max-w-xs">
                          {roleInfo.description}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right">
                          {currentUserRole === "Owner" && !m.isCurrentUser ? (
                            <button
                              onClick={() => setMemberToRemove(m)}
                              title="Remove member"
                              className="p-1.5 text-[#8A8A82] hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          ) : m.isCurrentUser ? (
                            <span className="font-mono text-[10px] text-[#8A8A82] uppercase">
                              Active
                            </span>
                          ) : (
                            <span className="font-mono text-[10px] text-[#8A8A82]">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* RBAC Matrix Explainer */}
          <div className="p-4 bg-white border border-[#E5E3DB] space-y-3">
            <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-[#090A0A] font-bold">
              <Shield className="w-3.5 h-3.5 text-[#315CFF]" />
              <span>Role Permissions Matrix</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-[11px]">
              <div className="p-2.5 bg-[#F8F7F4] border border-[#E5E3DB]">
                <div className="font-bold text-[#090A0A] uppercase mb-1">Owner</div>
                <div className="text-[10px] text-[#5E605E]">Forms, RLS, DB Deletion, Team Invites, Workspace Settings</div>
              </div>
              <div className="p-2.5 bg-[#F8F7F4] border border-[#E5E3DB]">
                <div className="font-bold text-[#315CFF] uppercase mb-1">Editor</div>
                <div className="text-[10px] text-[#5E605E]">Create forms, update questions, conditional logic & publish</div>
              </div>
              <div className="p-2.5 bg-[#F8F7F4] border border-[#E5E3DB]">
                <div className="font-bold text-[#7E22CE] uppercase mb-1">Analyst</div>
                <div className="text-[10px] text-[#5E605E]">View responses, trigger Gemini AI insights & export data</div>
              </div>
              <div className="p-2.5 bg-[#F8F7F4] border border-[#E5E3DB]">
                <div className="font-bold text-[#5E605E] uppercase mb-1">Viewer</div>
                <div className="text-[10px] text-[#5E605E]">Read-only access to published dashboard metrics</div>
              </div>
            </div>
          </div>
        </div>

        {/* Configurable Notifications */}
        <div className="border border-[#E5E3DB] bg-[#FAFAF7] p-6 space-y-5">
          <div className="border-b border-[#E5E3DB] pb-3">
            <h3 className="font-bold text-sm text-[#090A0A]">Notification Triggers</h3>
            <p className="text-[11px] text-[#5E605E] mt-0.5">
              Automated webhook and email dispatch triggers for incoming responses and AI insights.
            </p>
          </div>

          <div className="space-y-3 font-mono text-xs">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={notifNewResponse}
                onChange={(e) => setNotifNewResponse(e.target.checked)}
                className="accent-[#315CFF] w-4 h-4 cursor-pointer"
              />
              <span className="text-[#090A0A]">
                <strong>New Response Submitted</strong> — Realtime alert on each candidate submission
              </span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={notifAiInsight}
                onChange={(e) => setNotifAiInsight(e.target.checked)}
                className="accent-[#315CFF] w-4 h-4 cursor-pointer"
              />
              <span className="text-[#090A0A]">
                <strong>Critical AI Pattern Detected</strong> — Alert when severe cohort bottleneck or drop-off emerges
              </span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={notifThreshold}
                onChange={(e) => setNotifThreshold(e.target.checked)}
                className="accent-[#315CFF] w-4 h-4 cursor-pointer"
              />
              <span className="text-[#090A0A]">
                <strong>Volume Milestone</strong> — Alert when form crosses 10, 50, 100, 250 responses
              </span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={notifDailySummary}
                onChange={(e) => setNotifDailySummary(e.target.checked)}
                className="accent-[#315CFF] w-4 h-4 cursor-pointer"
              />
              <span className="text-[#090A0A]">
                <strong>Daily Response Digest</strong> — 8:00 AM summary of 24h intake velocity
              </span>
            </label>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-2">
          <button
            onClick={handleSaveSettings}
            disabled={saveLoading || loading}
            className="px-6 py-2.5 bg-[#090A0A] hover:bg-[#222422] disabled:bg-gray-400 text-[#F4F2EC] font-mono text-xs uppercase tracking-wider font-bold transition-colors flex items-center gap-2"
          >
            {saveLoading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Saving...</span>
              </>
            ) : saved ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Saved Settings</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                <span>Save Changes</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Invite Member Modal */}
      {isInviteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white border border-[#090A0A] max-w-md w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="border-b border-[#E5E3DB] pb-3 flex items-center justify-between">
              <div>
                <h4 className="font-bold text-sm text-[#090A0A]">Invite Team Member</h4>
                <p className="text-[11px] text-[#5E605E] mt-0.5">
                  Grant collaborator access to this FormIQ workspace.
                </p>
              </div>
              <button
                onClick={() => setIsInviteOpen(false)}
                className="text-[#8A8A82] hover:text-[#090A0A] font-mono text-xs"
              >
                ✕
              </button>
            </div>

            {inviteError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-mono">
                {inviteError}
              </div>
            )}

            <form onSubmit={handleInviteSubmit} className="space-y-4 font-sans text-xs">
              <div>
                <label className="block font-bold text-[#090A0A] mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="colleague@company.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full p-2.5 border border-[#E5E3DB] bg-white text-[#090A0A] focus:outline-none focus:border-[#315CFF]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#090A0A] mb-1">Full Name (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Maya Lin"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  className="w-full p-2.5 border border-[#E5E3DB] bg-white text-[#090A0A] focus:outline-none focus:border-[#315CFF]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#090A0A] mb-1">Assign Role *</label>
                <div className="space-y-2">
                  {(["Editor", "Analyst", "Viewer", "Owner"] as WorkspaceRole[]).map((r) => (
                    <label
                      key={r}
                      className={`flex items-start gap-3 p-2.5 border cursor-pointer transition-colors ${
                        inviteRole === r
                          ? "border-[#315CFF] bg-[#EEF2FF]/40"
                          : "border-[#E5E3DB] hover:bg-[#FAFAF7]"
                      }`}
                    >
                      <input
                        type="radio"
                        name="inviteRole"
                        value={r}
                        checked={inviteRole === r}
                        onChange={() => setInviteRole(r)}
                        className="mt-0.5 accent-[#315CFF]"
                      />
                      <div>
                        <div className="font-bold text-[#090A0A] flex items-center gap-2">
                          <span>{r}</span>
                          {r === "Editor" && (
                            <span className="text-[10px] text-[#315CFF] font-mono font-normal">
                              (Recommended)
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-[#5E605E]">
                          {ROLE_PERMISSIONS[r].description}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#E5E3DB]">
                <button
                  type="button"
                  onClick={() => setIsInviteOpen(false)}
                  className="px-4 py-2 border border-[#E5E3DB] bg-white hover:bg-[#FAFAF7] font-mono text-xs uppercase"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={inviteLoading}
                  className="px-5 py-2 bg-[#090A0A] hover:bg-[#222422] text-[#F4F2EC] font-mono text-xs uppercase font-bold flex items-center gap-1.5"
                >
                  {inviteLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Sending...</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Send Invite</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Remove Member Confirmation Modal */}
      {memberToRemove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white border border-[#090A0A] max-w-sm w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-red-600">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <h4 className="font-bold text-sm text-[#090A0A]">Revoke Workspace Access</h4>
            </div>

            <p className="text-xs text-[#5E605E] leading-relaxed">
              Are you sure you want to remove <strong>{memberToRemove.name}</strong> (
              <span className="font-mono text-[11px]">{memberToRemove.email}</span>) from this workspace? They will immediately lose access to all forms and response data.
            </p>

            <div className="flex justify-end gap-2 pt-3 border-t border-[#E5E3DB]">
              <button
                type="button"
                onClick={() => setMemberToRemove(null)}
                className="px-4 py-2 border border-[#E5E3DB] bg-white hover:bg-[#FAFAF7] font-mono text-xs uppercase"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRemove}
                disabled={removeLoading}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white font-mono text-xs uppercase font-bold flex items-center gap-1.5"
              >
                {removeLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Removing...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Revoke Access</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
