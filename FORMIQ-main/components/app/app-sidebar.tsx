"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  Layers,
  Inbox,
  BarChart3,
  Lightbulb,
  Settings,
  Plus,
  User,
  ExternalLink,
  LogOut,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import Logo from "@/components/ui/logo";

export default function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [userName, setUserName] = useState("FormIQ Member");
  const [userEmail, setUserEmail] = useState("");
  const [workspaceName, setWorkspaceName] = useState("FormIQ Workspace");

  useEffect(() => {
    // 1. Fetch real workspace and user info from API
    fetch("/api/workspace")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.workspace?.name) {
          setWorkspaceName(data.workspace.name);
        }
        if (data?.currentUser?.name) {
          setUserName(data.currentUser.name);
        }
        if (data?.currentUser?.email) {
          setUserEmail(data.currentUser.email);
        }
      })
      .catch(() => {});

    // 2. Also check Supabase auth directly
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserEmail(user.email || "");
        const name =
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          (user.email ? user.email.split("@")[0] : "User");
        setUserName(name);
      }
    });
  }, []);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
    router.refresh();
  };

  const userInitials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "U";

  const formIdFromPath = pathname.match(/\/app\/forms\/([^\/]+)/)?.[1];
  const [firstFormId, setFirstFormId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/forms")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setFirstFormId(data[0].id);
        }
      })
      .catch(() => {});
  }, [pathname]);

  const activeTargetId = (formIdFromPath && formIdFromPath !== "new") ? formIdFromPath : firstFormId;

  const navigation = [
    { name: "Dashboard", href: "/app", icon: LayoutDashboard },
    { name: "Forms", href: "/app/forms", icon: FileText },
    { name: "Templates", href: "/app/templates", icon: Layers },
    {
      name: "Responses",
      href: activeTargetId ? `/app/forms/${activeTargetId}/responses` : "/app/forms",
      icon: Inbox,
    },
    {
      name: "Analytics",
      href: activeTargetId ? `/app/forms/${activeTargetId}/analytics` : "/app/forms",
      icon: BarChart3,
    },
    {
      name: "Intelligence",
      href: activeTargetId ? `/app/forms/${activeTargetId}/insights` : "/app/forms",
      icon: Lightbulb,
    },
    { name: "Settings", href: "/app/settings", icon: Settings },
  ];

  return (
    <aside className="w-64 border-r border-[#E5E3DB] bg-[#FAFAF7] flex flex-col justify-between shrink-0 h-screen sticky top-0 font-sans text-xs">
      <div>
        {/* Brand Header */}
        <div className="p-6 border-b border-[#E5E3DB] flex items-center justify-between">
          <Logo size="sm" href="/app" theme="light" />
          <span className="font-mono text-[10px] uppercase text-[#8A8A82] border border-[#E5E3DB] px-1.5 py-0.5">
            PROD
          </span>
        </div>

        {/* Quick Action */}
        <div className="p-4">
          <Link
            href="/app/forms/new"
            className="w-full py-2 px-3 bg-[#090A0A] hover:bg-[#222422] text-[#F4F2EC] flex items-center justify-center gap-2 font-mono text-xs uppercase tracking-wider transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Create Form
          </Link>
        </div>

        {/* Navigation Items */}
        <nav className="px-3 py-2 space-y-1">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === "/app"
                ? pathname === "/app"
                : pathname.startsWith(item.href) ||
                  (item.name === "Responses" && pathname.includes("/responses")) ||
                  (item.name === "Analytics" && pathname.includes("/analytics")) ||
                  (item.name === "Intelligence" && pathname.includes("/insights"));

            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 font-medium transition-colors ${
                  isActive
                    ? "bg-[#EAE8E0] text-[#090A0A] font-semibold border-l-2 border-[#315CFF]"
                    : "text-[#5E605E] hover:text-[#090A0A] hover:bg-[#F2EFE9]"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-[#315CFF]" : "text-[#8A8A82]"}`} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom Profile & Workspace Info */}
      <div className="p-4 border-t border-[#E5E3DB] bg-[#F4F2EC] space-y-3 font-mono">
        <div className="flex items-center justify-between text-[11px] text-[#5E605E]">
          <span>WORKSPACE</span>
          <span className="font-semibold text-[#090A0A]">{workspaceName}</span>
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-[#E5E3DB]">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-6 h-6 rounded-none bg-[#090A0A] text-[#F4F2EC] flex items-center justify-center font-bold text-[10px] shrink-0">
              {userInitials}
            </div>
            <div className="truncate">
              <div className="text-[11px] font-medium text-[#090A0A] truncate">{userName}</div>
              <div className="text-[9px] text-[#8A8A82] truncate">{userEmail}</div>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            title="Sign Out"
            className="p-1 hover:text-red-600 text-[#8A8A82] transition-colors shrink-0"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
