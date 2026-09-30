/**
 * MuggedMoments — Shared Status Badge
 *
 * Consolidates the styling that previously existed as three near-identical local
 * `STATUS_LABEL` const maps (vendor dashboard, opportunities list, booking-requests
 * list) into one component. Those maps' `label`/`status` values and business meaning
 * are untouched — this only replaces how the `{label, className}` pair is rendered,
 * not what any page decides that pair should be.
 */

export type StatusTone = "amber" | "zinc" | "emerald" | "red" | "gray";

const TONE_CLASSNAMES: Record<StatusTone, string> = {
  amber: "bg-amber-950/40 border-amber-900 text-amber-400",
  zinc: "bg-zinc-700/30 border-zinc-600 text-zinc-300",
  emerald: "bg-emerald-950/40 border-emerald-900 text-emerald-400",
  red: "bg-red-950/40 border-red-900 text-red-400",
  gray: "bg-zinc-800/60 border-zinc-700 text-zinc-500",
};

interface StatusBadgeProps {
  label: string;
  tone: StatusTone;
  className?: string;
}

export function StatusBadge({ label, tone, className = "" }: StatusBadgeProps) {
  return (
    <span
      className={`inline-block shrink-0 px-2.5 py-1 text-xs font-semibold rounded-full border whitespace-nowrap ${TONE_CLASSNAMES[tone]} ${className}`}
    >
      {label}
    </span>
  );
}
