import pg from "pg";
import { writeFileSync } from "fs";
import { join } from "path";

const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;

if (!connectionString) {
  console.error("Error: DATABASE_URL or SUPABASE_DB_URL environment variable is not defined in .env file.");
  console.error("Please add it to your .env file, e.g.:");
  console.error("DATABASE_URL=\"postgresql://postgres:[password]@db.[project-id].supabase.co:5432/postgres\"");
  process.exit(1);
}

async function dumpDatabase() {
  console.log("Connecting to database...");
  const client = new pg.Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });
  
  await client.connect();
  console.log("Connected successfully!");

  try {
    // 1. Get all user tables in public schema
    console.log("Fetching list of tables...");
    const tablesRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);

    const tableNames = tablesRes.rows.map(row => row.table_name);
    console.log(`Found ${tableNames.length} tables:`, tableNames.join(", "));

    const dumpData = {};

    // 2. Fetch rows for each table
    for (const tableName of tableNames) {
      console.log(`Fetching rows from table "${tableName}"...`);
      try {
        const rowsRes = await client.query(`SELECT * FROM public."${tableName}"`);
        dumpData[tableName] = rowsRes.rows;
        console.log(`  Fetched ${rowsRes.rows.length} rows.`);
      } catch (err) {
        console.error(`  Error fetching from table "${tableName}":`, err.message);
        dumpData[tableName] = { error: err.message };
      }
    }

    // 3. Save to JSON file
    const outputPath = join(process.cwd(), "database_rows_dump.json");
    writeFileSync(outputPath, JSON.stringify(dumpData, null, 2), "utf8");
    console.log(`\nSuccess! All table data has been written to: ${outputPath}`);

  } catch (err) {
    console.error("Database query error:", err);
  } finally {
    await client.end();
    console.log("Database connection closed.");
  }
}

dumpDatabase();
