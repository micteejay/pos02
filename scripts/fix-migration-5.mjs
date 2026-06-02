import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const p = join(process.cwd(), "supabase/migrations/20260405091616_acdda2f5-915a-47a8-a1a2-ec1ba21fef34.sql");
let q = readFileSync(p, "utf8");
const sub = "(SELECT id FROM public.company_profiles ORDER BY created_at NULLS LAST LIMIT 1)";
q = q.replace(/'3684e57e-306b-4303-b3c0-0ad5f2725877'/g, sub);
writeFileSync(
  join(process.cwd(), ".migration-chunks/migration_5_fixed.json"),
  JSON.stringify({ name: "acdda2f5_915a_47a8_a1a2_ec1ba21fef34", query: q })
);
console.log("written", q.length);
