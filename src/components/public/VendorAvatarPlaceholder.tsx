/**
 * MuggedMoments — Vendor Avatar Placeholder
 *
 * Fallback for a vendor with zero portfolio photos — an initials-gradient square,
 * same visual language as the "MM" logo mark already used in Header.tsx and
 * VendorDashboardShell.tsx (amber gradient, bold initials). Never a stock photo,
 * never a broken <img> tag — derived only from the vendor's own real name.
 */

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

interface VendorAvatarPlaceholderProps {
  name: string;
  className?: string;
}

export function VendorAvatarPlaceholder({ name, className = "" }: VendorAvatarPlaceholderProps) {
  return (
    <div
      className={`bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center font-bold text-zinc-950 ${className}`}
    >
      {getInitials(name)}
    </div>
  );
}
