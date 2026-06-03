import { readFileSync } from "fs";

const csvPath = "c:\\Users\\XMOLE GOLD\\Downloads\\query-results-export-2026-06-03_08-20-19.csv";

try {
  const content = readFileSync(csvPath, "utf8");
  const jsonStartIndex = content.indexOf('"{');
  let rawJson = content.slice(jsonStartIndex + 1);
  if (rawJson.endsWith('"\n') || rawJson.endsWith('"\r\n')) {
    rawJson = rawJson.trim().slice(0, -1);
  }
  let jsonString = rawJson.replace(/""/g, '"');
  jsonString = jsonString.trim();
  if (jsonString.endsWith('"')) {
    jsonString = jsonString.slice(0, -1);
  }

  const parsed = JSON.parse(jsonString);
  console.log("Profiles in the database:");
  console.log(JSON.stringify(parsed.profiles, null, 2));
} catch (err) {
  console.error("Error:", err.message);
}
