/**
 * Reproduz o fluxo do Absenteísmo até o clique em Baixar, monitorando
 * requisições e diálogos para entender por que o download não vem.
 */
import { login } from "./login.js";

const { browser, page } = await login({ headless: false });

page.on("dialog", async (d) => {
  console.log(`  [dialog ${d.type()}] ${d.message()}`);
  await d.accept().catch(() => {});
});
page.on("request", (r) => {
  if (r.method() === "POST" || /relatorio|download|xls|pdf/i.test(r.url()))
    console.log(`  [req ${r.method()}] ${r.url().slice(0, 110)}`);
});
page.on("response", (r) => {
  if (/relatorio|download|xls|pdf/i.test(r.url()))
    console.log(`  [resp ${r.status()}] ${r.url().slice(0, 110)} ct=${r.headers()["content-type"]?.slice(0, 40)}`);
});
page.on("popup", (p) => console.log(`  [popup] ${p.url().slice(0, 110)}`));

await page.goto("https://www.nobriponto.com.br/relAbsenteismo.do", { waitUntil: "networkidle" });
await page.waitForTimeout(2500);

await page.evaluate(() => {
  for (const [id, v] of [
    ["inicio", "01/08/2026"],
    ["fim", "31/08/2026"],
  ]) {
    const el = document.getElementById(id) as HTMLInputElement | null;
    if (el) {
      el.value = v;
      el.dispatchEvent(new Event("change", { bubbles: true }));
    }
  }
});

const add = page.locator(':text("Adicionar todos")');
for (let i = 0; i < (await add.count()); i += 1) {
  await add.nth(i).click().catch(() => {});
  await page.waitForTimeout(1200);
}
await page.selectOption("#extensao", { label: "XLSX" }).catch(() => {});
console.log("extensão:", await page.locator("#extensao").inputValue());

console.log("\n=== rolando até o rodapé e listando botões");
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await page.waitForTimeout(1500);
await page.screenshot({ path: "screenshots/absent-rodape.png", fullPage: true });

for (const el of await page.locator("button, input[type=button], a").all()) {
  const t = ((await el.innerText().catch(() => "")) ?? "").trim() || (await el.getAttribute("value")) || "";
  if (!/baixar|visualizar/i.test(t)) continue;
  const vis = await el.isVisible();
  console.log(`  "${t}" visivel=${vis} tag=${await el.evaluate((e) => e.tagName)}`);
  if (vis && /baixar/i.test(t)) {
    console.log("  -> clicando…");
    await el.click();
    await page.waitForTimeout(15000);
  }
}

console.log("\n=== estado final");
console.log("URL:", page.url());
await page.screenshot({ path: "screenshots/absent-pos-baixar.png", fullPage: true });
const corpo = (await page.locator("body").innerText()).split("\n").map((l) => l.trim()).filter(Boolean);
for (const l of corpo.slice(0, 25)) console.log("  ", l.slice(0, 90));

console.log("\nnavegador aberto 90s");
await page.waitForTimeout(90000);
await browser.close();
