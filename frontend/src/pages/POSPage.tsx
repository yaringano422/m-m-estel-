import { supabase } from "../supabaseClient";
import { useEffect, useState } from "react";
import { useCartStore } from "../store/cartStore";
import type { Product, Category } from "../types";
import {
  Search,
  Plus,
  Minus,
  Trash2,
  ShoppingBag,
  X,
  CreditCard,
  Banknote,
  Receipt,
  CheckCircle,
  LayoutGrid,
  Users,
} from "lucide-react";
import clsx from "clsx";
import toast from "react-hot-toast";

export default function POSPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showPayment, setShowPayment] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card" | "mixed">(
    "cash",
  );
  const [cashReceived, setCashReceived] = useState("");
  const [loading, setLoading] = useState(true);
  const [showTableSelection, setShowTableSelection] = useState(true);
  const [tables, setTables] = useState<any[]>([]);
  const cart = useCartStore();

  useEffect(() => {
    loadData();
    loadTables();
  }, []);
  const loadTables = async () => {
    try {
      const { data, error } = await supabase
        .from("restaurant_tables")
        .select(`*, orders(id, status, total)`)
        .order("number", { ascending: true });

      if (error) throw error;
      setTables(data || []);
    } catch (error) {
      console.error("Error cargando mesas:", error);
    }
  };

  const handleSelectTable = async (table: any) => {
    cart.setTable(table.id);

    if (table.status === "occupied") {
      const { data: activeOrder } = await supabase
        .from("orders")
        .select("*")
        .eq("table_id", table.id)
        .in("status", ["open", "in_progress"])
        .maybeSingle();

      if (activeOrder) {
        cart.setOrderId(activeOrder.id);
        cart.setCustomer(activeOrder.customer_name, activeOrder.customer_count);
        toast.success(`Reabriendo orden de ${table.name}`);
      }
    } else {
      cart.setOrderId(null); // Mesa limpia, orden nueva
    }
    setShowTableSelection(false);
  };

  const loadData = async () => {
    try {
      setLoading(true);

      // Categorías desde Supabase
      const { data: categoriesData, error: catError } = await supabase
        .from("categories")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (catError) throw catError;

      setCategories(
        categoriesData.map((c: any) => ({
          id: c.id,
          name: c.name,
          icon: c.icon,
          color: c.color,
          sortOrder: c.sort_order,
          isActive: c.is_active,
          productCount: 0,
        })),
      );

      // Productos con JOIN
      const { data: productsData, error: prodError } = await supabase
        .from("products")
        .select(
          `
          *,
          categories ( name )
        `,
        )
        .eq("is_active", true);

      if (prodError) throw prodError;

      setProducts(
        productsData.map((p: any) => ({
          id: p.id,
          categoryId: p.category_id,
          categoryName: p.categories?.name || "",
          name: p.name,
          price: p.price,
          cost: p.cost || 0,
          taxRate: p.tax_rate || 18,
          isAvailable: p.is_available,
          preparationTime: p.preparation_time || 0,
          variants: [],
          description: p.description || "",
        })),
      );
    } catch (error) {
      console.error("Error cargando datos:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter((p) => {
    const matchesCategory = !activeCategory || p.categoryId === activeCategory;
    const matchesSearch =
      !search || p.name.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch && p.isAvailable;
  });

  const formatCurrency = (n: number) =>
    `$${n.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`;

  const handleAddToCart = (product: Product) => {
    cart.addItem({
      productId: product.id,
      productName: product.name,
      price: product.price,
      taxRate: product.taxRate,
      variants: [],
    });
  };

  const handlePayment = async () => {
    if (cart.items.length === 0) return;

    try {
      const now = new Date().toISOString();

      // 1. Crear ORDER
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert([
          {
            branch_id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
            table_id: cart.tableId,
            user_id: null,
            cashier_id: null,
            status: "paid",
            subtotal: cart.getSubtotal(),
            tax_amount: cart.getTaxAmount(),
            discount_amount: cart.discountAmount,
            total: cart.getTotal(),
            payment_method: paymentMethod,
            cash_received:
              paymentMethod === "cash" ? parseFloat(cashReceived) : null,
            change_amount:
              paymentMethod === "cash"
                ? parseFloat(cashReceived) - cart.getTotal()
                : null,
            customer_name: cart.customerName || "Cliente",
            customer_count: cart.customerCount || 1,
            created_at: now,
            paid_at: now,
          },
        ])
        .select()
        .single();

      if (orderError) throw orderError;

      // 2. Crear ORDER ITEMS
      const itemsToInsert = cart.items.map((item) => ({
        order_id: order.id,
        product_id: item.productId,
        product_name: item.productName,
        quantity: item.quantity,
        unit_price: item.price,
        tax_rate: item.taxRate,
        tax_amount: (item.price * item.quantity * item.taxRate) / 100,
        subtotal: item.price * item.quantity,
        total:
          item.price * item.quantity +
          (item.price * item.quantity * item.taxRate) / 100,
        created_at: now,
      }));

      const { error: itemsError } = await supabase
        .from("order_items")
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;

      // 3 y 4. INVENTARIO + MOVIMIENTOS
      for (const item of cart.items) {
        const { data: inventory } = await supabase
          .from("inventory")
          .select("*")
          .eq("product_id", item.productId)
          .maybeSingle();

        if (!inventory) continue;

        const newStock = inventory.current_stock - item.quantity;

        // actualizar stock
        await supabase
          .from("inventory")
          .update({
            current_stock: newStock,
            updated_at: now,
          })
          .eq("id", inventory.id);

        // registrar movimiento
        await supabase.from("inventory_movements").insert([
          {
            inventory_id: inventory.id,
            order_id: order.id,
            type: "sale",
            quantity: item.quantity,
            previous_stock: inventory.current_stock,
            new_stock: newStock,
            created_at: now,
          },
        ]);
      }

      toast.success("¡Venta registrada correctamente!");

      cart.clearCart();
      setShowPayment(false);
      setCashReceived("");
    } catch (error: any) {
      console.error("ERROR REAL 👉", error.message, error.details);
      toast.error("Error al registrar venta");
    }
  };

  const handleSendOrder = async () => {
    if (cart.items.length === 0) {
      toast.error("Agrega productos primero");
      return;
    }

    try {
      const now = new Date().toISOString();
      let orderId = cart.orderId;

      // 1. Si NO existe una orden previa, crearla. Si existe, actualizar totales.
      if (!orderId) {
        const { data: newOrder, error: orderError } = await supabase
          .from("orders")
          .insert([
            {
              branch_id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
              table_id: cart.tableId,
              status: "in_progress",
              subtotal: cart.getSubtotal(),
              tax_amount: cart.getTaxAmount(),
              total: cart.getTotal(),
              customer_name: cart.customerName || "Cliente",
              customer_count: cart.customerCount || 1,
              created_at: now,
            },
          ])
          .select()
          .single();

        if (orderError) throw orderError;
        orderId = newOrder.id;
      } else {
        // Actualizar totales de la orden existente
        await supabase
          .from("orders")
          .update({
            subtotal: cart.getSubtotal(),
            tax_amount: cart.getTaxAmount(),
            total: cart.getTotal(),
            updated_at: now,
          })
          .eq("id", orderId);
      }

      // 2. Insertar items
      const itemsToInsert = cart.items.map((item) => ({
        order_id: orderId,
        product_id: item.productId,
        product_name: item.productName,
        quantity: item.quantity,
        unit_price: item.price,
        tax_rate: item.taxRate,
        tax_amount: (item.price * item.quantity * item.taxRate) / 100,
        subtotal: item.price * item.quantity,
        total:
          item.price * item.quantity +
          (item.price * item.quantity * item.taxRate) / 100,
        created_at: now,
      }));
      await supabase.from("order_items").delete().eq("order_id", orderId);
      const { error: itemsError } = await supabase
        .from("order_items")
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;

      // 3. Actualizar estado de la mesa a ocupada
      if (cart.tableId) {
        await supabase
          .from("restaurant_tables")
          .update({ status: "occupied" })
          .eq("id", cart.tableId);
      }

      toast.success("Orden enviada a cocina 👨‍🍳🔥");
      cart.clearCart();
      setShowTableSelection(true); // Regresar a mesas
      loadTables(); // Refrescar vista
    } catch (error: any) {
      console.error("ERROR ENVIANDO ORDEN:", error.message);
      toast.error("Error al enviar orden");
    }
  };

  const changeAmount =
    paymentMethod === "cash" && cashReceived
      ? parseFloat(cashReceived) - cart.getTotal()
      : 0;

  return (
    <div className="flex gap-4 h-[calc(100vh-7rem)] animate-fade-in">
      {/* Product Grid */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Search and categories */}
        <div className="mb-4 space-y-3">
          <div className="relative">
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

          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            <button
              onClick={() => setActiveCategory(null)}
              className={clsx(
                "px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-200",
                !activeCategory
                  ? "bg-brand-600 text-white shadow-lg shadow-brand-600/20"
                  : "bg-dark-800 text-dark-300 hover:bg-dark-700",
              )}
            >
              Todos
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={clsx(
                  "px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-200",
                  activeCategory === cat.id
                    ? "text-white shadow-lg"
                    : "bg-dark-800 text-dark-300 hover:bg-dark-700",
                )}
                style={
                  activeCategory === cat.id
                    ? {
                        backgroundColor: cat.color || "#3b82f6",
                        boxShadow: `0 4px 14px ${cat.color}33`,
                      }
                    : {}
                }
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Products grid */}
        <div className="flex-1 overflow-y-auto grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 content-start">
          {filteredProducts.map((product) => (
            <button
              key={product.id}
              onClick={() => handleAddToCart(product)}
              className="glass-panel-sm p-4 text-left hover:border-brand-500/30 transition-all duration-200 active:scale-[0.97] group"
            >
              <div className="flex items-start justify-between mb-2">
                <h3 className="text-sm font-semibold text-white group-hover:text-brand-300 transition-colors line-clamp-2 leading-tight">
                  {product.name}
                </h3>
              </div>
              {product.description && (
                <p className="text-xs text-dark-400 mb-3 line-clamp-1">
                  {product.description}
                </p>
              )}
              <div className="flex items-center justify-between">
                <span className="text-lg font-bold text-brand-400">
                  {formatCurrency(product.price)}
                </span>
                <div className="w-8 h-8 bg-brand-600/20 rounded-lg flex items-center justify-center group-hover:bg-brand-600 transition-colors">
                  <Plus
                    size={16}
                    className="text-brand-400 group-hover:text-white"
                  />
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Cart Sidebar */}
      <div className="w-80 xl:w-96 glass-panel flex flex-col shrink-0">
        <div className="p-4 border-b border-dark-700">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-white flex items-center gap-2">
              <ShoppingBag size={18} className="text-brand-400" />
              Orden Actual
            </h2>
            {cart.items.length > 0 && (
              <button
                onClick={cart.clearCart}
                className="text-xs text-dark-400 hover:text-red-400 transition-colors"
              >
                Limpiar
              </button>
            )}
          </div>
        </div>

        {/* Cart items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {cart.items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-dark-500">
              <ShoppingBag size={48} className="mb-3 opacity-30" />
              <p className="text-sm">Agrega productos</p>
            </div>
          ) : (
            cart.items.map((item) => (
              <div
                key={item.productId}
                className="bg-dark-700/50 rounded-xl p-3 animate-scale-in"
              >
                <div className="flex items-start justify-between mb-2">
                  <h4 className="text-sm font-medium text-white flex-1 pr-2">
                    {item.productName}
                  </h4>
                  <button
                    onClick={() => cart.removeItem(item.productId)}
                    className="text-dark-500 hover:text-red-400 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() =>
                        cart.updateQuantity(item.productId, item.quantity - 1)
                      }
                      className="w-7 h-7 bg-dark-600 hover:bg-dark-500 rounded-lg flex items-center justify-center transition-colors"
                    >
                      <Minus size={12} />
                    </button>
                    <span className="text-sm font-semibold text-white w-6 text-center">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() =>
                        cart.updateQuantity(item.productId, item.quantity + 1)
                      }
                      className="w-7 h-7 bg-dark-600 hover:bg-dark-500 rounded-lg flex items-center justify-center transition-colors"
                    >
                      <Plus size={12} />
                    </button>
                  </div>
                  <span className="text-sm font-semibold text-brand-400">
                    {formatCurrency(item.price * item.quantity)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Cart totals */}
        {cart.items.length > 0 && (
          <div className="p-4 border-t border-dark-700 space-y-3">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-dark-400">Subtotal</span>
                <span className="text-white">
                  {formatCurrency(cart.getSubtotal())}
                </span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-dark-400">IGV (18%)</span>
                <span className="text-white">
                  {formatCurrency(cart.getTaxAmount())}
                </span>
              </div>

              {cart.discountAmount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-dark-400">Descuento</span>
                  <span className="text-red-400">
                    -{formatCurrency(cart.discountAmount)}
                  </span>
                </div>
              )}

              <div className="flex justify-between text-lg font-bold pt-2 border-t border-dark-600">
                <span className="text-white">Total</span>
                <span className="text-brand-400">
                  {formatCurrency(cart.getTotal())}
                </span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleSendOrder}
                className="w-full btn-warning py-3 text-base"
              >
                🍳 Enviar a cocina
              </button>

              <button
                onClick={() => setShowPayment(true)}
                className="w-full btn-success py-3 text-base flex items-center justify-center gap-2"
              >
                <Receipt size={18} />
                Cobrar
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Payment Modal */}
      {showPayment && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-md p-6 animate-scale-in">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Procesar Pago</h2>
              <button
                onClick={() => setShowPayment(false)}
                className="text-dark-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            <div className="text-center mb-6">
              <p className="text-dark-400 text-sm">Total a cobrar</p>
              <p className="text-4xl font-bold text-brand-400 mt-1">
                {formatCurrency(cart.getTotal())}
              </p>
            </div>

            {/* Payment method selection */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              {[
                { id: "cash" as const, icon: Banknote, label: "Efectivo" },
                { id: "card" as const, icon: CreditCard, label: "Tarjeta" },
                { id: "mixed" as const, icon: Receipt, label: "Mixto" },
              ].map((method) => (
                <button
                  key={method.id}
                  onClick={() => setPaymentMethod(method.id)}
                  className={clsx(
                    "p-4 rounded-xl border transition-all duration-200 text-center",
                    paymentMethod === method.id
                      ? "bg-brand-600/10 border-brand-500 text-brand-400"
                      : "bg-dark-800 border-dark-600 text-dark-300 hover:border-dark-500",
                  )}
                >
                  <method.icon size={24} className="mx-auto mb-2" />
                  <span className="text-xs font-medium">{method.label}</span>
                </button>
              ))}
            </div>

            {/* Cash input */}
            {paymentMethod === "cash" && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-dark-300 mb-2">
                  Efectivo recibido
                </label>
                <input
                  type="number"
                  value={cashReceived}
                  onChange={(e) => setCashReceived(e.target.value)}
                  className="input-field text-2xl text-center font-bold"
                  placeholder="$0.00"
                  autoFocus
                />
                {cashReceived && changeAmount >= 0 && (
                  <div className="mt-3 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-center">
                    <p className="text-sm text-dark-300">Cambio:</p>
                    <p className="text-2xl font-bold text-emerald-400">
                      {formatCurrency(changeAmount)}
                    </p>
                  </div>
                )}

                {/* Quick amounts */}
                <div className="grid grid-cols-4 gap-2 mt-3">
                  {[50, 100, 200, 500].map((amount) => (
                    <button
                      key={amount}
                      onClick={() =>
                        setCashReceived(
                          String(Math.ceil(cart.getTotal() / amount) * amount),
                        )
                      }
                      className="py-2 bg-dark-700 hover:bg-dark-600 rounded-lg text-sm font-medium text-dark-200 transition-colors"
                    >
                      ${amount}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={handlePayment}
              disabled={
                paymentMethod === "cash" &&
                (!cashReceived || parseFloat(cashReceived) < cart.getTotal())
              }
              className="w-full btn-success py-3 text-base flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CheckCircle size={18} />
              Confirmar Pago
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
