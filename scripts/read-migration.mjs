import { readFileSync, readdirSync } from "fs";
import { join } from "path";

const dir = join(process.cwd(), "supabase", "migrations");
const file = process.argv[2];
if (!file) {
  const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
  console.log(JSON.stringify(files));
} else {
  const sql = readFileSync(join(dir, file), "utf8");
  process.stdout.write(sql);
}
