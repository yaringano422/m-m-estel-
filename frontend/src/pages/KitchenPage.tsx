import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

export default function KitchenPage() {
  const [orders, setOrders] = useState<any[]>([]);

  useEffect(() => {
    loadOrders();

    // 🔥 tiempo real
    const channel = supabase
      .channel("orders-kitchen")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => loadOrders(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadOrders = async () => {
    const { data, error } = await supabase
      .from("orders")
      .select(
        `
        *,
        restaurant_tables(name),
        order_items (
          id,
          product_name,
          quantity
        )
      `,
      )
      .in("status", ["open", "in_progress", "delivered"])
      .order("created_at", { ascending: true });

    if (!error) setOrders(data);
  };

  const updateStatus = async (id: string, status: string) => {
    await supabase.from("orders").update({ status }).eq("id", id);
    loadOrders();
  };

  return (
    <div className="p-6 bg-dark-900 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-white">
          Monitor de Cocina 👨‍🍳🔥
        </h1>
        <div className="flex gap-4 text-sm">
          <span className="flex items-center gap-1 text-emerald-400">
            ● {orders.length} Órdenes activas
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {orders.map((order) => {
          const isUrgent =
            new Date().getTime() - new Date(order.created_at).getTime() >
            15 * 60 * 1000; // +15 min

          return (
            <div
              key={order.id}
              className={`rounded-xl border flex flex-col justify-between h-fit transition-all duration-200 ${
                order.status === "in_progress"
                  ? "border-amber-500 bg-dark-800 shadow-lg shadow-amber-500/5"
                  : "border-dark-700 bg-dark-800"
              } ${isUrgent && order.status === "open" ? "border-red-500 animate-pulse" : ""}`}
            >
              {/* Header de la Tarjeta */}
              <div
                className={`p-4 rounded-t-xl flex justify-between items-center ${
                  order.status === "in_progress"
                    ? "bg-amber-600/10"
                    : "bg-dark-700/50"
                }`}
              >
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-1">
                    🪑{" "}
                    {order.restaurant_tables?.name ||
                      order.customer_name ||
                      "Llevar"}
                  </h2>
                  <p className="text-xs text-dark-400 mt-1">
                    Orden #{order.order_number}{" "}
                    {/*TODO: agregar número de orden incremental real */}
                  </p>
                </div>
                <div className="text-right">
                  <span
                    className={`text-xs font-bold uppercase px-2 py-1 rounded-md ${
                      order.status === "in_progress"
                        ? "bg-amber-500 text-dark-900"
                        : "bg-blue-500 text-white"
                    }`}
                  >
                    {order.status === "in_progress" ? "Preparando" : "Espera"}
                  </span>
                  <p className="text-xs text-dark-300 mt-1">
                    ⏱️{" "}
                    {new Date(order.created_at).toLocaleTimeString("es-MX", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>

              {/* Lista de Productos */}
              <div className="p-4 space-y-3 flex-1 min-h-[100px]">
                {order.order_items.map((item: any) => (
                  <div
                    key={item.id}
                    className="flex items-start justify-between border-b border-dark-700/50 pb-2 last:border-0"
                  >
                    <div className="flex gap-3 items-center">
                      <span className="text-xl font-bold text-emerald-400 bg-emerald-500/10 w-8 h-8 flex items-center justify-center rounded-lg">
                        {item.quantity}
                      </span>
                      <span className="text-white text-base font-medium">
                        {item.product_name}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer con Botones */}
              <div className="p-4 border-t border-dark-700 bg-dark-700/20 rounded-b-xl">
                {order.status === "open" && (
                  <button
                    onClick={() => updateStatus(order.id, "in_progress")}
                    className="w-full bg-amber-500 hover:bg-amber-600 text-dark-900 font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-colors text-base"
                  >
                    👨‍🍳 Empezar a Preparar
                  </button>
                )}

                {order.status === "in_progress" && (
                  <button
                    onClick={() => updateStatus(order.id, "delivered")}
                    className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-colors text-base"
                  >
                    🔔 ¡Plato Listo!
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {orders.length === 0 && (
        <div className="flex flex-col items-center justify-center h-[60vh] text-dark-500">
          <span className="text-6xl mb-4">💤</span>
          <p className="text-lg">No hay órdenes pendientes en cocina.</p>
        </div>
      )}
    </div>
  );
}
