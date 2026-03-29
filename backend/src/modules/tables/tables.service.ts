import { query } from "../../config/database";

export class TablesService {
  async getAll(branchId: string) {
    console.log("Consultando mesas para la sucursal:", branchId);

    if (!branchId || branchId === "undefined") {
      throw new Error("El branchId llegó vacío al servicio de mesas");
    }
    const result = await query(
      `SELECT t.*,
        o.id as current_order_id, o.order_number as current_order_number,
        o.total as current_order_total, o.status as current_order_status,
        u.first_name as waiter_first_name, u.last_name as waiter_last_name
       FROM restaurant_tables t
       LEFT JOIN orders o ON o.table_id = t.id AND o.status IN ('open', 'in_progress', 'ready', 'delivered')
       LEFT JOIN users u ON u.id = o.user_id
       WHERE t.branch_id = $1 AND t.is_active = true
       ORDER BY t.zone, t.number`,
      [branchId],
    );
    return result.rows.map((t) => ({
      id: t.id,
      number: t.number,
      name: t.name,
      capacity: t.capacity,
      status: t.status,
      zone: t.zone,
      positionX: parseFloat(t.position_x),
      positionY: parseFloat(t.position_y),
      currentOrder: t.current_order_id
        ? {
            id: t.current_order_id,
            orderNumber: t.current_order_number,
            total: t.current_order_total
              ? parseFloat(t.current_order_total)
              : 0,
            status: t.current_order_status,
            waiterName: t.waiter_first_name
              ? `${t.waiter_first_name} ${t.waiter_last_name}`
              : null,
          }
        : null,
    }));
  }

  async create(branchId: string, data: any) {
    const result = await query(
      `INSERT INTO restaurant_tables (branch_id, number, name, capacity, zone, position_x, position_y)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        branchId,
        data.number,
        data.name,
        data.capacity || 4,
        data.zone,
        data.positionX || 0,
        data.positionY || 0,
      ],
    );
    return result.rows[0];
  }

  async update(id: string, data: any) {
    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    const map: Record<string, string> = {
      number: "number",
      name: "name",
      capacity: "capacity",
      status: "status",
      zone: "zone",
      positionX: "position_x",
      positionY: "position_y",
    };

    for (const [key, col] of Object.entries(map)) {
      if (data[key] !== undefined) {
        fields.push(`${col} = $${idx++}`);
        values.push(data[key]);
      }
    }

    if (fields.length === 0) throw new Error("No fields to update");

    values.push(id);
    const result = await query(
      `UPDATE restaurant_tables SET ${fields.join(", ")} WHERE id = $${idx} RETURNING *`,
      values,
    );
    if (result.rows.length === 0) throw new Error("Table not found");
    return result.rows[0];
  }

  async updateStatus(id: string, status: string) {
    const result = await query(
      `UPDATE restaurant_tables SET status = $1 WHERE id = $2 RETURNING *`,
      [status, id],
    );
    if (result.rows.length === 0) throw new Error("Table not found");
    return result.rows[0];
  }

  async delete(id: string) {
    const result = await query(
      "UPDATE restaurant_tables SET is_active = false WHERE id = $1 RETURNING id",
      [id],
    );
    if (result.rows.length === 0) throw new Error("Table not found");
    return { message: "Table deleted successfully" };
  }
}
