/**
 * Exploração da tela do ponto: descobre a estrutura real do login e do menu
 * de relatórios, para daí escrevermos os seletores definitivos do robô.
 *
 *   cd rpa && npx tsx src/explore-login.ts
 *
 * Não altera nada no sistema — só navega, tira screenshots e imprime os
 * campos/links encontrados. Roda com navegador visível (headless: false).
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
const EMPRESA = env.NOBRIPONTO_FRONT_EMPRESA ?? "";
const USUARIO = env.NOBRIPONTO_FRONT_USUARIO ?? "";
const SENHA = env.NOBRIPONTO_FRONT_SENHA ?? "";

const shot = (n: string) => join("screenshots", `${n}.png`);

async function main() {
  const browser = await chromium.launch({ headless: false, slowMo: 300 });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  console.log(`\n=== 1. abrindo ${URL}`);
  await page.goto(URL, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);
  console.log("URL final:", page.url());
  console.log("título:", await page.title());
  await page.screenshot({ path: shot("01-login"), fullPage: true });

  console.log("\n=== 2. campos de formulário encontrados");
  for (const el of await page.locator("input, select, button").all()) {
    const [tag, type, name, id, ph, value, text] = await Promise.all([
      el.evaluate((e) => e.tagName.toLowerCase()),
      el.getAttribute("type"),
      el.getAttribute("name"),
      el.getAttribute("id"),
      el.getAttribute("placeholder"),
      el.getAttribute("value"),
      el.innerText().catch(() => ""),
    ]);
    const visible = await el.isVisible().catch(() => false);
    if (!visible) continue;
    console.log(
      `  <${tag}> type=${type ?? "-"} name=${name ?? "-"} id=${id ?? "-"} placeholder=${ph ?? "-"} value=${(value ?? "").slice(0, 20)} text="${(text ?? "").trim().slice(0, 30)}"`
    );
  }

  console.log("\n=== 3. iframes (sistemas legados costumam usar)");
  for (const f of page.frames()) console.log(`  frame: ${f.name() || "(sem nome)"} -> ${f.url()}`);

  if (USUARIO && SENHA) {
    console.log(`\n=== 4. tentando login (empresa=${EMPRESA}, usuário=${USUARIO})`);
    // preenche pelos campos visíveis, na ordem em que aparecem
    const texts = page.locator('input[type="text"]:visible, input:not([type]):visible');
    const pass = page.locator('input[type="password"]:visible');
    const nText = await texts.count();
    if (nText >= 2 && EMPRESA) {
      await texts.nth(0).fill(EMPRESA);
      await texts.nth(1).fill(USUARIO);
    } else if (nText >= 1) {
      await texts.nth(0).fill(USUARIO);
    }
    if (await pass.count()) await pass.first().fill(SENHA);
    await page.screenshot({ path: shot("02-preenchido"), fullPage: true });

    const submit = page.locator(
      'button[type="submit"]:visible, input[type="submit"]:visible, button:has-text("Entrar"):visible, button:has-text("Acessar"):visible'
    );
    if (await submit.count()) {
      await submit.first().click();
      await page.waitForTimeout(6000);
    }
    console.log("URL após login:", page.url());
    console.log("título:", await page.title());
    await page.screenshot({ path: shot("03-pos-login"), fullPage: true });

    console.log("\n=== 5. links/menus visíveis após login");
    const seen = new Set<string>();
    for (const el of await page.locator("a:visible, [role=menuitem]:visible, button:visible").all()) {
      const t = ((await el.innerText().catch(() => "")) ?? "").trim().replace(/\s+/g, " ");
      const href = (await el.getAttribute("href")) ?? "";
      if (!t || seen.has(t)) continue;
      seen.add(t);
      console.log(`  "${t.slice(0, 45)}" -> ${href.slice(0, 60)}`);
    }
  }

  console.log("\n=== screenshots em rpa/screenshots/ — navegador fica aberto 60s");
  await page.waitForTimeout(60000);
  await browser.close();
}

main().catch((e) => {
  console.error("[explore] falha:", e);
  process.exit(1);
});
