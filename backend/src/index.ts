import express from "express";
import cors from "cors";
import { env } from "./config/env";
import { errorHandler } from "./middleware/errorHandler";

// Routes
import authRoutes from "./modules/auth/auth.routes";
import usersRoutes from "./modules/users/users.routes";
import categoriesRoutes from "./modules/categories/categories.routes";
import productsRoutes from "./modules/products/products.routes";
import ordersRoutes from "./modules/orders/orders.routes";
import tablesRoutes from "./modules/tables/tables.routes";
import inventoryRoutes from "./modules/inventory/inventory.routes";
import dashboardRoutes from "./modules/dashboard/dashboard.routes";

const app = express();

// Middleware
app.use(cors({ origin: env.cors.origin, credentials: true }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Health check
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
  });
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/categories", categoriesRoutes);
app.use("/api/products", productsRoutes);
app.use("/api/orders", ordersRoutes);
app.use("/api/tables", tablesRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/dashboard", dashboardRoutes);

// Error handler
app.use(errorHandler);

// Start server
app.listen(env.port, () => {
  console.log(`
  ╔═══════════════════════════════════════════╗
  ║   🍽️  POS Restaurant API Server           ║
  ║   Running on port ${env.port}                   ║
  ║   Environment: ${env.nodeEnv}             ║
  ╚═══════════════════════════════════════════╝
  `);
});

export default app;
