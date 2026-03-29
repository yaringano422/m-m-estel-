import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import {
  DollarSign,
  ShoppingBag,
  TrendingUp,
  CreditCard,
  Banknote,
  Utensils,
} from "lucide-react";

interface TopProduct {
  name: string;
  quantity: number;
}

interface PaymentSummary {
  cash: number;
  card: number;
  mixed: number;
}

export default function DashboardPage() {
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalOrders, setTotalOrders] = useState(0);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [payments, setPayments] = useState<PaymentSummary>({
    cash: 0,
    card: 0,
    mixed: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Obtener la fecha de inicio y fin de HOY
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);

      // 1. Consultar Órdenes de hoy
      const { data: ordersData, error: ordersError } = await supabase
        .from("orders")
        .select("*")
        .gte("created_at", startOfDay.toISOString())
        .lte("created_at", endOfDay.toISOString())
        .not("status", "eq", "cancelled"); // Ignoramos canceladas

      if (ordersError) throw ordersError;

      // Calcular totales monetarios y conteo
      let revenue = 0;
      let cashTotal = 0;
      let cardTotal = 0;
      let mixedTotal = 0;

      ordersData?.forEach((order: any) => {
        revenue += parseFloat(order.total || 0);

        if (order.payment_method === "cash")
          cashTotal += parseFloat(order.total || 0);
        if (order.payment_method === "card")
          cardTotal += parseFloat(order.total || 0);
        if (order.payment_method === "mixed")
          mixedTotal += parseFloat(order.total || 0);
      });

      setTotalRevenue(revenue);
      setTotalOrders(ordersData?.length || 0);
      setPayments({ cash: cashTotal, card: cardTotal, mixed: mixedTotal });

      // 2. Consultar Items vendidos hoy para el TOP de productos
      const { data: itemsData, error: itemsError } = await supabase
        .from("order_items")
        .select("product_name, quantity, created_at")
        .gte("created_at", startOfDay.toISOString())
        .lte("created_at", endOfDay.toISOString());

      if (itemsError) throw itemsError;

      // Agrupar y contar productos más vendidos
      const productMap: Record<string, number> = {};
      itemsData?.forEach((item: any) => {
        const name = item.product_name || "Producto desconocido";
        productMap[name] = (productMap[name] || 0) + (item.quantity || 0);
      });

      const sortedProducts = Object.entries(productMap)
        .map(([name, quantity]) => ({ name, quantity }))
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 5); // Tomamos solo los 5 más vendidos

      setTopProducts(sortedProducts);
    } catch (error) {
      console.error("Error cargando dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (n: number) =>
    `$${n.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh] text-white">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-brand-500 mr-3"></div>
        Cargando métricas del día...
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white">Dashboard del Día 📈</h1>
        <button
          onClick={fetchDashboardData}
          className="px-4 py-2 bg-dark-700 hover:bg-dark-600 text-white text-sm font-medium rounded-lg transition-colors"
        >
          🔄 Actualizar
        </button>
      </div>

      {/* Tarjetas de Resumen Superior */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Card 1: Ingresos */}
        <div className="glass-panel p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-dark-400 uppercase tracking-wider">
              Ventas de Hoy
            </p>
            <p className="text-2xl font-bold text-emerald-400 mt-1">
              {formatCurrency(totalRevenue)}
            </p>
          </div>
          <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center">
            <DollarSign size={24} className="text-emerald-400" />
          </div>
        </div>

        {/* Card 2: Órdenes */}
        <div className="glass-panel p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-dark-400 uppercase tracking-wider">
              Órdenes Totales
            </p>
            <p className="text-2xl font-bold text-white mt-1">{totalOrders}</p>
          </div>
          <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center">
            <ShoppingBag size={24} className="text-blue-400" />
          </div>
        </div>

        {/* Card 3: Ticket Promedio */}
        <div className="glass-panel p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-dark-400 uppercase tracking-wider">
              Ticket Promedio
            </p>
            <p className="text-2xl font-bold text-brand-400 mt-1">
              {formatCurrency(totalOrders > 0 ? totalRevenue / totalOrders : 0)}
            </p>
          </div>
          <div className="w-12 h-12 bg-brand-500/10 rounded-xl flex items-center justify-center">
            <TrendingUp size={24} className="text-brand-400" />
          </div>
        </div>

        {/* Card 4: Efectivo vs Tarjeta */}
        <div className="glass-panel p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-dark-400 uppercase tracking-wider">
              En Efectivo
            </p>
            <p className="text-2xl font-bold text-amber-400 mt-1">
              {formatCurrency(payments.cash)}
            </p>
          </div>
          <div className="w-12 h-12 bg-amber-500/10 rounded-xl flex items-center justify-center">
            <Banknote size={24} className="text-amber-400" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sección: Productos Más Vendidos */}
        <div className="glass-panel p-6">
          <div className="flex items-center gap-2 mb-4">
            <Utensils size={18} className="text-brand-400" />
            <h2 className="text-lg font-bold text-white">
              Top 5 Platos Más Vendidos
            </h2>
          </div>

          {topProducts.length === 0 ? (
            <div className="text-dark-500 text-sm py-4">
              No hay ventas registradas hoy.
            </div>
          ) : (
            <div className="space-y-3">
              {topProducts.map((product, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between border-b border-dark-700/50 pb-2 last:border-0 last:pb-0"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 bg-dark-700 rounded-md flex items-center justify-center text-xs font-bold text-white">
                      {index + 1}
                    </span>
                    <p className="text-sm font-medium text-white">
                      {product.name}
                    </p>
                  </div>
                  <span className="text-sm font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg">
                    {product.quantity} unds.
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sección: Métodos de Pago */}
        <div className="glass-panel p-6">
          <div className="flex items-center gap-2 mb-4">
            <CreditCard size={18} className="text-brand-400" />
            <h2 className="text-lg font-bold text-white">Resumen de Caja</h2>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-dark-300 flex items-center gap-2">
                <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>{" "}
                Efectivo
              </span>
              <span className="text-sm font-bold text-white">
                {formatCurrency(payments.cash)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-dark-300 flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div> Tarjeta
              </span>
              <span className="text-sm font-bold text-white">
                {formatCurrency(payments.card)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-dark-300 flex items-center gap-2">
                <div className="w-3 h-3 bg-amber-500 rounded-full"></div> Mixto
              </span>
              <span className="text-sm font-bold text-white">
                {formatCurrency(payments.mixed)}
              </span>
            </div>
            <div className="border-t border-dark-600 pt-3 flex justify-between items-center">
              <span className="text-sm font-bold text-white">Total Arqueo</span>
              <span className="text-lg font-bold text-emerald-400">
                {formatCurrency(totalRevenue)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
