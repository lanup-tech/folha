/** Mapeia os selects/botões da tela relAbsenteismo.do. */
import { login } from "./login.js";

const { browser, page } = await login({ headless: true });
await page.goto("https://www.nobriponto.com.br/relAbsenteismo.do", {
  waitUntil: "networkidle",
  timeout: 60000,
});
await page.waitForTimeout(3000);

console.log("=== selects");
for (const sel of await page.locator("select").all()) {
  const id = await sel.getAttribute("id");
  const name = await sel.getAttribute("name");
  const mult = await sel.getAttribute("multiple");
  const opts = await sel.locator("option").allInnerTexts();
  console.log(`  #${id ?? "-"} name=${name ?? "-"} multiple=${mult !== null} (${opts.length}): ${opts.slice(0, 5).join(" | ")}`);
}

console.log("\n=== botões com texto");
for (const el of await page.locator("button, input[type=button], a.btn").all()) {
  const t = ((await el.innerText().catch(() => "")) ?? "").trim() || (await el.getAttribute("value")) || "";
  const vis = await el.isVisible().catch(() => false);
  if (t) console.log(`  "${t.slice(0, 30)}" visivel=${vis}`);
}
await browser.close();
