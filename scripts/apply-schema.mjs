/**
 * Aplica o schema no Supabase (migrations + seed):
 *
 *   node scripts/apply-schema.mjs            # roda migrations + seed
 *   node scripts/apply-schema.mjs --só-seed  # roda apenas o seed
 *
 * Requer SUPABASE_DB_URL no .env.local — a connection string do Postgres:
 * Supabase Dashboard -> Settings -> Database -> Connection string (URI),
 * substituindo [YOUR-PASSWORD] pela senha do banco.
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import pg from "pg";

const env = {};
if (existsSync(".env.local")) {
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2];
  }
}
if (!env.SUPABASE_DB_URL) {
  console.error(
    "SUPABASE_DB_URL ausente no .env.local.\n" +
      "Pegue em: Supabase -> Settings -> Database -> Connection string (URI)\n" +
      "e cole com a senha no lugar de [YOUR-PASSWORD]."
  );
  process.exit(1);
}

const onlySeed = process.argv.includes("--só-seed") || process.argv.includes("--so-seed");
const client = new pg.Client({
  connectionString: env.SUPABASE_DB_URL,
  ssl: { rejectUnauthorized: false },
});

await client.connect();
try {
  if (!onlySeed) {
    for (const file of readdirSync("supabase/migrations").sort()) {
      if (!file.endsWith(".sql")) continue;
      process.stdout.write(`[schema] migrations/${file} ... `);
      await client.query(readFileSync(join("supabase/migrations", file), "utf8"));
      console.log("OK");
    }
  }
  process.stdout.write("[schema] seed.sql ... ");
  await client.query(readFileSync("supabase/seed.sql", "utf8"));
  console.log("OK");

  const { rows } = await client.query(
    "select (select count(*) from clients) as clients, (select count(*) from companies) as companies, (select count(*) from absence_reasons) as motivos"
  );
  console.log(`[schema] verificação: ${JSON.stringify(rows[0])}`);
} finally {
  await client.end();
}
