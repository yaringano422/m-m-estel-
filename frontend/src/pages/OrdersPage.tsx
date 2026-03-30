import { supabase } from "../supabaseClient";
import { useEffect, useState } from "react";
import { ordersApi } from "../api/endpoints";
import type { Order } from "../types";
import {
  Search,
  Receipt,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  X,
  DollarSign,
} from "lucide-react";
import clsx from "clsx";
import toast from "react-hot-toast";

const STATUS_CONFIG: Record<
  string,
  { label: string; badge: string; icon: any }
> = {
  open: { label: "Abierta", badge: "badge-info", icon: Clock },
  in_progress: { label: "En progreso", badge: "badge-warning", icon: Clock },
  delivered: { label: "Entregada", badge: "badge-success", icon: CheckCircle },
  paid: { label: "Pagada", badge: "badge-success", icon: DollarSign },
  cancelled: { label: "Cancelada", badge: "badge-danger", icon: XCircle },
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  // Estados para el flujo de pago (Movidos al nivel superior)
  const [showPayment, setShowPayment] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card" | "mixed">(
    "cash",
  );
  const [cashReceived, setCashReceived] = useState("");

  useEffect(() => {
    loadData();
  }, [filterStatus]);

  const loadData = async () => {
    try {
      const { data, error } = await supabase
        .from("orders")
        .select(`*, order_items (*)`)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const mapped = data.map((o: any) => ({
        id: o.id,
        orderNumber: o.order_number,
        status: o.status,
        subtotal: o.subtotal,
        taxAmount: o.tax_amount,
        discountAmount: o.discount_amount,
        tipAmount: o.tip_amount || 0,
        total: o.total,
        paymentMethod: o.payment_method,
        customerName: o.customer_name,
        customerCount: o.customer_count,
        createdAt: o.created_at,
        paidAt: o.paid_at,
        items: (o.order_items || []).map((i: any) => ({
          id: i.id,
          productId: i.product_id,
          productName: i.product_name,
          quantity: i.quantity,
          unitPrice: i.unit_price,
          taxRate: i.tax_rate,
          taxAmount: i.tax_amount,
          subtotal: i.subtotal,
          total: i.total,
          status: i.status || "pending",
          variants: [],
        })),
      }));

      setOrders(mapped);
    } catch (error) {
      console.error("Error cargando órdenes:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmPayment = async () => {
    if (!selectedOrder) return;

    try {
      const now = new Date().toISOString();
      const received = parseFloat(cashReceived);
      const change =
        paymentMethod === "cash" ? received - selectedOrder.total : null;

      const { error } = await supabase
        .from("orders")
        .update({
          status: "paid",
          payment_method: paymentMethod,
          cash_received: paymentMethod === "cash" ? received : null,
          change_amount: change,
          paid_at: now,
        })
        .eq("id", selectedOrder.id);

      if (error) throw error;

      toast.success("Pago realizado correctamente");
      setShowPayment(false);
      setSelectedOrder(null);
      setCashReceived("");
      loadData();
    } catch (err: any) {
      console.error(err.message);
      toast.error("Error al pagar");
    }
  };

  const updateOrderStatus = async (orderId: string, status: string) => {
    try {
      const { error } = await supabase
        .from("orders")
        .update({ status })
        .eq("id", orderId);

      if (error) throw error;

      toast.success("Estado actualizado");
      loadData();
    } catch (error: any) {
      console.error(error.message);
      toast.error("Error al actualizar estado");
    }
  };

  const filtered = orders.filter((o) => {
    const matchesSearch =
      !search ||
      `#${o.orderNumber} ${o.customerName || ""} ${o.tableName || ""}`
        .toLowerCase()
        .includes(search.toLowerCase());
    const matchesStatus = !filterStatus || o.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const formatCurrency = (n: number) =>
    `$${n.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`;

  const formatTime = (date: string) =>
    new Date(date).toLocaleTimeString("es-MX", {
      hour: "2-digit",
      minute: "2-digit",
    });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="animate-pulse-soft text-brand-400 text-lg">
          Cargando...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Órdenes</h1>
          <p className="text-dark-400 text-sm mt-1">
            {orders.length} órdenes hoy
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setFilterStatus(null)}
          className={clsx(
            "px-4 py-2 rounded-xl text-sm font-medium transition-all",
            !filterStatus
              ? "bg-brand-600 text-white"
              : "bg-dark-800 text-dark-300 hover:bg-dark-700",
          )}
        >
          Todas ({orders.length})
        </button>
        {Object.entries(STATUS_CONFIG).map(([key, config]) => (
          <button
            key={key}
            onClick={() => setFilterStatus(key)}
            className={clsx(
              "px-4 py-2 rounded-xl text-sm font-medium transition-all",
              filterStatus === key
                ? "bg-brand-600 text-white"
                : "bg-dark-800 text-dark-300 hover:bg-dark-700",
            )}
          >
            {config.label} ({orders.filter((o) => o.status === key).length})
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search
          size={18}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-400"
        />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-field pl-11"
          placeholder="Buscar orden..."
        />
      </div>

      {/* List */}
      <div className="space-y-3">
        {filtered.map((order) => {
          const config = STATUS_CONFIG[order.status] || STATUS_CONFIG.open;
          return (
            <div
              key={order.id}
              className="glass-panel-sm p-4 hover:border-dark-600 transition-all duration-200 cursor-pointer"
              onClick={() => setSelectedOrder(order)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-dark-700 rounded-xl flex items-center justify-center">
                    <Receipt size={20} className="text-dark-300" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-white">
                        Orden #{order.orderNumber}
                      </h3>
                      <span className={config.badge}>{config.label}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-dark-400 mt-1">
                      {order.tableName && <span>🪑 {order.tableName}</span>}
                      {order.customerName && (
                        <span>👤 {order.customerName}</span>
                      )}
                      <span>🕐 {formatTime(order.createdAt)}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-brand-400">
                    {formatCurrency(order.total)}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Detalle Orden */}
      {selectedOrder && !showPayment && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-lg p-6 animate-scale-in max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">
                Orden #{selectedOrder.orderNumber}
              </h2>
              <button
                onClick={() => setSelectedOrder(null)}
                className="text-dark-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              {/* Items List */}
              {selectedOrder.items.map((item) => (
                <div
                  key={item.id}
                  className="flex justify-between bg-dark-700/50 rounded-lg p-3"
                >
                  <div>
                    <p className="text-sm font-medium text-white">
                      {item.productName}
                    </p>
                    <p className="text-xs text-dark-400">
                      x{item.quantity} @ {formatCurrency(item.unitPrice)}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-white">
                    {formatCurrency(item.unitPrice * item.quantity)}
                  </p>
                </div>
              ))}

              <div className="border-t border-dark-700 pt-4 space-y-2">
                <div className="flex justify-between text-lg font-bold pt-2 border-t border-dark-600">
                  <span className="text-white">Total</span>
                  <span className="text-brand-400">
                    {formatCurrency(selectedOrder.total)}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              {selectedOrder.status === "open" && (
                <button
                  onClick={() =>
                    updateOrderStatus(selectedOrder.id, "in_progress")
                  }
                  className="btn-warning"
                >
                  👨‍🍳 Cocina
                </button>
              )}
              {selectedOrder.status === "in_progress" && (
                <button
                  onClick={() =>
                    updateOrderStatus(selectedOrder.id, "delivered")
                  }
                  className="btn-info"
                >
                  🍽️ Entregado
                </button>
              )}
              {selectedOrder.status !== "paid" && (
                <button
                  onClick={() => setShowPayment(true)}
                  className="w-full btn-success"
                >
                  💵 Cobrar
                </button>
              )}
              {selectedOrder.status === "open" ? (
                <button
                  onClick={() => {
                    if (confirm("¿Deseas cancelar esta orden abierta?")) {
                      updateOrderStatus(selectedOrder.id, "cancelled");
                      setSelectedOrder(null);
                    }
                  }}
                  className="w-full bg-red-600/20 hover:bg-red-600/40 text-red-500 font-bold py-2 px-4 rounded-xl transition-all"
                >
                  Cancelar Orden
                </button>
              ) : (
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="w-full btn-secondary"
                >
                  Cerrar
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Procesar Pago */}
      {showPayment && selectedOrder && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-md p-6 animate-scale-in">
            <h2 className="text-xl font-bold text-white mb-4 text-center">
              Procesar Pago
            </h2>

            {/* MONTO DINÁMICO: Aquí se calcula el 5% extra solo si es tarjeta */}
            <p className="text-center text-3xl font-bold text-brand-400 mb-2">
              {paymentMethod === "card"
                ? formatCurrency(selectedOrder.total * 1.05)
                : formatCurrency(selectedOrder.total)}
            </p>

            {/* AVISO VISUAL: Solo aparece cuando seleccionan tarjeta */}
            <div className="h-6 mb-4 text-center">
              {paymentMethod === "card" && (
                <span className="text-xs text-dark-400 uppercase font-bold tracking-wider">
                  (Incluye 5% de comisión por tarjeta)
                </span>
              )}
            </div>

            <div className="flex gap-2 mb-6">
              <button
                onClick={() => setPaymentMethod("cash")}
                className={clsx(
                  "flex-1 py-3 rounded-xl font-bold transition-all",
                  paymentMethod === "cash"
                    ? "bg-brand-600 text-white"
                    : "bg-dark-700 text-dark-400",
                )}
              >
                💵 Efectivo
              </button>
              <button
                onClick={() => setPaymentMethod("card")}
                className={clsx(
                  "flex-1 py-3 rounded-xl font-bold transition-all",
                  paymentMethod === "card"
                    ? "bg-brand-600 text-white"
                    : "bg-dark-700 text-dark-400",
                )}
              >
                💳 Tarjeta
              </button>
            </div>

            {paymentMethod === "cash" && (
              <div className="space-y-4 mb-6">
                <input
                  type="number"
                  value={cashReceived}
                  onChange={(e) => setCashReceived(e.target.value)}
                  className="input-field text-center text-xl h-14"
                  placeholder="Efectivo recibido"
                  autoFocus
                />
                {cashReceived && (
                  <div className="bg-green-500/10 border border-green-500/20 p-3 rounded-xl text-center">
                    <p className="text-sm text-green-400 uppercase font-bold tracking-wider">
                      Cambio a devolver
                    </p>
                    <p className="text-2xl font-bold text-green-400">
                      {/* Aquí calculamos el vuelto siempre sobre el total base (ya que estamos en efectivo) */}
                      {formatCurrency(
                        parseFloat(cashReceived) - selectedOrder.total,
                      )}
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2">
              <button
                onClick={handleConfirmPayment}
                className="btn-success w-full h-12 text-lg"
              >
                Confirmar Pago
              </button>
              <button
                onClick={() => {
                  setShowPayment(false);
                  setCashReceived("");
                }}
                className="btn-secondary w-full h-12"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
