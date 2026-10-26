"use client";

import React from "react";
import Link from "next/link";
import { ArrowUpRight, Bell, Globe } from "lucide-react";

interface AppHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export default function AppHeader({ title, subtitle, actions }: AppHeaderProps) {
  return (
    <header className="px-8 py-6 border-b border-[#E5E3DB] bg-[#FAFAF7] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 className="text-xl md:text-2xl font-bold tracking-tight text-[#090A0A] font-sans">
          {title}
        </h1>
        {subtitle && <p className="text-xs text-[#5E605E] mt-1 font-sans">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-3">
        {actions}
        <Link
          href="/"
          target="_blank"
          className="p-2 border border-[#E5E3DB] text-[#5E605E] hover:text-[#090A0A] hover:bg-[#F2EFE9] transition-colors"
          title="View Landing Experience"
        >
          <Globe className="w-4 h-4" />
        </Link>
      </div>
    </header>
  );
}
