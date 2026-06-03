import { readFileSync } from "fs";
import { join } from "path";

const csvPath = "c:\\Users\\XMOLE GOLD\\Downloads\\query-results-export-2026-06-03_08-20-19.csv";

try {
  const content = readFileSync(csvPath, "utf8");
  // Find first occurrence of JSON string (it starts after the header "database_dump")
  const jsonStartIndex = content.indexOf('"{');
  if (jsonStartIndex === -1) {
    console.error("Could not find JSON string in the CSV file.");
    process.exit(1);
  }

  // Get raw JSON string and clean up CSV quotes escaping
  let rawJson = content.slice(jsonStartIndex + 1);
  if (rawJson.endsWith('"\n') || rawJson.endsWith('"\r\n')) {
    rawJson = rawJson.trim().slice(0, -1);
  }
  // Replace double double quotes with single double quotes
  let jsonString = rawJson.replace(/""/g, '"');
  
  // Clean up trailing carriage returns or quotes
  jsonString = jsonString.trim();
  if (jsonString.endsWith('"')) {
    jsonString = jsonString.slice(0, -1);
  }

  try {
    const parsed = JSON.parse(jsonString);
    const tables = Object.keys(parsed);
    console.log("Tables found in database export:", tables);
    
    console.log("\nSample rows per table:");
    for (const table of tables) {
      const rows = parsed[table];
      if (Array.isArray(rows)) {
        console.log(`- ${table}: ${rows.length} rows`);
        if (rows.length > 0) {
          console.log(`  Columns:`, Object.keys(rows[0]));
        }
      } else {
        console.log(`- ${table}: not an array`, typeof rows);
      }
    }
  } catch (parseErr) {
    console.error("JSON Parse Error:", parseErr.message);
    const match = parseErr.message.match(/position (\d+)/);
    if (match) {
      const pos = parseInt(match[1]);
      console.log("Context around error position:");
      console.log(jsonString.slice(Math.max(0, pos - 100), Math.min(jsonString.length, pos + 100)));
    }
  }

} catch (err) {
  console.error("Error inspecting CSV:", err.message);
}
