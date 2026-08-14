/**
 * Mapeia TODOS os formulários e inputs da tela de login (inclusive ocultos),
 * para descobrir qual é o form de acesso à plataforma.
 *
 *   cd rpa && npx tsx src/explore-forms.ts
 */
import { chromium } from "playwright";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const env: Record<string, string> = {};
for (const line of readFileSync(join("..", ".env.local"), "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2].trim();
}

const browser = await chromium.launch({ headless: false });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(env.NOBRIPONTO_FRONT_URL ?? "https://www.nobriponto.com.br/", {
  waitUntil: "networkidle",
  timeout: 60000,
});
await page.waitForTimeout(5000);

const forms = await page.evaluate(() =>
  [...document.querySelectorAll("form")].map((f, i) => ({
    idx: i,
    id: f.id,
    name: f.getAttribute("name"),
    action: f.getAttribute("action"),
    method: f.getAttribute("method"),
    visivel: !!(f.offsetWidth || f.offsetHeight || f.getClientRects().length),
    campos: [...f.querySelectorAll("input, select, button")].map((el) => {
      const e = el as HTMLInputElement;
      return {
        tag: el.tagName.toLowerCase(),
        type: e.type ?? null,
        name: e.name || null,
        id: e.id || null,
        placeholder: e.placeholder || null,
        visivel: !!(e.offsetWidth || e.offsetHeight || e.getClientRects().length),
        texto: (el.textContent ?? "").trim().slice(0, 25) || null,
      };
    }),
  }))
);

for (const f of forms) {
  console.log(
    `\n=== form[${f.idx}] id=${f.id || "-"} name=${f.name || "-"} action=${f.action || "-"} method=${f.method || "-"} VISÍVEL=${f.visivel}`
  );
  for (const c of f.campos) {
    console.log(
      `   <${c.tag}> type=${c.type} name=${c.name} id=${c.id} ph=${c.placeholder} vis=${c.visivel} "${c.texto ?? ""}"`
    );
  }
}

// links/botões que abrem o login
console.log("\n=== elementos clicáveis com texto de acesso");
for (const el of await page.locator("a, button, div[onclick], span[onclick]").all()) {
  const t = ((await el.innerText().catch(() => "")) ?? "").trim().replace(/\s+/g, " ");
  if (!t) continue;
  if (/acess|entrar|login|plataforma|gest|admin/i.test(t)) {
    const onclick = await el.getAttribute("onclick");
    const href = await el.getAttribute("href");
    console.log(`   "${t.slice(0, 40)}" href=${href ?? "-"} onclick=${(onclick ?? "-").slice(0, 60)}`);
  }
}

await page.screenshot({ path: "screenshots/forms-01.png", fullPage: true });
console.log("\nnavegador aberto 60s");
await page.waitForTimeout(60000);
await browser.close();
