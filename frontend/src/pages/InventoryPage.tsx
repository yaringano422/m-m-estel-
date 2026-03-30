import { useEffect, useState } from "react";
import { inventoryApi } from "../api/endpoints";
import type { InventoryItem } from "../types";
import { Search, AlertTriangle, Package, ArrowUpCircle, X } from "lucide-react";
import clsx from "clsx";
import toast from "react-hot-toast";

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [search, setSearch] = useState("");
  const [filterLow, setFilterLow] = useState(false);
  const [showRestock, setShowRestock] = useState<string | null>(null);
  const [restockQty, setRestockQty] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const { data } = await inventoryApi.getAll();
      setItems(data);
    } catch (error) {
      console.error("Error cargando inventario de Supabase:", error);
      toast.error("No se pudo conectar con el inventario real.");
      setItems([]); // Dejamos la lista vacía en lugar de poner comida mexicana
    } finally {
      setLoading(false);
    }
  };

  const filtered = items.filter((i) => {
    const matchesSearch =
      !search || i.productName.toLowerCase().includes(search.toLowerCase());
    const matchesLow = !filterLow || i.isLowStock;
    return matchesSearch && matchesLow;
  });

  const lowStockCount = items.filter((i) => i.isLowStock).length;

  const handleRestock = async (id: string) => {
    if (!restockQty || parseFloat(restockQty) <= 0) return;
    try {
      await inventoryApi.restock(id, { quantity: parseFloat(restockQty) });
      toast.success("Stock actualizado");
      loadData();
    } catch {
      setItems((prev) =>
        prev.map((i) =>
          i.id === id
            ? {
                ...i,
                currentStock: i.currentStock + parseFloat(restockQty),
                isLowStock:
                  i.currentStock + parseFloat(restockQty) <= i.minStock,
              }
            : i,
        ),
      );
      toast.success("Stock actualizado (demo)");
    }
    setShowRestock(null);
    setRestockQty("");
  };

  const getStockPercentage = (current: number, max: number) =>
    Math.min(100, (current / max) * 100);

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
          <h1 className="text-2xl font-bold text-white">Inventario</h1>
          <p className="text-dark-400 text-sm mt-1">
            {items.length} productos en inventario
          </p>
        </div>
        {lowStockCount > 0 && (
          <div className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/20 rounded-xl">
            <AlertTriangle size={18} className="text-amber-400" />
            <span className="text-sm font-medium text-amber-400">
              {lowStockCount} con stock bajo
            </span>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-400"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-11"
            placeholder="Buscar producto..."
          />
        </div>
        <button
          onClick={() => setFilterLow(!filterLow)}
          className={clsx(
            "px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2",
            filterLow
              ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
              : "bg-dark-800 text-dark-300 hover:bg-dark-700 border border-dark-700",
          )}
        >
          <AlertTriangle size={16} />
          Stock Bajo
        </button>
      </div>

      {/* Inventory table */}
      <div className="glass-panel overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-dark-700">
              <th className="table-header text-left p-4">Producto</th>
              <th className="table-header text-left p-4">Categoría</th>
              <th className="table-header text-center p-4">Stock Actual</th>
              <th className="table-header text-center p-4">Mín / Máx</th>
              <th className="table-header text-left p-4 w-48">Nivel</th>
              <th className="table-header text-center p-4">Estado</th>
              <th className="table-header text-right p-4">Acción</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((item) => {
              const pct = getStockPercentage(item.currentStock, item.maxStock);
              return (
                <tr
                  key={item.id}
                  className="border-b border-dark-800 hover:bg-dark-800/50 transition-colors"
                >
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={clsx(
                          "w-10 h-10 rounded-xl flex items-center justify-center",
                          item.isLowStock ? "bg-amber-500/10" : "bg-dark-700",
                        )}
                      >
                        <Package
                          size={18}
                          className={
                            item.isLowStock ? "text-amber-400" : "text-dark-400"
                          }
                        />
                      </div>
                      <div>
                        <p className="font-medium text-white text-sm">
                          {item.productName}
                        </p>
                        {item.sku && (
                          <p className="text-xs text-dark-400">{item.sku}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-sm text-dark-300">
                    {item.categoryName}
                  </td>
                  <td className="p-4 text-center">
                    <span
                      className={clsx(
                        "text-lg font-bold",
                        item.isLowStock ? "text-amber-400" : "text-white",
                      )}
                    >
                      {item.currentStock}
                    </span>
                    <span className="text-xs text-dark-400 ml-1">
                      {item.unit}
                    </span>
                  </td>
                  <td className="p-4 text-center text-sm text-dark-400">
                    {item.minStock} / {item.maxStock}
                  </td>
                  <td className="p-4">
                    <div className="w-full bg-dark-700 rounded-full h-2">
                      <div
                        className={clsx(
                          "h-2 rounded-full transition-all duration-500",
                          pct <= 20
                            ? "bg-red-500"
                            : pct <= 40
                              ? "bg-amber-500"
                              : "bg-emerald-500",
                        )}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </td>
                  <td className="p-4 text-center">
                    {item.isLowStock ? (
                      <span className="badge-warning flex items-center gap-1 justify-center">
                        <AlertTriangle size={12} /> Bajo
                      </span>
                    ) : (
                      <span className="badge-success">Normal</span>
                    )}
                  </td>
                  <td className="p-4 text-right">
                    <button
                      onClick={() => {
                        setShowRestock(item.id);
                        setRestockQty("");
                      }}
                      className="inline-flex items-center gap-1 text-sm text-brand-400 hover:text-brand-300 transition-colors"
                    >
                      <ArrowUpCircle size={16} />
                      Resurtir
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Restock Modal */}
      {showRestock && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-sm p-6 animate-scale-in">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Resurtir Stock</h2>
              <button
                onClick={() => setShowRestock(null)}
                className="text-dark-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>
            <p className="text-sm text-dark-300 mb-4">
              {items.find((i) => i.id === showRestock)?.productName}
            </p>
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-1">
                Cantidad a agregar
              </label>
              <input
                type="number"
                value={restockQty}
                onChange={(e) => setRestockQty(e.target.value)}
                className="input-field text-xl text-center font-bold"
                placeholder="0"
                autoFocus
              />
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowRestock(null)}
                className="flex-1 btn-secondary"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleRestock(showRestock)}
                className="flex-1 btn-primary"
                disabled={!restockQty}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
//inventory
