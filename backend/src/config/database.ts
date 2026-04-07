import { Pool } from "pg";
import { env } from "./env";

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,

  // Configuración de rendimiento
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,

  ssl: {
    rejectUnauthorized: false,
  },
});

pool.on("error", (err) => {
  console.error(
    "⚠️ Error inesperado en el pool de base de datos:",
    err.message,
  );
});

export const query = (text: string, params?: any[]) => pool.query(text, params);

export const getClient = () => pool.connect();
