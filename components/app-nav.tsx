"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "Dashboard" },
  { href: "/clients", label: "Clients" },
  { href: "/properties", label: "Properties" },
  { href: "/import", label: "Import" },
];

function isActive(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap gap-1 text-sm font-medium text-slate-600">
      {navItems.map((item) => {
        const active = isActive(pathname, item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={
              active
                ? "rounded-md bg-slate-950 px-3 py-2 text-white"
                : "rounded-md px-3 py-2 hover:bg-slate-100 hover:text-slate-950"
            }
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
