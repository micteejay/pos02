import { readFileSync } from "fs";
import pg from "pg";

const query = readFileSync(process.argv[2], "utf8");
const url = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
if (!url) {
  console.error("Set DATABASE_URL or SUPABASE_DB_URL");
  process.exit(1);
}
const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await client.connect();
try {
  await client.query(query);
  console.log("OK", process.argv[2]);
} catch (e) {
  console.error("FAIL", e.message);
  process.exit(1);
} finally {
  await client.end();
}
