/**
 * Extrai as URLs reais de cada item do menu Relatórios (o menu não precisa
 * estar visível — lemos os href do DOM).
 *
 *   cd rpa && npx tsx src/explore-menu-urls.ts
 */
import { login } from "./login.js";

const { browser, page } = await login({ headless: true });

const itens = await page.evaluate(() =>
  [...document.querySelectorAll("a[href]")]
    .map((a) => ({
      texto: (a.textContent ?? "").replace(/\s+/g, " ").trim(),
      href: a.getAttribute("href") ?? "",
    }))
    .filter((i) => i.href.endsWith(".do"))
);

console.log("=== todas as telas (.do) do menu");
for (const i of itens) {
  const t = i.texto.replace(/^subdirectory_arrow_right\s*/, "");
  console.log(`  ${t.padEnd(45)} -> ${i.href}`);
}

console.log("\n=== relevantes para o nosso fluxo");
for (const i of itens) {
  if (/abono|falta|absente|extrato/i.test(i.texto)) {
    console.log(`  ${i.texto.replace(/^subdirectory_arrow_right\s*/, "").padEnd(45)} -> ${i.href}`);
  }
}

await browser.close();
