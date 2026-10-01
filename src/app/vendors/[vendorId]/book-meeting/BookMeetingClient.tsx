/**
 * MuggedMoments — BookMeetingClient
 *
 * Interactive date picker, time slot selector, and contact submission form
 * for booking consultations with vendors.
 */

"use client";

import React, { useState } from "react";
import Link from "next/link";

interface VendorSummary {
  id: string;
  name: string;
  city: string;
  services: string[];
}

interface BookMeetingClientProps {
  vendor: VendorSummary;
}

const TIME_SLOTS = ["10:00 AM", "11:30 AM", "02:00 PM", "04:00 PM", "06:00 PM"];

function getNext14Days() {
  const days = [];
  const today = new Date();
  for (let i = 1; i <= 14; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    days.push(d);
  }
  return days;
}

export function BookMeetingClient({ vendor }: BookMeetingClientProps) {
  const availableDates = getNext14Days();
  const [selectedDate, setSelectedDate] = useState<Date>(availableDates[0]);
  const [selectedSlot, setSelectedSlot] = useState<string>(TIME_SLOTS[0]);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmedMeeting, setConfirmedMeeting] = useState<any | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/meetings/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vendorId: vendor.id,
          customerName,
          customerPhone,
          customerEmail,
          meetingDate: selectedDate.toISOString(),
          timeSlot: selectedSlot,
          notes,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        setError(json?.error?.message ?? "Failed to book meeting.");
        return;
      }

      setConfirmedMeeting(json.meeting);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (confirmedMeeting) {
    return (
      <div className="w-full max-w-xl mx-auto bg-zinc-900/90 backdrop-blur-md border border-zinc-800 rounded-2xl p-8 shadow-2xl text-center">
        <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold flex items-center justify-center text-3xl mx-auto mb-6">
          ✓
        </div>
        <h2 className="text-2xl font-extrabold text-white mb-2">Meeting Scheduled!</h2>
        <p className="text-sm text-zinc-300 mb-6">
          Your consultation with <span className="font-semibold text-amber-400">{vendor.name}</span> has been booked.
        </p>

        <div className="bg-zinc-950/60 border border-zinc-800 rounded-xl p-5 mb-6 text-left space-y-3 text-sm">
          <div className="flex justify-between border-b border-zinc-800/80 pb-2">
            <span className="text-zinc-400">Date</span>
            <span className="font-semibold text-zinc-100">
              {new Date(confirmedMeeting.meetingDate).toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          </div>
          <div className="flex justify-between border-b border-zinc-800/80 pb-2">
            <span className="text-zinc-400">Time Slot</span>
            <span className="font-semibold text-amber-400">{confirmedMeeting.timeSlot}</span>
          </div>
          <div className="flex justify-between border-b border-zinc-800/80 pb-2">
            <span className="text-zinc-400">Host Name</span>
            <span className="text-zinc-200">{confirmedMeeting.customerName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-400">Phone</span>
            <span className="text-zinc-200">{confirmedMeeting.customerPhone}</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href="/my-requests"
            className="flex-1 bg-amber-400 text-zinc-950 hover:bg-amber-300 font-bold text-sm py-3 rounded-xl transition-all shadow-md shadow-amber-400/10 text-center"
          >
            Track Status on My Requests →
          </Link>
          <Link
            href={`/vendors/${vendor.id}`}
            className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold text-sm py-3 rounded-xl transition-colors text-center"
          >
            Back to Vendor Profile
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-xl mx-auto bg-zinc-900/90 backdrop-blur-md border border-zinc-800 rounded-2xl p-6 sm:p-8 shadow-2xl">
      {/* Header */}
      <div className="border-b border-zinc-800 pb-5 mb-6">
        <span className="text-xs uppercase font-bold text-amber-400 tracking-wider block mb-1">
          Schedule Consultation
        </span>
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
          Book a Meeting with {vendor.name}
        </h1>
        <p className="text-xs text-zinc-400 mt-1">{vendor.city} {vendor.services.length > 0 ? `· ${vendor.services.join(", ")}` : ""}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Date Selector */}
        <div>
          <label className="block text-xs uppercase font-bold text-zinc-400 mb-3 tracking-wider">
            1. Select Date
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 max-h-48 overflow-y-auto pr-1">
            {availableDates.map((d) => {
              const isSelected = selectedDate.toDateString() === d.toDateString();
              return (
                <button
                  type="button"
                  key={d.toISOString()}
                  onClick={() => setSelectedDate(d)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    isSelected
                      ? "bg-amber-400 text-zinc-950 border-amber-400 font-bold shadow-md shadow-amber-400/10"
                      : "bg-zinc-850 border-zinc-750 text-zinc-300 hover:border-zinc-600 hover:text-white"
                  }`}
                >
                  <div className="text-[10px] uppercase font-bold opacity-80">
                    {d.toLocaleDateString("en-US", { weekday: "short" })}
                  </div>
                  <div className="text-sm font-extrabold mt-0.5">
                    {d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Time Slot Selector */}
        <div>
          <label className="block text-xs uppercase font-bold text-zinc-400 mb-3 tracking-wider">
            2. Select Time Slot
          </label>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            {TIME_SLOTS.map((slot) => {
              const isSelected = selectedSlot === slot;
              return (
                <button
                  type="button"
                  key={slot}
                  onClick={() => setSelectedSlot(slot)}
                  className={`py-2.5 px-2 rounded-lg text-xs font-bold transition-all text-center border ${
                    isSelected
                      ? "bg-amber-400 text-zinc-950 border-amber-400 shadow-md shadow-amber-400/10"
                      : "bg-zinc-850 border-zinc-750 text-zinc-300 hover:border-zinc-600 hover:text-white"
                  }`}
                >
                  {slot}
                </button>
              );
            })}
          </div>
        </div>

        {/* Customer Contact Details */}
        <div className="space-y-4 pt-2">
          <label className="block text-xs uppercase font-bold text-zinc-400 tracking-wider">
            3. Your Contact Information
          </label>

          <div>
            <label className="block text-xs text-zinc-400 mb-1">Your Full Name *</label>
            <input
              type="text"
              required
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="e.g. Rahul Sharma"
              className="w-full rounded-xl bg-zinc-800 border border-zinc-700 px-4 py-2.5 text-zinc-100 text-sm focus:outline-none focus:border-amber-400"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Phone Number (used to track status) *</label>
              <input
                type="tel"
                required
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full rounded-xl bg-zinc-800 border border-zinc-700 px-4 py-2.5 text-zinc-100 text-sm focus:outline-none focus:border-amber-400"
              />
            </div>

            <div>
              <label className="block text-xs text-zinc-400 mb-1">Email Address (optional)</label>
              <input
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                placeholder="rahul@example.com"
                className="w-full rounded-xl bg-zinc-800 border border-zinc-700 px-4 py-2.5 text-zinc-100 text-sm focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-zinc-400 mb-1">Event Requirements / Notes (optional)</label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Briefly describe your event type, expected guest count, or specific requirements..."
              className="w-full rounded-xl bg-zinc-800 border border-zinc-700 px-4 py-2.5 text-zinc-100 text-sm focus:outline-none focus:border-amber-400"
            />
          </div>
        </div>

        {error && (
          <div className="text-sm text-red-400 bg-red-950/40 border border-red-900 rounded-xl p-3">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-amber-400 hover:bg-amber-300 text-zinc-950 font-extrabold text-base py-3.5 rounded-xl shadow-lg shadow-amber-400/10 transition-all disabled:opacity-50"
        >
          {submitting ? "Booking Consultation..." : "Confirm & Book Meeting →"}
        </button>
      </form>
    </div>
  );
}
