"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  RefreshCcw,
  FolderPlus,
  Settings,
  UserCog,
  PanelLeftClose,
  PanelLeft,
  ChevronDown,
  LogOut,
  type LucideIcon,
} from "lucide-react";
import clsx from "clsx";
import { activeClientBranding } from "@/lib/branding";
import { navGroups, type NavItem } from "@/lib/nav";

const icones: Record<string, LucideIcon> = {
  LayoutDashboard,
  Users,
  ClipboardList,
  RefreshCcw,
  FolderPlus,
  Settings,
  UserCog,
};

const CHAVE_ESTADO = "nobri:sidebar-recolhida";

export function Sidebar() {
  const pathname = usePathname();
  const [recolhida, setRecolhida] = useState(false);
  const [abertos, setAbertos] = useState<Record<string, boolean>>({});

  // preferência de recolhimento persiste entre sessões
  useEffect(() => {
    setRecolhida(localStorage.getItem(CHAVE_ESTADO) === "1");
  }, []);

  useEffect(() => {
    // mantém aberto o grupo que contém a página atual
    const iniciais: Record<string, boolean> = {};
    for (const g of navGroups) {
      for (const i of g.items) {
        if (i.children?.some((c) => pathname.startsWith(c.href))) iniciais[i.href] = true;
      }
    }
    setAbertos((a) => ({ ...iniciais, ...a }));
  }, [pathname]);

  function alternarRecolhida() {
    setRecolhida((r) => {
      localStorage.setItem(CHAVE_ESTADO, r ? "0" : "1");
      return !r;
    });
  }

  const ativo = (href: string) =>
    href === "/dashboard" ? pathname === href : pathname.startsWith(href);

  return (
    <aside
      className={clsx(
        "flex shrink-0 flex-col bg-[var(--chrome)] transition-[width] duration-200",
        recolhida ? "w-[68px]" : "w-60"
      )}
    >
      {/* marca do cliente */}
      <div
        className={clsx(
          "flex h-16 items-center border-b border-white/8",
          recolhida ? "justify-center px-2" : "px-5"
        )}
      >
        {recolhida ? (
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-[var(--brand-primary)] text-sm font-bold text-white">
            {activeClientBranding.name.charAt(0)}
          </span>
        ) : (
          <div className="rounded-md bg-white/95 px-2.5 py-1.5">
            <Image
              src={activeClientBranding.logoUrl}
              alt={activeClientBranding.name}
              width={104}
              height={30}
              priority
            />
          </div>
        )}
      </div>

      <nav className="scroll-slim flex-1 overflow-y-auto py-3">
        {navGroups.map((grupo) => (
          <div key={grupo.label} className="mb-1 px-3">
            {!recolhida && (
              <p className="mb-1 px-2 pt-3 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--chrome-ink-dim)]">
                {grupo.label}
              </p>
            )}
            {grupo.items.map((item) =>
              item.children?.length ? (
                <GrupoComFilhos
                  key={item.href}
                  item={item}
                  recolhida={recolhida}
                  aberto={!!abertos[item.href]}
                  ativo={ativo}
                  onToggle={() =>
                    setAbertos((a) => ({ ...a, [item.href]: !a[item.href] }))
                  }
                />
              ) : (
                <ItemLink key={item.href} item={item} recolhida={recolhida} ativo={ativo(item.href)} />
              )
            )}
          </div>
        ))}
      </nav>

      <div className="border-t border-white/8 p-3">
        <Link
          href="/login"
          className={clsx(
            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-[var(--chrome-ink-dim)] transition-colors hover:bg-[var(--chrome-hover)] hover:text-[var(--chrome-ink)]",
            recolhida && "justify-center px-0"
          )}
          title="Sair"
        >
          <LogOut size={17} />
          {!recolhida && "Sair"}
        </Link>
        <button
          onClick={alternarRecolhida}
          className={clsx(
            "mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-[var(--chrome-ink-dim)] transition-colors hover:bg-[var(--chrome-hover)] hover:text-[var(--chrome-ink)]",
            recolhida && "justify-center px-0"
          )}
          title={recolhida ? "Expandir menu" : "Recolher menu"}
          aria-label={recolhida ? "Expandir menu" : "Recolher menu"}
        >
          {recolhida ? <PanelLeft size={17} /> : <PanelLeftClose size={17} />}
          {!recolhida && "Recolher"}
        </button>
      </div>
    </aside>
  );
}

function ItemLink({
  item,
  recolhida,
  ativo,
  filho,
}: {
  item: NavItem;
  recolhida: boolean;
  ativo: boolean;
  filho?: boolean;
}) {
  const Icone = icones[item.icon] ?? LayoutDashboard;
  return (
    <Link
      href={item.href}
      title={recolhida ? item.label : undefined}
      className={clsx(
        "relative flex items-center gap-3 rounded-lg py-2 text-sm transition-colors",
        recolhida ? "justify-center px-0" : filho ? "pl-9 pr-3" : "px-3",
        ativo
          ? "bg-[var(--chrome-active)] font-medium text-white"
          : "text-[var(--chrome-ink-dim)] hover:bg-[var(--chrome-hover)] hover:text-[var(--chrome-ink)]"
      )}
    >
      {/* marcador de item ativo — barra na cor da marca */}
      {ativo && !recolhida && (
        <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r bg-[var(--brand-primary)]" />
      )}
      <Icone size={17} strokeWidth={2} className={clsx(filho && !recolhida && "hidden")} />
      {!recolhida && <span className="truncate">{item.label}</span>}
    </Link>
  );
}

function GrupoComFilhos({
  item,
  recolhida,
  aberto,
  ativo,
  onToggle,
}: {
  item: NavItem;
  recolhida: boolean;
  aberto: boolean;
  ativo: (href: string) => boolean;
  onToggle: () => void;
}) {
  const Icone = icones[item.icon] ?? FolderPlus;
  const algumFilhoAtivo = item.children?.some((c) => ativo(c.href));

  // recolhida: mostra só os filhos como ícones, sem o cabeçalho do grupo
  if (recolhida) {
    return (
      <>
        {item.children?.map((c) => (
          <ItemLink key={c.href} item={c} recolhida ativo={ativo(c.href)} />
        ))}
      </>
    );
  }

  return (
    <div>
      <button
        onClick={onToggle}
        aria-expanded={aberto}
        className={clsx(
          "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
          algumFilhoAtivo
            ? "text-white"
            : "text-[var(--chrome-ink-dim)] hover:bg-[var(--chrome-hover)] hover:text-[var(--chrome-ink)]"
        )}
      >
        <Icone size={17} strokeWidth={2} />
        <span className="flex-1 text-left">{item.label}</span>
        <ChevronDown
          size={14}
          className={clsx("transition-transform duration-200", aberto && "rotate-180")}
        />
      </button>
      <div
        className={clsx(
          "grid transition-[grid-template-rows] duration-200",
          aberto ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        )}
      >
        <div className="overflow-hidden">
          {item.children?.map((c) => (
            <ItemLink key={c.href} item={c} recolhida={false} ativo={ativo(c.href)} filho />
          ))}
        </div>
      </div>
    </div>
  );
}
