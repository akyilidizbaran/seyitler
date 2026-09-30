"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Item = { href: string; label: string; badge?: number };

export function NavLinks({ items }: { items: Item[] }) {
  const path = usePathname();
  return (
    <nav className="-mx-1 flex gap-1 overflow-x-auto [scrollbar-width:none]">
      {items.map((it) => {
        const active = it.href === "/" ? path === "/" : path.startsWith(it.href);
        return (
          <Link
            key={it.href}
            href={it.href}
            className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              active ? "bg-surface-2 text-text" : "text-muted hover:text-text"
            }`}
          >
            {it.label}
            {!!it.badge && (
              <span className="rounded-full bg-danger px-1.5 text-[11px] font-semibold leading-5 text-white">{it.badge}</span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
