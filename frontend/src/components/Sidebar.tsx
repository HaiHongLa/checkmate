"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/play", label: "Play", enabled: true },
  { href: "/analyze", label: "Analyze", enabled: true },
  { href: "/openings", label: "Openings", enabled: true },
  { href: "/tactics", label: "Tactics", enabled: false },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-full md:w-56 shrink-0 border-b md:border-b-0 md:border-r border-surface-border bg-surface-card flex md:flex-col flex-row md:min-h-screen overflow-x-auto md:overflow-visible">
      <div className="px-5 py-4 md:py-6 border-b border-surface-border shrink-0 hidden md:block">
        <Link href="/play" className="block">
          <span className="text-xl font-bold text-white tracking-tight">
            Checkmate
          </span>
          <span className="text-xs text-gray-500 block mt-0.5">
            AI Chess Coaching
          </span>
        </Link>
      </div>

      <nav className="flex-1 px-2 md:px-3 py-2 md:py-4 flex md:flex-col flex-row gap-1 md:space-y-1 md:gap-0">
        {NAV_ITEMS.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);

          if (!item.enabled) {
            return (
              <span
                key={item.href}
                className="flex items-center px-3 py-2 text-sm text-gray-600 cursor-not-allowed rounded-lg"
                title="Coming soon"
              >
                {item.label}
                <span className="ml-auto text-[10px] uppercase tracking-wide text-gray-600">
                  Soon
                </span>
              </span>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center px-3 py-2 text-sm rounded-lg transition-colors ${
                active
                  ? "bg-accent/20 text-white font-medium"
                  : "text-gray-400 hover:text-gray-200 hover:bg-surface-border/40"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-2 md:px-3 py-2 md:py-4 border-t-0 md:border-t border-surface-border md:mt-auto">
        <Link
          href="/settings"
          className={`flex items-center px-3 py-2 text-sm rounded-lg transition-colors ${
            pathname === "/settings"
              ? "bg-accent/20 text-white font-medium"
              : "text-gray-400 hover:text-gray-200 hover:bg-surface-border/40"
          }`}
        >
          Settings
        </Link>
      </div>
    </aside>
  );
}
