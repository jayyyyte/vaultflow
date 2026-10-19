import { migrate } from "drizzle-orm/libsql/migrator";
import { db, client } from "../src/db";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config();

async function runMigrate() {
  console.log("Running Drizzle migrations on database...");
  try {
    await migrate(db, { migrationsFolder: "./drizzle" });
    console.log("✓ Migrations applied successfully!");
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  } finally {
    client.close();
  }
}

runMigrate();
