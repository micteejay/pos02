/**
 * Applies .migration-chunks/exec_*.sql via Supabase MCP is external.
 * Outputs migration index payloads for migrations 1-12.
 */
import { readdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";

const dir = join(process.cwd(), "supabase", "migrations");
const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
const outDir = join(process.cwd(), ".migration-chunks");

files.forEach((f, i) => {
  if (i === 0) return; // migration 0 applied via repair chunks
  const sql = readFileSync(join(dir, f), "utf8");
  const name = f.replace(/^\d+_/, "").replace(/\.sql$/, "").replace(/-/g, "_").slice(0, 60);
  writeFileSync(join(outDir, `migration_${i}.json`), JSON.stringify({ name, query: sql }));
  console.log(i, name, sql.length);
});

console.log("exec files:", ["exec_rls2.sql", "exec_rls3.sql", "exec_idx.sql"].map((f) => readFileSync(join(outDir, f), "utf8").length));
