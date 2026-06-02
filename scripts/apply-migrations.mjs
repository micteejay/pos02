/**
 * Reads supabase/migrations/*.sql in order and prints migration names + SQL length.
 * Use with Supabase MCP apply_migration (one file per invocation).
 */
import { readdirSync, readFileSync } from "fs";
import { join } from "path";

const dir = join(process.cwd(), "supabase", "migrations");
const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
const index = Number(process.argv[2] ?? -1);

if (index < 0) {
  files.forEach((f, i) => {
    const sql = readFileSync(join(dir, f), "utf8");
    const name = f.replace(/^\d+_/, "").replace(/\.sql$/, "").replace(/-/g, "_").slice(0, 60);
    console.log(`${i}\t${f}\t${name}\t${sql.length}`);
  });
} else {
  const f = files[index];
  if (!f) {
    console.error("Invalid index");
    process.exit(1);
  }
  const sql = readFileSync(join(dir, f), "utf8");
  const name = f.replace(/^\d+_/, "").replace(/\.sql$/, "").replace(/-/g, "_").slice(0, 60);
  process.stdout.write(JSON.stringify({ name, query: sql }));
}
