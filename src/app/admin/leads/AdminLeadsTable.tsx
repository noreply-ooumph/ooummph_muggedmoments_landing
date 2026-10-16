/**
 * MuggedMoments — Admin Leads Interactive Table Component
 *
 * Implements:
 * - Search across lead ID, customer name, phone, city, and event type (BUG-012)
 * - Status filter dropdown (BUG-012)
 * - Pagination controls with page size selector and empty states (BUG-012)
 * - Unclipped, responsive horizontal scroll container for tablets and mobile (<1024px) (BUG-005)
 * - Standardized IST date/time formatting (BUG-009)
 * - Normalized city presentation (BUG-010)
 */

"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { formatCityName, formatStandardDateTime, formatConsultationSlot } from "@/lib/format";

export interface AdminLeadRow {
  publicLeadId: string;
  customerName: string;
  phone: string;
  eventType: string;
  city: string;
  status: string;
  qualificationStatus: string;
  preferredMeetingDate: string | null;
  preferredMeetingTime: string | null;
  createdAt: string;
}

interface AdminLeadsTableProps {
  initialLeads: AdminLeadRow[];
}

export function AdminLeadsTable({ initialLeads }: AdminLeadsTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Filter leads based on search term and status
  const filteredLeads = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();

    return initialLeads.filter((lead) => {
      // Status filter
      if (statusFilter !== "ALL" && lead.status !== statusFilter) {
        return false;
      }

      // Search term filter
      if (!term) return true;

      const matchesId = lead.publicLeadId.toLowerCase().includes(term);
      const matchesName = lead.customerName.toLowerCase().includes(term);
      const matchesPhone = lead.phone.toLowerCase().includes(term);
      const matchesCity = lead.city.toLowerCase().includes(term);
      const matchesEvent = lead.eventType.toLowerCase().includes(term);

      return matchesId || matchesName || matchesPhone || matchesCity || matchesEvent;
    });
  }, [initialLeads, searchTerm, statusFilter]);

  // Reset to page 1 whenever filters change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value);
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    setSearchTerm("");
    setStatusFilter("ALL");
    setCurrentPage(1);
  };

  // Pagination calculation
  const totalLeads = filteredLeads.length;
  const totalPages = Math.max(1, Math.ceil(totalLeads / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const paginatedLeads = filteredLeads.slice(startIndex, startIndex + pageSize);

  return (
    <div className="space-y-4">
      {/* Controls Bar: Search, Status Filter & Page Size */}
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
        <div className="flex-1 flex flex-col sm:flex-row gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <label htmlFor="admin-search-input" className="sr-only">
              Search Leads
            </label>
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <input
              id="admin-search-input"
              type="text"
              value={searchTerm}
              onChange={handleSearchChange}
              placeholder="Search by Lead ID, Customer, Phone, City..."
              className="w-full pl-10 pr-4 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/40"
            />
          </div>

          {/* Status Filter */}
          <div className="w-full sm:w-48">
            <label htmlFor="admin-status-filter" className="sr-only">
              Filter by Status
            </label>
            <select
              id="admin-status-filter"
              value={statusFilter}
              onChange={handleStatusChange}
              className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-zinc-200 focus:outline-none focus:border-amber-400"
            >
              <option value="ALL">All Statuses</option>
              <option value="SUBMITTED">SUBMITTED</option>
              <option value="MATCHED">MATCHED</option>
              <option value="UNDER_REVIEW">UNDER_REVIEW</option>
              <option value="CLOSED">CLOSED</option>
              <option value="INVALID">INVALID</option>
            </select>
          </div>
        </div>

        {/* Results summary and Reset */}
        <div className="flex items-center gap-3 justify-between sm:justify-end text-xs text-zinc-400">
          <span>
            Showing <strong className="text-zinc-200">{totalLeads}</strong> of{" "}
            {initialLeads.length} leads
          </span>
          {(searchTerm || statusFilter !== "ALL") && (
            <button
              onClick={handleResetFilters}
              className="text-amber-400 hover:text-amber-300 underline font-medium"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Horizontal Scroll Hint on Mobile/Tablet */}
      <div className="lg:hidden flex items-center justify-between text-[11px] text-zinc-500 px-1">
        <span>↔ Scroll horizontally to view all columns</span>
      </div>

      {/* Table Container with unclipped horizontal scroll container (BUG-005) */}
      <div className="overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-950/80 shadow-2xl">
        <table className="min-w-[960px] w-full text-sm">
          <thead>
            <tr className="text-left text-zinc-400 border-b border-zinc-800 bg-zinc-900/50">
              <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider">Lead ID</th>
              <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider">Customer</th>
              <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider">Phone</th>
              <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider">Event Type</th>
              <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider">City</th>
              <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider">Qualification</th>
              <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider">Rep. Consultation</th>
              <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider">Created (IST)</th>
            </tr>
          </thead>
          <tbody>
            {paginatedLeads.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center text-zinc-400">
                  <div className="max-w-xs mx-auto space-y-2">
                    <p className="text-sm font-medium text-zinc-300">No leads match your filter</p>
                    <p className="text-xs text-zinc-500">
                      Try adjusting your search query or reset the status filter to see all leads.
                    </p>
                    {(searchTerm || statusFilter !== "ALL") && (
                      <button
                        onClick={handleResetFilters}
                        className="mt-2 inline-block px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs rounded-lg transition-colors"
                      >
                        Reset All Filters
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              paginatedLeads.map((lead) => (
                <tr
                  key={lead.publicLeadId}
                  className="text-zinc-100 border-b border-zinc-800/60 last:border-b-0 hover:bg-zinc-900/40 transition-colors"
                >
                  <td className="px-4 py-3 font-mono text-xs font-semibold">
                    <Link
                      href={`/admin/leads/${lead.publicLeadId}`}
                      className="text-amber-400 hover:text-amber-300 hover:underline"
                    >
                      {lead.publicLeadId}
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-medium text-zinc-200">{lead.customerName}</td>
                  <td className="px-4 py-3 font-mono text-xs text-zinc-300">{lead.phone}</td>
                  <td className="px-4 py-3 text-zinc-200">{lead.eventType}</td>
                  <td className="px-4 py-3 text-zinc-300">{formatCityName(lead.city)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold uppercase ${
                        lead.status === "MATCHED"
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                          : lead.status === "SUBMITTED"
                          ? "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                          : "bg-zinc-800 text-zinc-400 border border-zinc-700"
                      }`}
                    >
                      {lead.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-400 text-xs">{lead.qualificationStatus}</td>
                  <td className="px-4 py-3 text-xs">
                    {lead.preferredMeetingDate || lead.preferredMeetingTime ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                        📅 {formatConsultationSlot(lead.preferredMeetingDate, lead.preferredMeetingTime)}
                      </span>
                    ) : (
                      <span className="text-zinc-500">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-zinc-400 text-xs whitespace-nowrap">
                    {formatStandardDateTime(lead.createdAt)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls (BUG-012) */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 text-xs text-zinc-400">
        <div className="flex items-center gap-2">
          <span>Rows per page:</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="px-2 py-1 bg-zinc-900 border border-zinc-800 rounded text-xs text-zinc-200 focus:outline-none focus:border-amber-400"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>
          <span className="text-zinc-500 ml-2">
            Showing {totalLeads > 0 ? startIndex + 1 : 0}–
            {Math.min(startIndex + pageSize, totalLeads)} of {totalLeads}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={safePage <= 1}
            className="px-3 py-1.5 bg-zinc-900 border border-zinc-800 hover:bg-zinc-850 text-zinc-200 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            ← Previous
          </button>
          <span className="px-2 text-zinc-300 font-medium">
            Page {safePage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={safePage >= totalPages}
            className="px-3 py-1.5 bg-zinc-900 border border-zinc-800 hover:bg-zinc-850 text-zinc-200 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  );
}
