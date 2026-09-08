import { chromium, type Browser, type Page } from "playwright";
import { readFileSync } from "node:fs";
import { existsSync } from "node:fs";
import { join } from "node:path";

/**
 * Login na plataforma NobriPonto (EzPoint Web).
 *
 * Seletores confirmados na tela real (14/08/2026):
 *   form#loginForm -> POST /LoginAction.do
 *     #loginEmpresa (Empresa) · #loginUsuario (Usuário) · #loginSenha (Senha)
 *     #btnSubmit (type=button — precisa de click, não submit)
 */

export function loadEnv(): Record<string, string> {
  const env: Record<string, string> = { ...(process.env as Record<string, string>) };
  for (const candidate of [".env", join("..", ".env.local")]) {
    if (!existsSync(candidate)) continue;
    for (const line of readFileSync(candidate, "utf8").split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !env[m[1]]) env[m[1]] = m[2].trim();
    }
  }
  return env;
}

export interface Session {
  browser: Browser;
  page: Page;
  env: Record<string, string>;
}

export async function login(opts: { headless?: boolean } = {}): Promise<Session> {
  const env = loadEnv();
  const url = env.NOBRIPONTO_FRONT_URL ?? "https://www.nobriponto.com.br/";
  const empresa = env.NOBRIPONTO_FRONT_EMPRESA ?? "";
  const usuario = env.NOBRIPONTO_FRONT_USUARIO ?? "";
  const senha = env.NOBRIPONTO_FRONT_SENHA ?? "";
  if (!empresa || !usuario || !senha) {
    throw new Error("NOBRIPONTO_FRONT_EMPRESA/USUARIO/SENHA ausentes no .env");
  }

  const browser = await chromium.launch({ headless: opts.headless ?? true });
  const context = await browser.newContext({
    // janela alta: nas telas de relatório os botões ficam no rodapé da página
    viewport: { width: 1600, height: 1400 },
    acceptDownloads: true,
    // a tela pede geolocalização para registro de ponto; negar evita travas
    permissions: [],
  });
  const page = await context.newPage();

  // Esperar por `networkidle` exige 500ms de silêncio TOTAL na rede — um
  // critério que o site do ponto não alcança quando está lento (medimos 6 a
  // 21s por requisição em 08/09/2026). Esperar pelo ELEMENTO que precisamos é
  // mais robusto e igualmente correto: se o campo de login apareceu, a página
  // está utilizável, independentemente de haver requisições pendentes.
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.waitForSelector("#loginEmpresa", { state: "visible", timeout: 120000 });

  await page.fill("#loginEmpresa", empresa);
  await page.fill("#loginUsuario", usuario);
  await page.fill("#loginSenha", senha);
  await page.click("#btnSubmit");

  // O app troca de tela via POST /LoginAction.do. O sinal de sucesso é o campo
  // de senha desaparecer — esperar por isso é mais confiável que aguardar a
  // rede silenciar.
  await page
    .waitForSelector("#loginSenha", { state: "hidden", timeout: 120000 })
    .catch(() => {
      /* segue: a verificação abaixo confirma se o login passou */
    });
  await page.waitForTimeout(2000);

  const aindaNoLogin = await page.locator("#loginSenha").isVisible().catch(() => false);
  if (aindaNoLogin) {
    const toast = await page
      .locator(".iziToast-message, .iziToast-title")
      .allInnerTexts()
      .catch(() => []);
    throw new Error(`login não completou${toast.length ? `: ${toast.join(" | ")}` : ""}`);
  }

  return { browser, page, env };
}
