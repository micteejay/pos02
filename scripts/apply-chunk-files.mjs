/**
 * Prints JSON lines {name, query} for each chunk file arg.
 * Parent agent reads stdout and calls MCP apply_migration per line.
 */
import { readFileSync } from "fs";

for (const arg of process.argv.slice(2)) {
  const [name, path] = arg.split("|");
  const query = readFileSync(path, "utf8");
  console.log(JSON.stringify({ name, query }));
}
