import { Router } from "express";
import { InventoryController } from "./inventory.controller";
import { authenticate } from "../../middleware/auth";
import { authorize } from "../../middleware/roles";

const router = Router();
const controller = new InventoryController();

router.use(authenticate);

router.get("/", (req, res) => controller.getAll(req, res));
router.get("/low-stock", (req, res) => controller.getLowStock(req, res));
router.get("/:id/movements", (req, res) => controller.getMovements(req, res));

router.post("/:id/restock", authorize("admin", "manager"), (req, res) =>
  controller.restock(req, res),
);

router.post("/:id/adjust", authorize("admin", "manager"), (req, res) =>
  controller.adjust(req, res),
);

export default router;
