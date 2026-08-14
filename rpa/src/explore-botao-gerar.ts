/**
 * Descobre qual elemento dispara a geração do relatório em relFaltaJustificada.do
 * (o botão principal "Filtrar/Gerar" e o eventual modal de confirmação).
 *
 *   cd rpa && npx tsx src/explore-botao-gerar.ts
 */
import { login } from "./login.js";

const { browser, page } = await login({ headless: false });
await page.goto("https://www.nobriponto.com.br/relFaltaJustificada.do", {
  waitUntil: "networkidle",
  timeout: 60000,
});
await page.waitForTimeout(3000);

console.log("=== TODOS os elementos clicáveis (visíveis) com posição");
const clicaveis = await page.evaluate(() =>
  [...document.querySelectorAll("button, input[type=button], input[type=submit], a.btn, div[onclick], span[onclick], .btnPadraoDashboard")]
    .map((el) => {
      const e = el as HTMLElement;
      const r = e.getBoundingClientRect();
      return {
        tag: el.tagName.toLowerCase(),
        id: e.id || null,
        cls: (e.className ?? "").toString().slice(0, 40),
        texto: (e.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 30) || (e as HTMLInputElement).value || null,
        onclick: el.getAttribute("onclick")?.slice(0, 80) ?? null,
        vis: r.width > 0 && r.height > 0,
        pos: `${Math.round(r.x)},${Math.round(r.y)}`,
      };
    })
    .filter((e) => e.vis)
);
for (const c of clicaveis) {
  console.log(`  <${c.tag}> id=${c.id} class=${c.cls} pos=${c.pos} txt="${c.texto ?? ""}" onclick=${c.onclick ?? "-"}`);
}

console.log("\n=== funções Manage.* disponíveis (a que gera o relatório está aqui)");
const fns = await page.evaluate(() => {
  const w = window as unknown as { Manage?: Record<string, unknown> };
  if (!w.Manage) return [];
  return Object.keys(w.Manage).filter((k) => typeof w.Manage![k] === "function");
});
console.log("  ", fns.join(", ") || "(Manage não encontrado)");

console.log("\n=== clicando no botão de filtrar/gerar para ver o que acontece");
const btn = page.locator('input[type=button][value*="Filtrar" i], button:has-text("Filtrar"), .btnPadraoDashboard').first();
if (await btn.count()) {
  console.log("  botão encontrado:", await btn.getAttribute("value"), await btn.innerText().catch(() => ""));
  await btn.click();
  await page.waitForTimeout(4000);
  await page.screenshot({ path: "screenshots/gerar-01-pos-click.png", fullPage: true });
  console.log("\n  === elementos visíveis APÓS o clique (modal?)");
  for (const el of await page.locator("button:visible, input[type=button]:visible, a.btn:visible").all()) {
    const t = ((await el.innerText().catch(() => "")) ?? "").trim() || (await el.getAttribute("value")) || "";
    const onclick = await el.getAttribute("onclick");
    if (t || onclick) console.log(`     "${t.slice(0, 30)}" onclick=${(onclick ?? "-").slice(0, 60)}`);
  }
}

console.log("\nnavegador aberto 180s — observe a tela");
await page.waitForTimeout(180000);
await browser.close();
