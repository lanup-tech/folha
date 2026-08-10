import type { TenantBranding } from "./types";

/**
 * Whitelabel: em produção isto vem da tabela `tenants`/`clients` do Supabase
 * (resolvido por subdomínio ou slug). Enquanto não há credenciais, o tenant
 * demo é a Funchal.
 */
export const activeClientBranding: TenantBranding = {
  name: "Funchal",
  logoUrl: "/logo_funchal.svg",
  primaryColor: "#ff6600",
  darkColor: "#010066",
};

export const activePeriod = { label: "Maio 2026", competencia: "2026-05" };
