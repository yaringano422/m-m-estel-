import { Client } from "pg";
import dotenv from "dotenv";

dotenv.config();

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

async function test() {
  try {
    await client.connect();
    console.log("✅ Conectado a Supabase correctamente");
    await client.end();
  } catch (error) {
    console.error("❌ Error conectando:", error);
  }
}

test();
