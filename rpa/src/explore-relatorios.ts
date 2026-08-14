/**
 * Depois de logar, mapeia o menu de Relatórios para achar
 * "Abonos e Faltas Justificadas" e os filtros da tela.
 *
 *   cd rpa && npx tsx src/explore-relatorios.ts
 */
import { login } from "./login.js";

const { browser, page } = await login({ headless: false });
console.log("=== logado. URL:", page.url());
console.log("título:", await page.title());
await page.screenshot({ path: "screenshots/rel-01-home.png", fullPage: true });

console.log("\n=== menus / links visíveis");
const vistos = new Set<string>();
for (const el of await page.locator("a:visible, button:visible, [onclick]:visible").all()) {
  const t = ((await el.innerText().catch(() => "")) ?? "").trim().replace(/\s+/g, " ");
  if (!t || t.length > 60 || vistos.has(t)) continue;
  vistos.add(t);
  const href = (await el.getAttribute("href")) ?? "";
  const onclick = (await el.getAttribute("onclick")) ?? "";
  console.log(`  "${t}" href=${href.slice(0, 50)} onclick=${onclick.slice(0, 50)}`);
}

// tenta abrir o menu de relatórios
const rel = page.locator('a:has-text("Relatório"), a:has-text("Relatórios"), button:has-text("Relatório")').first();
if (await rel.count()) {
  console.log("\n=== abrindo menu de Relatórios");
  await rel.click();
  await page.waitForTimeout(3000);
  await page.screenshot({ path: "screenshots/rel-02-menu.png", fullPage: true });
  console.log("URL:", page.url());
  const itens = new Set<string>();
  for (const el of await page.locator("a:visible, li:visible").all()) {
    const t = ((await el.innerText().catch(() => "")) ?? "").trim().replace(/\s+/g, " ");
    if (!t || t.length > 60 || itens.has(t)) continue;
    itens.add(t);
    if (/abono|falta|absente|extrato|hora/i.test(t)) {
      const href = (await el.getAttribute("href")) ?? "";
      console.log(`  >> "${t}" href=${href.slice(0, 60)}`);
    }
  }
  console.log("\n  (todos os itens do menu:)");
  for (const t of [...itens].slice(0, 40)) console.log("   -", t);
}

console.log("\nnavegador aberto 120s para inspeção manual");
await page.waitForTimeout(120000);
await browser.close();
