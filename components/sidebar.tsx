"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, ClipboardList, RefreshCcw } from "lucide-react";
import clsx from "clsx";
import { activeClientBranding } from "@/lib/branding";

const nav = [
  { href: "/dashboard", label: "Visão geral", icon: LayoutDashboard },
  { href: "/dashboard/colaboradores", label: "Colaboradores", icon: Users },
  { href: "/dashboard/motivos", label: "Motivos", icon: ClipboardList },
  { href: "/dashboard/importacoes", label: "Importações", icon: RefreshCcw },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-black/10 bg-[var(--surface-1)]">
      <div className="flex h-16 items-center border-b border-black/10 px-5">
        <Image
          src={activeClientBranding.logoUrl}
          alt={activeClientBranding.name}
          width={120}
          height={36}
          priority
        />
      </div>
      <nav className="flex flex-col gap-1 p-3">
        {nav.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/dashboard" ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-[var(--brand-dark)] text-white"
                  : "text-[var(--ink-secondary)] hover:bg-black/5"
              )}
            >
              <Icon size={17} strokeWidth={2} />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto p-4 text-[11px] leading-relaxed text-[var(--ink-muted)]">
        NobriPonto Analytics
        <br />
        painel whitelabel · v0.1
      </div>
    </aside>
  );
}
