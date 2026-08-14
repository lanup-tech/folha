/**
 * Inspeção profunda da tela do ponto: espera o app JS montar, varre o DOM
 * (inclusive shadow DOM e iframes) e imprime o que existe de fato.
 *
 *   cd rpa && npx tsx src/explore-dom.ts
 */
import { chromium } from "playwright";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const env: Record<string, string> = {};
for (const line of readFileSync(join("..", ".env.local"), "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2].trim();
}
const URL = env.NOBRIPONTO_FRONT_URL ?? "https://www.nobriponto.com.br/";

const browser = await chromium.launch({ headless: false });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

page.on("console", (m) => console.log(`  [console:${m.type()}] ${m.text().slice(0, 120)}`));
page.on("requestfailed", (r) =>
  console.log(`  [req falhou] ${r.url().slice(0, 100)} — ${r.failure()?.errorText}`)
);

console.log(`=== abrindo ${URL} e aguardando o app montar`);
await page.goto(URL, { waitUntil: "networkidle", timeout: 60000 });
await page.waitForTimeout(8000);

console.log("\nURL:", page.url(), "| título:", await page.title());

const info = await page.evaluate(() => {
  const out: Record<string, unknown> = {};
  out.bodyChars = document.body?.innerText?.length ?? 0;
  out.bodyPreview = (document.body?.innerText ?? "").slice(0, 400);
  out.htmlChars = document.documentElement.outerHTML.length;
  out.inputs = document.querySelectorAll("input").length;
  out.forms = document.querySelectorAll("form").length;
  out.iframes = [...document.querySelectorAll("iframe")].map((f) => f.getAttribute("src"));
  out.scripts = [...document.querySelectorAll("script[src]")]
    .map((s) => s.getAttribute("src"))
    .slice(0, 12);
  // elementos com shadow root aberto
  const shadows: string[] = [];
  document.querySelectorAll("*").forEach((el) => {
    if ((el as Element & { shadowRoot?: ShadowRoot }).shadowRoot) shadows.push(el.tagName.toLowerCase());
  });
  out.shadowHosts = shadows.slice(0, 10);
  return out;
});
console.log("\n=== DOM");
console.log(JSON.stringify(info, null, 1));

console.log("\n=== links encontrados no HTML bruto");
const html = await page.content();
const hrefs = [...html.matchAll(/href="([^"]+)"/g)].map((m) => m[1]);
for (const h of [...new Set(hrefs)].slice(0, 25)) console.log("  ", h);

await page.screenshot({ path: "screenshots/dom-01.png", fullPage: true });
console.log("\n=== screenshot: rpa/screenshots/dom-01.png · navegador aberto 90s");
await page.waitForTimeout(90000);
await browser.close();
