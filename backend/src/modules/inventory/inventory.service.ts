import { query } from "../../config/database";

export class InventoryService {
  async getAll(branchId: string) {
    const result = await query(
      `SELECT i.*, p.name as product_name, p.sku, p.price, c.name as category_name
       FROM inventory i
       JOIN products p ON p.id = i.product_id
       LEFT JOIN categories c ON c.id = p.category_id
       WHERE i.branch_id = $1 AND p.is_active = true
       ORDER BY p.name`,
      [branchId],
    );
    return result.rows.map((i) => ({
      id: i.id,
      productId: i.product_id,
      productName: i.product_name,
      sku: i.sku,
      price: parseFloat(i.price),
      categoryName: i.category_name,
      currentStock: parseFloat(i.current_stock),
      minStock: parseFloat(i.min_stock),
      maxStock: parseFloat(i.max_stock),
      unit: i.unit,
      isLowStock: parseFloat(i.current_stock) <= parseFloat(i.min_stock),
      lastRestockAt: i.last_restock_at,
    }));
  }

  async getLowStock(branchId: string) {
    const result = await query(
      `SELECT i.*, p.name as product_name, p.sku, c.name as category_name
       FROM inventory i
       JOIN products p ON p.id = i.product_id
       LEFT JOIN categories c ON c.id = p.category_id
       WHERE i.branch_id = $1 AND p.is_active = true AND i.current_stock <= i.min_stock
       ORDER BY i.current_stock ASC`,
      [branchId],
    );
    return result.rows.map((i) => ({
      id: i.id,
      productId: i.product_id,
      productName: i.product_name,
      sku: i.sku,
      categoryName: i.category_name,
      currentStock: parseFloat(i.current_stock),
      minStock: parseFloat(i.min_stock),
      unit: i.unit,
    }));
  }

  // Método Restock actualizado con validación de sucursal
  async restock(
    id: string,
    userId: string,
    branchId: string,
    data: { quantity: number; notes?: string },
  ) {
    // Verificamos que el item pertenezca a la sucursal antes de operar
    const inv = await query(
      "SELECT current_stock FROM inventory WHERE id = $1 AND branch_id = $2",
      [id, branchId],
    );

    if (inv.rows.length === 0) {
      throw new Error("Item de inventario no encontrado en esta sucursal");
    }

    const previous = parseFloat(inv.rows[0].current_stock);
    const newStock = previous + data.quantity;

    // Actualizamos stock y marcas de tiempo
    await query(
      `UPDATE inventory 
       SET current_stock = $1, last_restock_at = NOW(), updated_at = NOW() 
       WHERE id = $2`,
      [newStock, id],
    );

    // Registro del movimiento
    await query(
      `INSERT INTO inventory_movements (inventory_id, user_id, type, quantity, previous_stock, new_stock, notes)
       VALUES ($1, $2, 'restock', $3, $4, $5, $6)`,
      [
        id,
        userId,
        data.quantity,
        previous,
        newStock,
        data.notes || "Resurtido manual",
      ],
    );

    return { id, previousStock: previous, newStock, quantity: data.quantity };
  }

  async adjust(
    id: string,
    userId: string,
    data: { quantity: number; notes?: string },
  ) {
    const inv = await query("SELECT * FROM inventory WHERE id = $1", [id]);
    if (inv.rows.length === 0) throw new Error("Inventory item not found");

    const previous = parseFloat(inv.rows[0].current_stock);

    await query(
      "UPDATE inventory SET current_stock = $1, updated_at = NOW() WHERE id = $2",
      [data.quantity, id],
    );

    await query(
      `INSERT INTO inventory_movements (inventory_id, user_id, type, quantity, previous_stock, new_stock, notes)
       VALUES ($1, $2, 'adjustment', $3, $4, $5, $6)`,
      [
        id,
        userId,
        data.quantity - previous,
        previous,
        data.quantity,
        data.notes || "Ajuste manual",
      ],
    );

    return { id, previousStock: previous, newStock: data.quantity };
  }

  async getMovements(inventoryId: string) {
    const result = await query(
      `SELECT im.*, u.first_name, u.last_name
       FROM inventory_movements im
       LEFT JOIN users u ON u.id = im.user_id
       WHERE im.inventory_id = $1
       ORDER BY im.created_at DESC
       LIMIT 50`,
      [inventoryId],
    );
    return result.rows.map((m) => ({
      id: m.id,
      type: m.type,
      quantity: parseFloat(m.quantity),
      previousStock: parseFloat(m.previous_stock),
      newStock: parseFloat(m.new_stock),
      notes: m.notes,
      userName: m.first_name ? `${m.first_name} ${m.last_name}` : null,
      createdAt: m.created_at,
    }));
  }
}
