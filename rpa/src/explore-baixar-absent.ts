/** Descobre o mecanismo de download em relAbsenteismo.do. */
import { login } from "./login.js";

const { browser, page } = await login({ headless: false });
await page.goto("https://www.nobriponto.com.br/relAbsenteismo.do", {
  waitUntil: "networkidle",
  timeout: 60000,
});
await page.waitForTimeout(3000);

console.log("=== elementos com 'Baixar'/'Visualizar' (qualquer tag)");
const alvos = await page.evaluate(() =>
  [...document.querySelectorAll("*")]
    .filter((el) => {
      const t = (el.textContent ?? "").trim();
      return (
        /^(Baixar|Visualizar)$/i.test(t) && el.children.length === 0
      );
    })
    .map((el) => {
      const e = el as HTMLElement;
      const r = e.getBoundingClientRect();
      return {
        tag: el.tagName.toLowerCase(),
        id: e.id || null,
        cls: (e.className ?? "").toString().slice(0, 50),
        texto: (e.textContent ?? "").trim(),
        onclick: el.getAttribute("onclick")?.slice(0, 80) ?? null,
        paiTag: el.parentElement?.tagName.toLowerCase() ?? null,
        paiId: el.parentElement?.id || null,
        paiOnclick: el.parentElement?.getAttribute("onclick")?.slice(0, 80) ?? null,
        vis: r.width > 0 && r.height > 0,
      };
    })
);
for (const a of alvos) console.log(" ", JSON.stringify(a));

console.log("\n=== funções Manage.*");
console.log(
  "  ",
  (
    await page.evaluate(() => {
      const w = window as unknown as { Manage?: Record<string, unknown> };
      return w.Manage ? Object.keys(w.Manage).filter((k) => typeof w.Manage![k] === "function") : [];
    })
  ).join(", ")
);

await page.screenshot({ path: "screenshots/absent-tela.png", fullPage: true });
console.log("\nscreenshot salvo; navegador aberto 60s");
await page.waitForTimeout(60000);
await browser.close();
