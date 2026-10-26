import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Workspace, WorkspaceMemberInfo, WorkspaceRole, Profile } from "@/types/formiq";
import fs from "fs";
import path from "path";
import os from "os";

const PRIMARY_WORKSPACE_ID = "316858ea-236c-422e-8490-0cf2b456308f";

const TEAM_STORE_PATH = process.env.VERCEL
  ? path.join(os.tmpdir(), "workspace_team.json")
  : path.join(process.cwd(), ".formiq_data", "workspace_team.json");

interface PersistedTeamState {
  workspace: {
    id: string;
    name: string;
    slug: string;
    owner_id?: string;
  };
  members: WorkspaceMemberInfo[];
  notifications?: {
    newResponse: boolean;
    aiInsight: boolean;
    threshold: boolean;
    dailySummary: boolean;
  };
}

let memoryCache: PersistedTeamState | null = null;

function loadPersistedState(): PersistedTeamState {
  if (memoryCache) return memoryCache;
  try {
    if (fs.existsSync(TEAM_STORE_PATH)) {
      const raw = fs.readFileSync(TEAM_STORE_PATH, "utf8");
      memoryCache = JSON.parse(raw);
      return memoryCache!;
    }
  } catch (err) {
    console.warn("Could not read workspace team store, using memory default:", err);
  }
  const defaultState: PersistedTeamState = {
    workspace: {
      id: PRIMARY_WORKSPACE_ID,
      name: "FormIQ Main Workspace",
      slug: "formiq-main",
    },
    members: [],
    notifications: {
      newResponse: true,
      aiInsight: true,
      threshold: true,
      dailySummary: false,
    },
  };
  memoryCache = defaultState;
  return defaultState;
}

