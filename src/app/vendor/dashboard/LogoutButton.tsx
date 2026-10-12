"use client";

export function LogoutButton() {
  async function handleLogout() {
    try {
      await fetch("/api/vendor/logout", { method: "POST" });
    } catch {
      // Ignore network errors on logout
    } finally {
      window.location.replace("/join-as-vendor");
    }
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      className="text-sm text-zinc-400 underline hover:text-zinc-200"
    >
      Log out
    </button>
  );
}
