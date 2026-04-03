import { useEffect, useState } from "react";
import { tablesApi } from "../api/endpoints";
import type { RestaurantTable } from "../types";
import { Plus, Users, Clock, DollarSign, X } from "lucide-react";
import clsx from "clsx";
import toast from "react-hot-toast";
import { supabase } from "../supabaseClient";

const STATUS_CONFIG = {
  available: {
    label: "Disponible",
    color: "bg-emerald-500",
    border: "border-emerald-500/30",
    text: "text-emerald-400",
    bg: "bg-emerald-500/10",
  },
  occupied: {
    label: "Ocupada",
    color: "bg-amber-500",
    border: "border-amber-500/30",
    text: "text-amber-400",
    bg: "bg-amber-500/10",
  },
  reserved: {
    label: "Reservada",
    color: "bg-blue-500",
    border: "border-blue-500/30",
    text: "text-blue-400",
    bg: "bg-blue-500/10",
  },
  maintenance: {
    label: "Mantenimiento",
    color: "bg-dark-500",
    border: "border-dark-500/30",
    text: "text-dark-400",
    bg: "bg-dark-500/10",
  },
};

export default function TablesPage() {
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [filterZone, setFilterZone] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    number: "",
    name: "",
    capacity: "4",
    zone: "Interior",
  });

  useEffect(() => {
    loadData();

    const tablesChannel = supabase
      .channel("realtime-tables")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "restaurant_tables",
        },
        () => {
          loadData();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(tablesChannel);
    };
  }, []);

  const loadData = async () => {
    try {
      setLoading(true); // Es buena práctica encender el cargando aquí

      // Consultamos directo a Supabase
      const { data, error } = await supabase
        .from("restaurant_tables")
        .select("*")
        .order("number", { ascending: true });

      if (error) throw error;

      setTables(data || []);
    } catch (error) {
      console.error("Error cargando mesas reales:", error);
      // Tu arreglo de respaldo por si falla...
      setTables([
        {
          id: "t1",
          number: 1,
          name: "Mesa 1",
          capacity: 4,
          status: "available",
          zone: "Interior",
          position_x: 1,
          position_y: 1,
        },
        // ... conservas el resto de tus objetos simulados
      ]);
    } finally {
      setLoading(false);
    }
  };

  const zones = Array.isArray(tables)
    ? [...new Set(tables.map((t) => t.zone))]
    : [];
  const filtered = tables.filter((t) => !filterZone || t.zone === filterZone);

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await tablesApi.updateStatus(id, status);
      loadData();
      toast.success("Estado actualizado");
    } catch (error) {
      console.error("Error al actualizar estado:", error);
      setTables((prev) =>
        prev.map((t) => (t.id === id ? { ...t, status: status as any } : t)),
      );
      toast.success("Estado actualizado (demo)");
    }
  };

  const handleCreate = async () => {
    try {
      await tablesApi.create(form);
      toast.success("Mesa creada");
      setShowForm(false);
      loadData();
    } catch (error) {
      console.error("Error al crear mesa:", error);
      toast.success("Mesa creada (demo)");
      setShowForm(false);
    }
  };

  const formatCurrency = (n: number) =>
    `$${n.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`;

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Mesas</h1>
          <p className="text-dark-400 text-sm mt-1">
            {tables.length} mesas configuradas
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={18} />
          Nueva Mesa
        </button>
      </div>

      {/* Status summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Object.entries(STATUS_CONFIG).map(([key, config]) => {
          const count = tables.filter((t) => t.status === key).length;
          return (
            <div
              key={key}
              className={clsx(
                "rounded-xl p-4 border",
                config.bg,
                config.border,
              )}
            >
              <div className="flex items-center gap-2 mb-1">
                <div
                  className={clsx("w-2.5 h-2.5 rounded-full", config.color)}
                />
                <span className={clsx("text-sm font-medium", config.text)}>
                  {config.label}
                </span>
              </div>
              <p className="text-2xl font-bold text-white">{count}</p>
            </div>
          );
        })}
      </div>

      {/* Zone filter */}
      <div className="flex gap-2">
        <button
          onClick={() => setFilterZone(null)}
          className={clsx(
            "px-4 py-2 rounded-xl text-sm font-medium transition-all",
            !filterZone
              ? "bg-brand-600 text-white"
              : "bg-dark-800 text-dark-300 hover:bg-dark-700",
          )}
        >
          Todas
        </button>
        {zones.map((zone) => (
          <button
            key={zone}
            onClick={() => setFilterZone(zone)}
            className={clsx(
              "px-4 py-2 rounded-xl text-sm font-medium transition-all",
              filterZone === zone
                ? "bg-brand-600 text-white"
                : "bg-dark-800 text-dark-300 hover:bg-dark-700",
            )}
          >
            {zone}
          </button>
        ))}
      </div>

      {/* Tables grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {Array.isArray(filtered) &&
          filtered.map((table) => {
            const config =
              STATUS_CONFIG[table.status] || STATUS_CONFIG.available;
            return (
              <div
                key={table.id}
                className={clsx(
                  "glass-panel-sm p-5 transition-all duration-200 hover:scale-[1.02] cursor-pointer border",
                  config.border,
                )}
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-white">{table.name}</h3>
                  <div className={clsx("w-3 h-3 rounded-full", config.color)} />
                </div>

                <div className="flex items-center gap-3 mb-3 text-dark-400 text-xs">
                  <span className="flex items-center gap-1">
                    <Users size={12} /> {table.capacity}
                  </span>
                  <span>{table.zone}</span>
                </div>

                <div
                  className={clsx(
                    "text-xs font-medium mb-3 px-2 py-1 rounded-lg inline-block",
                    config.bg,
                    config.text,
                  )}
                >
                  {config.label}
                </div>

                {table.currentOrder && (
                  <div className="bg-dark-700/50 rounded-lg p-3 space-y-1 mb-3">
                    <div className="flex items-center gap-1 text-xs text-dark-300">
                      <Clock size={12} /> Orden #
                      {table.currentOrder.orderNumber}
                    </div>
                    <div className="flex items-center gap-1 text-sm font-semibold text-brand-400">
                      <DollarSign size={14} />{" "}
                      {formatCurrency(table.currentOrder.total)}
                    </div>
                    {table.currentOrder.waiterName && (
                      <p className="text-xs text-dark-400">
                        {table.currentOrder.waiterName}
                      </p>
                    )}
                  </div>
                )}

                {/* Quick status change */}
                <div className="flex gap-1">
                  {table.status !== "available" && (
                    <button
                      onClick={() => handleStatusChange(table.id, "available")}
                      className="flex-1 text-xs py-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg hover:bg-emerald-500/20 transition-colors"
                    >
                      Liberar
                    </button>
                  )}
                  {table.status === "available" && (
                    <button
                      onClick={() => handleStatusChange(table.id, "reserved")}
                      className="flex-1 text-xs py-1.5 bg-blue-500/10 text-blue-400 rounded-lg hover:bg-blue-500/20 transition-colors"
                    >
                      Reservar
                    </button>
                  )}
                </div>
              </div>
            );
          })}
      </div>

      {/* Create Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-md p-6 animate-scale-in">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Nueva Mesa</h2>
              <button
                onClick={() => setShowForm(false)}
                className="text-dark-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-1">
                    Número
                  </label>
                  <input
                    type="number"
                    value={form.number}
                    onChange={(e) =>
                      setForm({ ...form, number: e.target.value })
                    }
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-1">
                    Capacidad
                  </label>
                  <input
                    type="number"
                    value={form.capacity}
                    onChange={(e) =>
                      setForm({ ...form, capacity: e.target.value })
                    }
                    className="input-field"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-1">
                  Nombre
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="input-field"
                  placeholder="Mesa X"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-1">
                  Zona
                </label>
                <select
                  value={form.zone}
                  onChange={(e) => setForm({ ...form, zone: e.target.value })}
                  className="input-field"
                >
                  <option value="Interior">Interior</option>
                  <option value="Terraza">Terraza</option>
                  <option value="Barra">Barra</option>
                  <option value="VIP">VIP</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowForm(false)}
                className="flex-1 btn-secondary"
              >
                Cancelar
              </button>
              <button onClick={handleCreate} className="flex-1 btn-primary">
                Crear Mesa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
