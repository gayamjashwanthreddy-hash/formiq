import React from "react";
import AppSidebar from "@/components/app/app-sidebar";

export const metadata = {
  title: "Dashboard — FormIQ",
  description: "Manage forms, responses, and real-time intelligence.",
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#F8F7F4] text-[#090A0A] flex flex-col md:flex-row font-sans">
      <AppSidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto min-h-screen">
        {children}
      </div>
    </div>
  );
}
