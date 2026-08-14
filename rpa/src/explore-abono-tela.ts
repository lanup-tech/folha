/**
 * Abre Relatórios → Abono / Faltas Justificadas e mapeia os filtros
 * (período, motivos, empresas) e os botões de gerar/exportar.
 *
 *   cd rpa && npx tsx src/explore-abono-tela.ts
 */
import { login } from "./login.js";

const { browser, page } = await login({ headless: false });

// A tela tem URL própria (descoberta no menu): faltaJustificada.do
// Navegar direto é mais robusto que depender do menu lateral abrir.
console.log("=== abrindo faltaJustificada.do");
await page.goto("https://www.nobriponto.com.br/faltaJustificada.do", {
  waitUntil: "networkidle",
  timeout: 60000,
});
await page.waitForTimeout(4000);
await page.screenshot({ path: "screenshots/abono-01-tela.png", fullPage: true });
console.log("URL:", page.url(), "| título:", await page.title());

console.log("\n=== inputs/selects visíveis na tela do relatório");
for (const el of await page.locator("input:visible, select:visible, textarea:visible").all()) {
  const [tag, type, name, id, ph, val, cls] = await Promise.all([
    el.evaluate((e) => e.tagName.toLowerCase()),
    el.getAttribute("type"),
    el.getAttribute("name"),
    el.getAttribute("id"),
    el.getAttribute("placeholder"),
    el.inputValue().catch(() => ""),
    el.getAttribute("class"),
  ]);
  console.log(
    `  <${tag}> type=${type ?? "-"} id=${id ?? "-"} name=${name ?? "-"} ph=${ph ?? "-"} val="${(val ?? "").slice(0, 18)}" class=${(cls ?? "").slice(0, 35)}`
  );
}

console.log("\n=== botões / ações visíveis");
for (const el of await page.locator("button:visible, a.btn:visible, input[type=button]:visible, input[type=submit]:visible").all()) {
  const t = ((await el.innerText().catch(() => "")) ?? "").trim().replace(/\s+/g, " ");
  const id = await el.getAttribute("id");
  const onclick = await el.getAttribute("onclick");
  const val = await el.getAttribute("value");
  console.log(`  "${t || val || ""}" id=${id ?? "-"} onclick=${(onclick ?? "-").slice(0, 60)}`);
}

console.log("\n=== selects e suas opções (motivos/empresas costumam estar aqui)");
for (const sel of await page.locator("select:visible").all()) {
  const id = await sel.getAttribute("id");
  const opts = await sel.locator("option").allInnerTexts();
  console.log(`  select#${id ?? "-"} (${opts.length} opções): ${opts.slice(0, 8).join(" | ")}`);
}

console.log("\n=== checkboxes visíveis (motivos/empresas podem ser listas de check)");
for (const cb of await page.locator('input[type=checkbox]:visible').all()) {
  const id = await cb.getAttribute("id");
  const name = await cb.getAttribute("name");
  const checked = await cb.isChecked();
  const label = await cb
    .evaluate((e) => (e.closest("label")?.textContent ?? e.parentElement?.textContent ?? "").trim().slice(0, 40))
    .catch(() => "");
  console.log(`  [${checked ? "x" : " "}] id=${id ?? "-"} name=${name ?? "-"} "${label}"`);
}

console.log("\nnavegador aberto 180s para inspeção manual");
await page.waitForTimeout(180000);
await browser.close();
