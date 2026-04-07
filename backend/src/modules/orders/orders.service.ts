import { query, getClient } from "../../config/database";

export class OrdersService {
  async getAll(branchId: string, status?: string, date?: string) {
    let sql = `
      SELECT o.*, u.first_name as waiter_first_name, u.last_name as waiter_last_name,
        t.number as table_number, t.name as table_name,
        COALESCE(json_agg(
          json_build_object(
            'id', oi.id, 'productName', oi.product_name, 'quantity', oi.quantity,
            'unitPrice', oi.unit_price, 'subtotal', oi.subtotal, 'total', oi.total, 'notes', oi.notes
          )
        ) FILTER (WHERE oi.id IS NOT NULL), '[]') as items
      FROM orders o
      LEFT JOIN users u ON u.id = o.user_id
      LEFT JOIN restaurant_tables t ON t.id = o.table_id
      LEFT JOIN order_items oi ON oi.order_id = o.id
      WHERE o.branch_id = $1
    `;
    const params: any[] = [branchId];
    let idx = 2;

    if (status) {
      sql += ` AND o.status = $${idx++}`;
      params.push(status);
    }
    if (date) {
      sql += ` AND DATE(o.created_at) = $${idx++}`;
      params.push(date);
    }

    sql += ` GROUP BY o.id, u.first_name, u.last_name, t.number, t.name ORDER BY o.created_at DESC`;

    const result = await query(sql, params);
    return result.rows.map((o) => ({
      id: o.id,
      orderNumber: o.order_number,
      tableId: o.table_id,
      tableNumber: o.table_number,
      tableName: o.table_name,
      waiterId: o.user_id,
      waiterName: o.waiter_first_name
        ? `${o.waiter_first_name} ${o.waiter_last_name}`
        : null,
      status: o.status,
      subtotal: parseFloat(o.subtotal),
      taxAmount: parseFloat(o.tax_amount),
      discountAmount: parseFloat(o.discount_amount),
      tipAmount: parseFloat(o.tip_amount),
      total: parseFloat(o.total),
      paymentMethod: o.payment_method,
      customerName: o.customer_name,
      customerCount: o.customer_count,
      notes: o.notes,
      items: o.items,
      createdAt: o.created_at,
      paidAt: o.paid_at,
    }));
  }

  async getById(id: string) {
    const result = await query(
      `SELECT o.*, u.first_name as waiter_first_name, u.last_name as waiter_last_name,
        t.number as table_number, t.name as table_name
       FROM orders o
       LEFT JOIN users u ON u.id = o.user_id
       LEFT JOIN restaurant_tables t ON t.id = o.table_id
       WHERE o.id = $1`,
      [id],
    );
    if (result.rows.length === 0) throw new Error("Order not found");

    const items = await query(
      `SELECT oi.*,
        COALESCE(json_agg(
          json_build_object('id', oiv.id, 'variantName', oiv.variant_name, 'priceModifier', oiv.price_modifier)
        ) FILTER (WHERE oiv.id IS NOT NULL), '[]') as variants
       FROM order_items oi
       LEFT JOIN order_item_variants oiv ON oiv.order_item_id = oi.id
       WHERE oi.order_id = $1
       GROUP BY oi.id
       ORDER BY oi.created_at`,
      [id],
    );

    const o = result.rows[0];
    return {
      id: o.id,
      orderNumber: o.order_number,
      tableId: o.table_id,
      tableNumber: o.table_number,
      tableName: o.table_name,
      waiterId: o.user_id,
      waiterName: o.waiter_first_name
        ? `${o.waiter_first_name} ${o.waiter_last_name}`
        : null,
      status: o.status,
      subtotal: parseFloat(o.subtotal),
      taxAmount: parseFloat(o.tax_amount),
      discountAmount: parseFloat(o.discount_amount),
      tipAmount: parseFloat(o.tip_amount),
      total: parseFloat(o.total),
      paymentMethod: o.payment_method,
      cashReceived: o.cash_received ? parseFloat(o.cash_received) : null,
      changeAmount: o.change_amount ? parseFloat(o.change_amount) : null,
      customerName: o.customer_name,
      customerCount: o.customer_count,
      notes: o.notes,
      items: items.rows.map((i) => ({
        id: i.id,
        productId: i.product_id,
        productName: i.product_name,
        quantity: i.quantity,
        unitPrice: parseFloat(i.unit_price),
        taxRate: parseFloat(i.tax_rate),
        taxAmount: parseFloat(i.tax_amount),
        subtotal: parseFloat(i.subtotal),
        total: parseFloat(i.total),
        notes: i.notes,
        status: i.status,
        variants: i.variants,
      })),
      createdAt: o.created_at,
      paidAt: o.paid_at,
    };
  }

