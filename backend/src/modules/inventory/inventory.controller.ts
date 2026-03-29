import { Response } from "express";
import { AuthRequest } from "../../middleware/auth";
import { InventoryService } from "./inventory.service";

const service = new InventoryService();

export class InventoryController {
  async getAll(req: AuthRequest, res: Response): Promise<void> {
    try {
      const inventory = await service.getAll(req.user!.branchId);
      res.json(inventory);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getLowStock(req: AuthRequest, res: Response): Promise<void> {
    try {
      const items = await service.getLowStock(req.user!.branchId);
      res.json(items);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async restock(req: AuthRequest, res: Response): Promise<void> {
    try {
      // CORRECCIÓN: Ahora pasamos 4 argumentos: id, userId, branchId, y el body
      const result = await service.restock(
        req.params.id,
        req.user!.id,
        req.user!.branchId,
        req.body,
      );
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async adjust(req: AuthRequest, res: Response): Promise<void> {
    try {
      // Nota: Si decides aplicar seguridad de branchId en adjust,
      // recuerda añadir req.user!.branchId aquí también.
      const result = await service.adjust(
        req.params.id,
        req.user!.id,
        req.body,
      );
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async getMovements(req: AuthRequest, res: Response): Promise<void> {
    try {
      const movements = await service.getMovements(req.params.id);
      res.json(movements);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}
