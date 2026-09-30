"use client";

export function LogoutButton() {
  async function handleLogout() {
    await fetch("/api/vendor/logout", { method: "POST" });
    window.location.href = "/vendor";
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