  async create(branchId: string, userId: string, data: any) {
    const client = await getClient();
    try {
      await client.query("BEGIN");

      // Create order
      const orderResult = await client.query(
        `INSERT INTO orders (branch_id, table_id, user_id, customer_name, customer_count, notes, status)
         VALUES ($1, $2, $3, $4, $5, $6, 'open')
         RETURNING *`,
        [
          branchId,
          data.tableId,
          userId,
          data.customerName,
          data.customerCount || 1,
          data.notes,
        ],
      );
      const order = orderResult.rows[0];

      let subtotal = 0;
      let taxAmount = 0;

      // Add items
      for (const item of data.items) {
        const itemSubtotal = item.price * item.quantity;
        const itemTax = (itemSubtotal * (item.taxRate || 16)) / 100;
        const itemTotal = itemSubtotal + itemTax;

        subtotal += itemSubtotal;
        taxAmount += itemTax;

        const itemResult = await client.query(
          `INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price, tax_rate, tax_amount, subtotal, total, notes)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
           RETURNING id`,
          [
            order.id,
            item.productId,
            item.productName,
            item.quantity,
            item.price,
            item.taxRate || 16,
            itemTax,
            itemSubtotal,
            itemTotal,
            item.notes,
          ],
        );

        // Add item variants
        if (item.variants && item.variants.length > 0) {
          for (const v of item.variants) {
            await client.query(
              `INSERT INTO order_item_variants (order_item_id, variant_id, variant_name, price_modifier)
               VALUES ($1, $2, $3, $4)`,
              [
                itemResult.rows[0].id,
                v.variantId,
                v.variantName,
                v.priceModifier || 0,
              ],
            );
          }
        }

        // Decrease inventory
        await client.query(
          `UPDATE inventory SET current_stock = current_stock - $1
           WHERE product_id = $2 AND branch_id = $3`,
          [item.quantity, item.productId, branchId],
        );
      }

      const total = subtotal + taxAmount - (data.discountAmount || 0);

      // Update order totals
      await client.query(
        `UPDATE orders SET subtotal = $1, tax_amount = $2, discount_amount = $3, total = $4 WHERE id = $5`,
        [subtotal, taxAmount, data.discountAmount || 0, total, order.id],
      );

      // Update table status
      if (data.tableId) {
        await client.query(
          `UPDATE restaurant_tables SET status = 'occupied' WHERE id = $1`,
          [data.tableId],
        );
      }

      await client.query("COMMIT");
      return this.getById(order.id);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async addItems(orderId: string, branchId: string, items: any[]) {
    const client = await getClient();
    try {
      await client.query("BEGIN");

      let addedSubtotal = 0;
      let addedTax = 0;

      for (const item of items) {
        const itemSubtotal = item.price * item.quantity;
        const itemTax = (itemSubtotal * (item.taxRate || 16)) / 100;
        const itemTotal = itemSubtotal + itemTax;

        addedSubtotal += itemSubtotal;
        addedTax += itemTax;

        await client.query(
          `INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price, tax_rate, tax_amount, subtotal, total, notes)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            orderId,
            item.productId,
            item.productName,
            item.quantity,
            item.price,
            item.taxRate || 16,
            itemTax,
            itemSubtotal,
            itemTotal,
            item.notes,
          ],
        );

        await client.query(
          `UPDATE inventory SET current_stock = current_stock - $1 WHERE product_id = $2 AND branch_id = $3`,
          [item.quantity, item.productId, branchId],
        );
      }

      await client.query(
        `UPDATE orders SET subtotal = subtotal + $1, tax_amount = tax_amount + $2, total = total + $3 WHERE id = $4`,
        [addedSubtotal, addedTax, addedSubtotal + addedTax, orderId],
      );

      await client.query("COMMIT");
      return this.getById(orderId);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async pay(orderId: string, data: any) {
    const client = await getClient();
    try {
      await client.query("BEGIN");

      const result = await client.query(
        `UPDATE orders SET status = 'paid', payment_method = $1, payment_reference = $2,
         cash_received = $3, change_amount = $4, tip_amount = $5, cashier_id = $6, paid_at = NOW()
         WHERE id = $7 RETURNING table_id`,
        [
          data.paymentMethod,
          data.paymentReference,
          data.cashReceived,
          data.changeAmount,
          data.tipAmount || 0,
          data.cashierId,
          orderId,
        ],
      );

      if (result.rows.length === 0) throw new Error("Order not found");

      // Free the table
      if (result.rows[0].table_id) {
        await client.query(
          `UPDATE restaurant_tables SET status = 'available' WHERE id = $1`,
          [result.rows[0].table_id],
        );
      }

      await client.query("COMMIT");
      return this.getById(orderId);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async updateStatus(orderId: string, status: string) {
    const result = await query(
      `UPDATE orders SET status = $1 WHERE id = $2 RETURNING id`,
      [status, orderId],
    );
    if (result.rows.length === 0) throw new Error("Order not found");
    return this.getById(orderId);
  }

  async cancel(orderId: string, branchId: string) {
    const client = await getClient();
    try {
      await client.query("BEGIN");

      // Restore inventory
      const items = await client.query(
        "SELECT product_id, quantity FROM order_items WHERE order_id = $1",
        [orderId],
      );
      for (const item of items.rows) {
        await client.query(
          `UPDATE inventory SET current_stock = current_stock + $1 WHERE product_id = $2 AND branch_id = $3`,
          [item.quantity, item.product_id, branchId],
        );
      }

      const result = await client.query(
        `UPDATE orders SET status = 'cancelled' WHERE id = $1 RETURNING table_id`,
        [orderId],
      );

      if (result.rows[0]?.table_id) {
        await client.query(
          `UPDATE restaurant_tables SET status = 'available' WHERE id = $1`,
          [result.rows[0].table_id],
        );
      }

      await client.query("COMMIT");
      return { message: "Order cancelled successfully" };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}
