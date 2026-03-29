import { Response } from "express";
import { AuthRequest } from "../../middleware/auth";
import { TablesService } from "./tables.service";

const service = new TablesService();

export class TablesController {
  async getAll(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tables = await service.getAll((req.user as any).branchId);
      res.json(tables);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
      console.error("ERROR REAL EN EL BACKEND:", error);
    }
  }

  async create(req: AuthRequest, res: Response): Promise<void> {
    try {
      const table = await service.create(req.user!.branchId, req.body);
      res.status(201).json(table);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async update(req: AuthRequest, res: Response): Promise<void> {
    try {
      const table = await service.update(req.params.id, req.body);
      res.json(table);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async updateStatus(req: AuthRequest, res: Response): Promise<void> {
    try {
      const table = await service.updateStatus(req.params.id, req.body.status);
      res.json(table);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async delete(req: AuthRequest, res: Response): Promise<void> {
    try {
      const result = await service.delete(req.params.id);
      res.json(result);
    } catch (error: any) {
      res.status(404).json({ error: error.message });
    }
  }
}
