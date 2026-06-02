import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const file = process.argv[2];
const namePrefix = process.argv[3];
const parts = process.argv.slice(4).map((p) => p.split("-").map(Number));

const sql = readFileSync(file, "utf8");
const lines = sql.split("\n");
const outDir = join(process.cwd(), ".migration-chunks");

parts.forEach(([start, end], i) => {
  const chunk = lines.slice(start - 1, end).join("\n");
  const out = join(outDir, `${namePrefix}_part${i + 1}.sql`);
  writeFileSync(out, chunk);
  console.log(`${namePrefix}_part${i + 1}: ${chunk.length} bytes (lines ${start}-${end})`);
});
