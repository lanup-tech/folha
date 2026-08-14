/**
 * Mapeia a tela de RELATÓRIO Abono / Faltas Justificadas (relFaltaJustificada.do):
 * filtros de período, motivos, empresas e as opções de exportação.
 *
 *   cd rpa && npx tsx src/explore-rel-abono.ts
 */
import { login } from "./login.js";

const { browser, page } = await login({ headless: false });

await page.goto("https://www.nobriponto.com.br/relFaltaJustificada.do", {
  waitUntil: "networkidle",
  timeout: 60000,
});
await page.waitForTimeout(4000);
console.log("URL:", page.url(), "| título:", await page.title());
await page.screenshot({ path: "screenshots/relabono-01.png", fullPage: true });

console.log("\n=== campos (inclusive ocultos, para entender a estrutura)");
const campos = await page.evaluate(() =>
  [...document.querySelectorAll("input, select, textarea, button")].map((el) => {
    const e = el as HTMLInputElement;
    return {
      tag: el.tagName.toLowerCase(),
      type: e.type ?? null,
      id: e.id || null,
      name: e.name || null,
      ph: e.placeholder || null,
      val: (e.value ?? "").slice(0, 20) || null,
      vis: !!(e.offsetWidth || e.offsetHeight || e.getClientRects().length),
      texto: (el.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 30) || null,
      onclick: el.getAttribute("onclick")?.slice(0, 70) ?? null,
    };
  })
);
for (const c of campos) {
  if (!c.vis && c.type === "hidden") continue;
  console.log(
    `  <${c.tag}> type=${c.type} id=${c.id} name=${c.name} ph=${c.ph} vis=${c.vis} val="${c.val ?? ""}" txt="${c.texto ?? ""}" onclick=${c.onclick ?? "-"}`
  );
}

console.log("\n=== selects e opções");
for (const sel of await page.locator("select").all()) {
  const id = await sel.getAttribute("id");
  const vis = await sel.isVisible();
  const opts = await sel.locator("option").allInnerTexts();
  console.log(`  select#${id ?? "-"} vis=${vis} (${opts.length} opções): ${opts.slice(0, 10).join(" | ")}`);
}

console.log("\n=== checkboxes (motivos / empresas / opções do relatório)");
for (const cb of await page.locator('input[type=checkbox]').all()) {
  const [id, name, vis, checked] = await Promise.all([
    cb.getAttribute("id"),
    cb.getAttribute("name"),
    cb.isVisible(),
    cb.isChecked().catch(() => false),
  ]);
  const label = await cb
    .evaluate((e) => (e.closest("label")?.textContent ?? e.parentElement?.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 45))
    .catch(() => "");
  console.log(`  [${checked ? "x" : " "}] id=${id ?? "-"} name=${name ?? "-"} vis=${vis} "${label}"`);
}

console.log("\n=== textos de exportação/geração na página");
const txt = await page.locator("body").innerText();
for (const linha of txt.split("\n").map((l) => l.trim()).filter(Boolean)) {
  if (/export|xls|excel|pdf|gerar|filtrar|imprimir|csv/i.test(linha)) console.log("   ", linha.slice(0, 80));
}

console.log("\nnavegador aberto 180s");
await page.waitForTimeout(180000);
await browser.close();
