import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const { query } = JSON.parse(readFileSync(join(process.cwd(), ".migration-chunks/migration_5_fixed.json"), "utf8"));
const marker = "-- 3. Create indexes";
const i = query.indexOf(marker);
writeFileSync(join(process.cwd(), ".migration-chunks/m5_part1.sql"), query.slice(0, i));
writeFileSync(join(process.cwd(), ".migration-chunks/m5_part2.sql"), query.slice(i));
console.log("part1", query.slice(0, i).length, "part2", query.slice(i).length);
