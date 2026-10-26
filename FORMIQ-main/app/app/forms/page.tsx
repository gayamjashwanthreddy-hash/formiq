"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Search, Filter, ArrowUpRight, Copy, Trash2, ExternalLink } from "lucide-react";
import AppHeader from "@/components/app/app-header";
import { Form } from "@/types/formiq";

export default function FormsListPage() {
  const [forms, setForms] = useState<Form[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const loadForms = async () => {
    try {
      const res = await fetch("/api/forms");
      if (res.ok) {
        const data = await res.json();
        setForms(data);
      }
    } catch (err) {
      console.error("Failed to load forms:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadForms();
  }, []);

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"?`)) return;
    try {
      const res = await fetch(`/api/forms/${id}`, { method: "DELETE" });
      if (res.ok) {
        setForms((prev) => prev.filter((f) => f.id !== id));
      }
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  const filteredForms = forms.filter((f) => {
    const matchesSearch =
      f.title.toLowerCase().includes(search.toLowerCase()) ||
      f.slug.toLowerCase().includes(search.toLowerCase()) ||
      (f.description && f.description.toLowerCase().includes(search.toLowerCase()));

    const matchesStatus = filterStatus === "all" || f.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="flex-1 flex flex-col">
      <AppHeader
        title="Forms"
        subtitle="Create, manage, and configure your intake forms."
        actions={
          <Link
            href="/app/forms/new"
            className="px-4 py-2 bg-[#090A0A] hover:bg-[#222422] text-[#F4F2EC] flex items-center gap-2 font-mono text-xs uppercase tracking-wider transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Create Form
          </Link>
        }
      />

      <div className="p-8 space-y-6 max-w-7xl">
        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 font-mono text-xs">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8A8A82]" />
            <input
              type="text"
              placeholder="Search forms by title, slug, or type..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-[#E5E3DB] bg-[#FAFAF7] text-[#090A0A] placeholder-[#8A8A82] focus:outline-none focus:border-[#315CFF]"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[#8A8A82] uppercase text-[11px]">Filter:</span>
            {["all", "published", "draft", "closed"].map((st) => (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                className={`px-3 py-1.5 uppercase transition-colors ${
                  filterStatus === st
                    ? "bg-[#090A0A] text-[#F4F2EC] font-semibold"
                    : "border border-[#E5E3DB] bg-[#FAFAF7] text-[#5E605E] hover:text-[#090A0A]"
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {/* Forms Table */}
        <div className="border border-[#E5E3DB] bg-[#FAFAF7]">
          {loading ? (
            <div className="p-12 text-center font-mono text-xs text-[#8A8A82]">
              Loading workspace forms...
            </div>
          ) : filteredForms.length === 0 ? (
            <div className="p-12 text-center space-y-3 font-mono">
              <div className="text-sm font-bold text-[#090A0A]">No forms found</div>
              <p className="text-xs text-[#5E605E]">
                {search ? "No forms match your search criteria." : "You haven't created any forms yet."}
              </p>
              <Link
                href="/app/forms/new"
                className="inline-block mt-4 px-4 py-2 bg-[#090A0A] text-[#F4F2EC] text-xs uppercase tracking-wider"
              >
                Create your first form
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#E5E3DB] bg-[#F2EFE9] font-mono text-[10px] text-[#5E605E] uppercase tracking-wider">
                    <th className="py-3 px-6 font-semibold">Form Title & Slug</th>
                    <th className="py-3 px-6 font-semibold">Type</th>
                    <th className="py-3 px-6 font-semibold">Questions</th>
                    <th className="py-3 px-6 font-semibold">Responses</th>
                    <th className="py-3 px-6 font-semibold">Status</th>
                    <th className="py-3 px-6 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E3DB] text-xs font-sans">
                  {filteredForms.map((form) => (
                    <tr key={form.id} className="hover:bg-[#F8F7F4] transition-colors">
                      <td className="py-4 px-6">
                        <Link
                          href={`/app/forms/${form.id}`}
                          className="font-bold text-[#090A0A] hover:text-[#315CFF] transition-colors"
                        >
                          {form.title}
                        </Link>
                        <div className="font-mono text-[11px] text-[#8A8A82] mt-0.5">
                          /f/{form.slug}
                        </div>
                      </td>
                      <td className="py-4 px-6 font-mono text-[11px]">
                        <span className="uppercase px-2 py-0.5 bg-[#E8E5DD] text-[#222422]">
                          {form.type}
                        </span>
                      </td>
                      <td className="py-4 px-6 font-mono text-[#5E605E]">
                        {form.questions?.length || 0} fields
                      </td>
                      <td className="py-4 px-6 font-mono font-bold text-[#090A0A]">
                        {form.response_count || 0}
                      </td>
                      <td className="py-4 px-6 font-mono text-[11px]">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 uppercase ${
                            form.status === "published"
                              ? "bg-[#E0F2FE] text-[#0369A1] font-semibold"
                              : "bg-[#F3F4F6] text-[#4B5563]"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 ${
                              form.status === "published" ? "bg-[#0284C7]" : "bg-[#9CA3AF]"
                            }`}
                          />
                          {form.status}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right font-mono text-xs space-x-3">
                        <Link
                          href={`/app/forms/${form.id}`}
                          className="text-[#090A0A] hover:text-[#315CFF] transition-colors"
                        >
                          Edit
                        </Link>
                        <Link
                          href={`/app/forms/${form.id}/responses`}
                          className="text-[#090A0A] hover:text-[#315CFF] transition-colors"
                        >
                          Responses
                        </Link>
                        <Link
                          href={`/app/forms/${form.id}/insights`}
                          className="text-[#315CFF] font-semibold hover:underline"
                        >
                          Insights
                        </Link>
                        <Link
                          href={`/f/${form.slug}`}
                          target="_blank"
                          className="text-[#8A8A82] hover:text-[#090A0A]"
                          title="Open Public Form"
                        >
                          <ArrowUpRight className="w-3.5 h-3.5 inline" />
                        </Link>
                        <button
                          onClick={() => handleDelete(form.id, form.title)}
                          className="text-[#8A8A82] hover:text-red-600 transition-colors"
                          title="Delete Form"
                        >
                          <Trash2 className="w-3.5 h-3.5 inline" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
