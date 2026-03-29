import { Pool } from "pg";
import { env } from "./env";

export const pool = new Pool({
  // Usamos la URL completa que ya tienes en el .env
  connectionString: process.env.DATABASE_URL,

  // Configuración de rendimiento
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000, // Subimos a 5s para evitar el timeout que vimos antes

  // CRÍTICO: Supabase requiere SSL para conexiones externas (puerto 6543)
  ssl: {
    rejectUnauthorized: false,
  },
});

// Manejo de errores para evitar que el servidor se caiga sin explicación
pool.on("error", (err) => {
  console.error(
    "⚠️ Error inesperado en el pool de base de datos:",
    err.message,
  );
});

// Helper para consultas simples
export const query = (text: string, params?: any[]) => pool.query(text, params);

// Helper para transacciones (usar cuando necesites BEGIN/COMMIT)
export const getClient = () => pool.connect();