function savePersistedState(state: PersistedTeamState) {
  memoryCache = state;
  try {
    const dir = path.dirname(TEAM_STORE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(TEAM_STORE_PATH, JSON.stringify(state, null, 2), "utf8");
  } catch (err) {
    console.warn("Could not persist workspace team store to disk, cached in memory:", err);
  }
}

/**
 * Returns current workspace and member list for the current session.
 * Guarantees zero mock data (no Alex Vance / Sarah Chen / Marcus Brody / Elena Rostova).
 */
export async function getWorkspaceAndMembers(): Promise<{
  workspace: Workspace;
  currentUser: { id: string; name: string; email: string; role: WorkspaceRole };
  members: WorkspaceMemberInfo[];
  notifications: {
    newResponse: boolean;
    aiInsight: boolean;
    threshold: boolean;
    dailySummary: boolean;
  };
}> {
  let user: any = null;
  let supabase: any = null;

  try {
    supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    user = data?.user || null;
  } catch (err) {
    console.warn("Could not load user auth in getWorkspaceAndMembers:", err);
  }

  const persisted = loadPersistedState();

  // Determine current user
  const currentUserId = user?.id || "usr-current";
  const currentUserEmail = user?.email || "user@formiq.app";
  const currentUserName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    (user?.email ? user.email.split("@")[0] : "FormIQ Owner");

  let activeWorkspaceId = persisted.workspace.id || PRIMARY_WORKSPACE_ID;
  let workspaceName = persisted.workspace.name || "FormIQ Main Workspace";
  let workspaceSlug = persisted.workspace.slug || "formiq-main";

  // Check Supabase DB for user's actual workspace
  if (supabase && user) {
    try {
      const { data: userMemberships } = await supabase
        .from("workspace_members")
        .select("workspace_id, role, workspaces(id, name, slug, owner_id)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (userMemberships && userMemberships.length > 0) {
        const primary = userMemberships[0];
        if (primary.workspaces) {
          activeWorkspaceId = (primary.workspaces as any).id;
          workspaceName = (primary.workspaces as any).name;
          workspaceSlug = (primary.workspaces as any).slug;
        } else if (primary.workspace_id) {
          activeWorkspaceId = primary.workspace_id;
        }
      } else {
        const { data: ownedWs } = await supabase
          .from("workspaces")
          .select("id, name, slug")
          .eq("owner_id", user.id)
          .limit(1)
          .maybeSingle();

        if (ownedWs) {
          activeWorkspaceId = ownedWs.id;
          workspaceName = ownedWs.name;
          workspaceSlug = ownedWs.slug;
          await supabase.from("workspace_members").insert({
            workspace_id: ownedWs.id,
            user_id: user.id,
            role: "Owner",
          });
        }
      }
    } catch {
      // Fallback to primary workspace
    }
  } else if (supabase) {
    try {
      const { data: dbWs } = await supabase
        .from("workspaces")
        .select("*")
        .eq("id", PRIMARY_WORKSPACE_ID)
        .maybeSingle();

      if (dbWs) {
        workspaceName = dbWs.name;
        workspaceSlug = dbWs.slug;
      }
    } catch {
      // Ignore and fallback to persisted
    }
  }

  // Load members from Supabase workspace_members
  const membersMap = new Map<string, WorkspaceMemberInfo>();

  if (supabase) {
    try {
      const { data: dbMembers } = await supabase
        .from("workspace_members")
        .select("id, user_id, role, created_at, profiles(name, email)")
        .eq("workspace_id", activeWorkspaceId);

      if (Array.isArray(dbMembers) && dbMembers.length > 0) {
        for (const m of dbMembers) {
          const prof = (m as any).profiles;
          const email = prof?.email || "member@formiq.app";
          const name = prof?.name || email.split("@")[0] || "Team Member";
        membersMap.set(m.id || m.user_id, {
          id: m.id || m.user_id,
          user_id: m.user_id,
          name,
          email,
          role: (m.role as WorkspaceRole) || "Editor",
          status: "Active",
          created_at: m.created_at || new Date().toISOString(),
          isCurrentUser: m.user_id === currentUserId || email.toLowerCase() === currentUserEmail.toLowerCase(),
        });
      }
    }
  } catch {
    // Supabase membership lookup fallback
  }
}

  // Merge in persisted invited/custom members
  for (const pm of persisted.members) {
    // Exclude any legacy mock names
    if (
      pm.name.toLowerCase().includes("alex vance") ||
      pm.email.toLowerCase().includes("alex@") ||
      pm.name.toLowerCase().includes("sarah chen") ||
      pm.name.toLowerCase().includes("marcus brody") ||
      pm.name.toLowerCase().includes("elena rostova")
    ) {
      continue;
    }

    if (!membersMap.has(pm.id) && !membersMap.has(pm.email)) {
      membersMap.set(pm.id, {
        ...pm,
        isCurrentUser:
          pm.user_id === currentUserId ||
          pm.email.toLowerCase() === currentUserEmail.toLowerCase(),
      });
    }
  }

  // Ensure current user is present as Owner
  let hasCurrentUser = false;
  for (const m of membersMap.values()) {
    if (m.isCurrentUser || m.email.toLowerCase() === currentUserEmail.toLowerCase()) {
      hasCurrentUser = true;
      m.isCurrentUser = true;
      m.name = currentUserName;
      m.email = currentUserEmail;
      break;
    }
  }

  if (!hasCurrentUser) {
    const currentMemberId = `wm-${currentUserId.slice(0, 8)}`;
    const currentMember: WorkspaceMemberInfo = {
      id: currentMemberId,
      user_id: currentUserId,
      name: currentUserName,
      email: currentUserEmail,
      role: "Owner",
      status: "Active",
      created_at: user?.created_at || new Date().toISOString(),
      isCurrentUser: true,
    };
    membersMap.set(currentMemberId, currentMember);
  }

  const memberList = Array.from(membersMap.values());

  // Sort so current user is first, then Owners, then others
  memberList.sort((a, b) => {
    if (a.isCurrentUser) return -1;
    if (b.isCurrentUser) return 1;
    if (a.role === "Owner" && b.role !== "Owner") return -1;
    if (b.role === "Owner" && a.role !== "Owner") return 1;
    return a.name.localeCompare(b.name);
  });

  const currentUserRole =
    memberList.find((m) => m.isCurrentUser)?.role || "Owner";

  return {
    workspace: {
      id: activeWorkspaceId,
      name: workspaceName,
      slug: workspaceSlug,
      owner_id: currentUserId,
      created_at: new Date().toISOString(),
      role: currentUserRole,
    },
    currentUser: {
      id: currentUserId,
      name: currentUserName,
      email: currentUserEmail,
      role: currentUserRole,
    },
    members: memberList,
    notifications: persisted.notifications || {
      newResponse: true,
      aiInsight: true,
      threshold: true,
      dailySummary: false,
    },
  };
}

/**
 * Updates workspace metadata (name, slug, notifications).
 */
export async function updateWorkspaceSettings(updates: {
  name?: string;
  slug?: string;
  notifications?: {
    newResponse?: boolean;
    aiInsight?: boolean;
    threshold?: boolean;
    dailySummary?: boolean;
  };
}) {
  const persisted = loadPersistedState();

  if (updates.name) persisted.workspace.name = updates.name.trim();
  if (updates.slug) persisted.workspace.slug = updates.slug.trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-");
  if (updates.notifications) {
    const current = persisted.notifications || {
      newResponse: true,
      aiInsight: true,
      threshold: true,
      dailySummary: false,
    };
    persisted.notifications = {
      newResponse:
        updates.notifications.newResponse !== undefined
          ? !!updates.notifications.newResponse
          : current.newResponse,
      aiInsight:
        updates.notifications.aiInsight !== undefined
          ? !!updates.notifications.aiInsight
          : current.aiInsight,
      threshold:
        updates.notifications.threshold !== undefined
          ? !!updates.notifications.threshold
          : current.threshold,
      dailySummary:
        updates.notifications.dailySummary !== undefined
          ? !!updates.notifications.dailySummary
          : current.dailySummary,
    };
  }

  savePersistedState(persisted);

  // Attempt sync with Supabase
  try {
    const supabase = await createClient();
    await supabase
      .from("workspaces")
      .update({
        name: persisted.workspace.name,
        slug: persisted.workspace.slug,
      })
      .eq("id", PRIMARY_WORKSPACE_ID);
  } catch (err) {
    console.warn("Could not sync workspace update to Supabase:", err);
  }

  return persisted;
}

/**
 * Invites or adds a team member to the workspace.
 */
export async function inviteWorkspaceMember(
  email: string,
  role: WorkspaceRole,
  name?: string
): Promise<WorkspaceMemberInfo> {
  const cleanEmail = email.trim().toLowerCase();
  const cleanName = name?.trim() || cleanEmail.split("@")[0].replace(/[._-]/g, " ");
  // Capitalize name
  const formattedName = cleanName
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

  const memberId = `mem-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const newMember: WorkspaceMemberInfo = {
    id: memberId,
    user_id: `usr-${Math.random().toString(36).substring(2, 10)}`,
    name: formattedName,
    email: cleanEmail,
    role,
    status: "Pending",
    created_at: new Date().toISOString(),
    isCurrentUser: false,
  };

  const persisted = loadPersistedState();
  // Check if member already exists
  const existingIdx = persisted.members.findIndex(
    (m) => m.email.toLowerCase() === cleanEmail
  );

  if (existingIdx >= 0) {
    persisted.members[existingIdx].role = role;
    persisted.members[existingIdx].name = formattedName;
    savePersistedState(persisted);
    return persisted.members[existingIdx];
  }

  persisted.members.push(newMember);
  savePersistedState(persisted);

  // Also attempt Supabase insert if member user exists
  try {
    const supabase = await createClient();
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", cleanEmail)
      .maybeSingle();

    if (existingProfile) {
      await supabase.from("workspace_members").upsert({
        workspace_id: PRIMARY_WORKSPACE_ID,
        user_id: existingProfile.id,
        role,
      });
    }
  } catch (err) {
    console.warn("Could not sync member invite to Supabase:", err);
  }

  return newMember;
}

/**
 * Updates a member's role (Owner, Editor, Analyst, Viewer).
 */
export async function updateMemberRole(
  memberId: string,
  newRole: WorkspaceRole
): Promise<WorkspaceMemberInfo | null> {
  const persisted = loadPersistedState();
  const member = persisted.members.find((m) => m.id === memberId || m.user_id === memberId);

  if (member) {
    member.role = newRole;
    savePersistedState(persisted);

    // Sync to Supabase
    try {
      const supabase = await createClient();
      await supabase
        .from("workspace_members")
        .update({ role: newRole })
        .eq("workspace_id", PRIMARY_WORKSPACE_ID)
        .eq("user_id", member.user_id);
    } catch {
      // Ignored
    }

    return member;
  }

  return null;
}

/**
 * Removes a member from the workspace.
 */
export async function removeMember(memberId: string): Promise<boolean> {
  const persisted = loadPersistedState();
  const initialCount = persisted.members.length;
  persisted.members = persisted.members.filter(
    (m) => m.id !== memberId && m.user_id !== memberId
  );

  if (persisted.members.length !== initialCount) {
    savePersistedState(persisted);

    // Sync deletion to Supabase
    try {
      const supabase = await createClient();
      await supabase
        .from("workspace_members")
        .delete()
        .eq("workspace_id", PRIMARY_WORKSPACE_ID)
        .eq("user_id", memberId);
    } catch {
      // Ignored
    }

    return true;
  }

  return false;
}
