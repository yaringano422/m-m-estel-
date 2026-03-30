import { useEffect, useState } from "react";
import { productsApi, categoriesApi } from "../api/endpoints";
import type { Product, Category } from "../types";
import { Plus, Search, Edit, Trash2, Package, X } from "lucide-react";
import clsx from "clsx";
import toast from "react-hot-toast";

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    name: "",
    description: "",
    categoryId: "",
    price: "",
    cost: "",
    taxRate: "16",
    sku: "",
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [p, c] = await Promise.all([
        productsApi.getAll(),
        categoriesApi.getAll(),
      ]);
      setProducts(p.data);
      setCategories(c.data);
    } catch (error) {
      console.error("Error cargando productos de Supabase:", error);
      toast.error("No se pudo conectar con los productos reales.");
      setProducts([]);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  const filtered = products.filter((p) => {
    const matchesSearch =
      !search || p.name.toLowerCase().includes(search.toLowerCase());
    const matchesCat = !filterCategory || p.categoryId === filterCategory;
    return matchesSearch && matchesCat;
  });

  const formatCurrency = (n: number) =>
    `$${n.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`;

  const handleSave = async () => {
    try {
      const data = {
        name: form.name,
        description: form.description,
        categoryId: form.categoryId,
        price: parseFloat(form.price),
        cost: parseFloat(form.cost),
        taxRate: parseFloat(form.taxRate),
        sku: form.sku,
      };
      if (editId) {
        await productsApi.update(editId, data);
        toast.success("Producto actualizado");
      } else {
        await productsApi.create(data);
        toast.success("Producto creado");
      }
      setShowForm(false);
      setEditId(null);
      setForm({
        name: "",
        description: "",
        categoryId: "",
        price: "",
        cost: "",
        taxRate: "16",
        sku: "",
      });
      loadData();
    } catch {
      toast.success(
        editId ? "Producto actualizado (demo)" : "Producto creado (demo)",
      );
      setShowForm(false);
    }
  };

  const handleEdit = (p: Product) => {
    setEditId(p.id);
    setForm({
      name: p.name,
      description: p.description || "",
      categoryId: p.categoryId,
      price: String(p.price),
      cost: String(p.cost),
      taxRate: String(p.taxRate),
      sku: p.sku || "",
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar este producto?")) return;
    try {
      await productsApi.delete(id);
      toast.success("Producto eliminado");
      loadData();
    } catch {
      toast.success("Producto eliminado (demo)");
      setProducts((prev) => prev.filter((p) => p.id !== id));
    }
  };

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
          <h1 className="text-2xl font-bold text-white">Productos</h1>
          <p className="text-dark-400 text-sm mt-1">
            {products.length} productos registrados
          </p>
        </div>
        <button
          onClick={() => {
            setEditId(null);
            setForm({
              name: "",
              description: "",
              categoryId: "",
              price: "",
              cost: "",
              taxRate: "16",
              sku: "",
            });
            setShowForm(true);
          }}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={18} />
          Nuevo Producto
        </button>
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
        <select
          value={filterCategory || ""}
          onChange={(e) => setFilterCategory(e.target.value || null)}
          className="input-field w-48"
        >
          <option value="">Todas las categorías</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* Products table */}
      <div className="glass-panel overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-dark-700">
              <th className="table-header text-left p-4">Producto</th>
              <th className="table-header text-left p-4">Categoría</th>
              <th className="table-header text-right p-4">Precio</th>
              <th className="table-header text-right p-4">Costo</th>
              <th className="table-header text-right p-4">Margen</th>
              <th className="table-header text-center p-4">Estado</th>
              <th className="table-header text-right p-4">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => {
              const margin =
                p.price > 0
                  ? (((p.price - p.cost) / p.price) * 100).toFixed(1)
                  : "0";
              return (
                <tr
                  key={p.id}
                  className="border-b border-dark-800 hover:bg-dark-800/50 transition-colors"
                >
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-dark-700 rounded-xl flex items-center justify-center">
                        <Package size={18} className="text-dark-400" />
                      </div>
                      <div>
                        <p className="font-medium text-white text-sm">
                          {p.name}
                        </p>
                        {p.sku && (
                          <p className="text-xs text-dark-400">SKU: {p.sku}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-sm text-dark-300">
                    {p.categoryName}
                  </td>
                  <td className="p-4 text-sm text-white font-medium text-right">
                    {formatCurrency(p.price)}
                  </td>
                  <td className="p-4 text-sm text-dark-300 text-right">
                    {formatCurrency(p.cost)}
                  </td>
                  <td className="p-4 text-right">
                    <span
                      className={clsx(
                        "text-sm font-medium",
                        parseFloat(margin) > 50
                          ? "text-emerald-400"
                          : parseFloat(margin) > 30
                            ? "text-amber-400"
                            : "text-red-400",
                      )}
                    >
                      {margin}%
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    <span
                      className={
                        p.isAvailable ? "badge-success" : "badge-danger"
                      }
                    >
                      {p.isAvailable ? "Disponible" : "No disponible"}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center gap-1 justify-end">
                      <button
                        onClick={() => handleEdit(p)}
                        className="p-2 hover:bg-dark-700 rounded-lg text-dark-400 hover:text-brand-400 transition-colors"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(p.id)}
                        className="p-2 hover:bg-dark-700 rounded-lg text-dark-400 hover:text-red-400 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Product Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-lg p-6 animate-scale-in">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">
                {editId ? "Editar Producto" : "Nuevo Producto"}
              </h2>
              <button
                onClick={() => setShowForm(false)}
                className="text-dark-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-1">
                  Nombre *
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="input-field"
                  placeholder="Nombre del producto"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-1">
                  Descripción
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  className="input-field"
                  rows={2}
                  placeholder="Descripción"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-1">
                  Categoría *
                </label>
                <select
                  value={form.categoryId}
                  onChange={(e) =>
                    setForm({ ...form, categoryId: e.target.value })
                  }
                  className="input-field"
                >
                  <option value="">Seleccionar...</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-1">
                    Precio *
                  </label>
                  <input
                    type="number"
                    value={form.price}
                    onChange={(e) =>
                      setForm({ ...form, price: e.target.value })
                    }
                    className="input-field"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-1">
                    Costo
                  </label>
                  <input
                    type="number"
                    value={form.cost}
                    onChange={(e) => setForm({ ...form, cost: e.target.value })}
                    className="input-field"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-1">
                    IVA %
                  </label>
                  <input
                    type="number"
                    value={form.taxRate}
                    onChange={(e) =>
                      setForm({ ...form, taxRate: e.target.value })
                    }
                    className="input-field"
                    placeholder="16"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-1">
                  SKU
                </label>
                <input
                  type="text"
                  value={form.sku}
                  onChange={(e) => setForm({ ...form, sku: e.target.value })}
                  className="input-field"
                  placeholder="SKU-001"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowForm(false)}
                className="flex-1 btn-secondary"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                className="flex-1 btn-primary"
                disabled={!form.name || !form.price}
              >
                {editId ? "Actualizar" : "Crear Producto"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
