import { readFileSync, writeFileSync } from "fs";

const sql = readFileSync(process.argv[2], "utf8");
const out = sql.replace(
  /CREATE POLICY "([^"]+)" ON (public\.\w+) FOR/g,
  (match, policy, table) => {
    const [schema, tablename] = table.replace("public.", "public|").split("|");
    return `DROP POLICY IF EXISTS "${policy}" ON ${table};\nCREATE POLICY "${policy}" ON ${table} FOR`;
  }
);
writeFileSync(process.argv[3], out);
