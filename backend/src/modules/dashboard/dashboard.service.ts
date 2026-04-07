import { query } from "../../config/database";

export class DashboardService {
  async getSummary(branchId: string) {
    const today = new Date().toISOString().split("T")[0];

    // Today's sales
    const salesResult = await query(
      `SELECT COUNT(*) as total_orders,
        COALESCE(SUM(total), 0) as total_revenue,
        COALESCE(SUM(tax_amount), 0) as total_tax,
        COALESCE(SUM(tip_amount), 0) as total_tips,
        COALESCE(AVG(total), 0) as avg_ticket
       FROM orders
       WHERE branch_id = $1 AND DATE(created_at) = $2 AND status = 'paid'`,
      [branchId, today],
    );

    // Orders by status
    const statusResult = await query(
      `SELECT status, COUNT(*) as count
       FROM orders
       WHERE branch_id = $1 AND DATE(created_at) = $2
       GROUP BY status`,
      [branchId, today],
    );

    // Top selling products today
    const topProducts = await query(
      `SELECT oi.product_name, SUM(oi.quantity) as total_quantity, SUM(oi.total) as total_revenue
       FROM order_items oi
       JOIN orders o ON o.id = oi.order_id
       WHERE o.branch_id = $1 AND DATE(o.created_at) = $2 AND o.status = 'paid'
       GROUP BY oi.product_name
       ORDER BY total_quantity DESC
       LIMIT 10`,
      [branchId, today],
    );

    const hourlySales = await query(
      `SELECT EXTRACT(HOUR FROM created_at) as hour, COUNT(*) as orders, COALESCE(SUM(total), 0) as revenue
       FROM orders
       WHERE branch_id = $1 AND DATE(created_at) = $2 AND status = 'paid'
       GROUP BY EXTRACT(HOUR FROM created_at)
       ORDER BY hour`,
      [branchId, today],
    );

    const paymentBreakdown = await query(
      `SELECT payment_method, COUNT(*) as count, COALESCE(SUM(total), 0) as total
       FROM orders
       WHERE branch_id = $1 AND DATE(created_at) = $2 AND status = 'paid'
       GROUP BY payment_method`,
      [branchId, today],
    );

    const tablesStatus = await query(
      `SELECT status, COUNT(*) as count
       FROM restaurant_tables
       WHERE branch_id = $1 AND is_active = true
       GROUP BY status`,
      [branchId],
    );

    const lowStock = await query(
      `SELECT COUNT(*) as count
       FROM inventory i
       JOIN products p ON p.id = i.product_id
       WHERE i.branch_id = $1 AND p.is_active = true AND i.current_stock <= i.min_stock`,
      [branchId],
    );

    const weeklyRevenue = await query(
      `SELECT DATE(created_at) as date, COUNT(*) as orders, COALESCE(SUM(total), 0) as revenue
       FROM orders
       WHERE branch_id = $1 AND created_at >= NOW() - INTERVAL '7 days' AND status = 'paid'
       GROUP BY DATE(created_at)
       ORDER BY date`,
      [branchId],
    );

    const sales = salesResult.rows[0];
    return {
      today: {
        totalOrders: parseInt(sales.total_orders),
        totalRevenue: parseFloat(sales.total_revenue),
        totalTax: parseFloat(sales.total_tax),
        totalTips: parseFloat(sales.total_tips),
        avgTicket: parseFloat(sales.avg_ticket),
      },
      ordersByStatus: statusResult.rows.reduce((acc: any, r: any) => {
        acc[r.status] = parseInt(r.count);
        return acc;
      }, {}),
      topProducts: topProducts.rows.map((p) => ({
        name: p.product_name,
        quantity: parseInt(p.total_quantity),
        revenue: parseFloat(p.total_revenue),
      })),
      hourlySales: hourlySales.rows.map((h) => ({
        hour: parseInt(h.hour),
        orders: parseInt(h.orders),
        revenue: parseFloat(h.revenue),
      })),
      paymentBreakdown: paymentBreakdown.rows.map((p) => ({
        method: p.payment_method,
        count: parseInt(p.count),
        total: parseFloat(p.total),
      })),
      tablesStatus: tablesStatus.rows.reduce((acc: any, r: any) => {
        acc[r.status] = parseInt(r.count);
        return acc;
      }, {}),
      lowStockCount: parseInt(lowStock.rows[0].count),
      weeklyRevenue: weeklyRevenue.rows.map((w) => ({
        date: w.date,
        orders: parseInt(w.orders),
        revenue: parseFloat(w.revenue),
      })),
    };
  }
}
