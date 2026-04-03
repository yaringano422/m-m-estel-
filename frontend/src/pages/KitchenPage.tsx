import { useEffect, useState, useRef } from "react";
import { supabase } from "../supabaseClient";
import { KitchenOrder } from "../types"; // Importamos el tipo que mejoramos arriba
import toast from "react-hot-toast";

export default function KitchenPage() {
  const [orders, setOrders] = useState<KitchenOrder[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(() => {
    return localStorage.getItem("kitchenSoundEnabled") === "true";
  });
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Inicializar el audio (recuerda poner el archivo alerta-cocina.mp3 en /public/sounds/)
    audioRef.current = new Audio("/sounds/alerta-cocina.mp3");

    loadOrders();

    // 🔥 Canal en tiempo real mejorado
    const channel = supabase
      .channel("orders-kitchen")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        (payload) => {
          // Si el evento fue una inserción (Orden Nueva), intentamos reproducir el sonido
          if (payload.eventType === "INSERT") {
            if (audioRef.current) {
              audioRef.current.play().catch((error) => {
                console.error("Error al reproducir sonido:", error);
              });
            }
            toast.success("¡Nueva orden recibida!", { icon: "🔔" });
          }

          // En cualquier cambio (Insert, Update, Delete) recargamos los datos
          loadOrders();
        },
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
          quantity,
          notes
        )
      `,
      )
      .in("status", ["open", "in_progress", "delivered"])
      .order("created_at", { ascending: true });

    if (!error) setOrders(data as unknown as KitchenOrder[]);
  };

  const updateStatus = async (id: string, status: string) => {
    await supabase.from("orders").update({ status }).eq("id", id);
    loadOrders();
  };

  // Función para ganarle la restricción al navegador
  const enableAudio = () => {
    if (audioRef.current) {
      audioRef.current
        .play()
        .then(() => {
          audioRef.current?.pause();
          if (audioRef.current) audioRef.current.currentTime = 0;

          // 🔥 GUARDAMOS EN LOCALSTORAGE
          localStorage.setItem("kitchenSoundEnabled", "true");
          setSoundEnabled(true);

          toast.success("Sonido activado para el turno.");
        })
        .catch((err) => console.error("Error al activar audio:", err));
    }
  };

  return (
    <div className="p-6 bg-dark-900 min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Monitor de Cocina 👨‍🍳🔥
          </h1>
          <div className="flex gap-4 text-sm mt-1">
            <span className="flex items-center gap-1 text-emerald-400">
              ● {orders.length} Órdenes activas
            </span>
          </div>
        </div>

        {/* Botón de activación de sonido */}
        {!soundEnabled ? (
          <button
            onClick={enableAudio}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-dark-900 font-bold rounded-lg transition-colors flex items-center gap-2 text-sm"
          >
            🔊 Activar Alertas de Sonido
          </button>
        ) : (
          <div className="text-emerald-400 text-sm flex items-center gap-2 bg-emerald-500/10 px-4 py-2 rounded-lg border border-emerald-500/20">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            Alertas de sonido listas
          </div>
        )}
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
                    Orden #{order.order_number || "S/N"}
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
                {order.order_items.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-col border-b border-dark-700/50 pb-2 last:border-0"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex gap-3 items-center">
                        <span className="text-xl font-bold text-emerald-400 bg-emerald-500/10 w-8 h-8 flex items-center justify-center rounded-lg">
                          {item.quantity}
                        </span>
                        <span className="text-white text-base font-medium">
                          {item.product_name}
                        </span>
                      </div>
                    </div>
                    {/* Renderizamos las notas si existen (Preparamos Problema 3 y 5) */}
                    {item.notes && (
                      <p className="text-amber-400 text-sm mt-1 ml-11">
                        📝 {item.notes}
                      </p>
                    )}
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
