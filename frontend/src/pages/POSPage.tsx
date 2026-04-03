import { supabase } from "../supabaseClient";
import { useEffect, useState } from "react";
import { useCartStore } from "../store/cartStore";
import type { Product, Category } from "../types";
import ModalCustomization from "../components/ModalCustomization";
import type { SelectedVariant } from "../store/cartStore";
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
  Settings2,
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

  // 🔥 ESTADOS PARA EL MODAL DE PERSONALIZACIÓN
  const [isCustomizationOpen, setIsCustomizationOpen] = useState(false);
  const [itemToCustomize, setItemToCustomize] = useState<any>(null);
  // Función para abrir el modal
  const handleOpenCustomization = (item: any) => {
    setItemToCustomize(item);
    setIsCustomizationOpen(true);
  };

  // Estado para abrir/cerrar el carrito en celulares
  const [showMobileCart, setShowMobileCart] = useState(false);

  const currentUser = { id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22" };

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
      cart.setOrderId(null);
    }
    setShowTableSelection(false);
  };

  const loadData = async () => {
    try {
      setLoading(true);

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

      const { data: productsData, error: prodError } = await supabase
        .from("products")
        .select(`*, categories ( name )`)
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

  const handleSearchActiveOrder = async (searchTerm: string) => {
    cart.setCustomer(searchTerm, cart.customerCount || 1);

    if (searchTerm.length < 3) return;

    try {
      const { data: activeOrder, error } = await supabase
        .from("orders")
        .select("*")
        .eq("customer_name", searchTerm)
        .in("status", ["open", "in_progress"])
        .maybeSingle();

      if (error) throw error;

      if (activeOrder) {
        cart.setOrderId(activeOrder.id);
        toast.success(`Reabriendo cuenta de: ${searchTerm}`);

        const { data: previousItems, error: itemsError } = await supabase
          .from("order_items")
          .select("*")
          .eq("order_id", activeOrder.id);

        if (itemsError) throw itemsError;

        cart.clearCart();
        cart.setOrderId(activeOrder.id);
        cart.setCustomer(searchTerm, activeOrder.customer_count || 1);

        if (previousItems && previousItems.length > 0) {
          previousItems.forEach((item: any) => {
            cart.addItem({
              productId: item.product_id,
              productName: item.product_name,
              price: item.unit_price,
              taxRate: item.tax_rate,
              variants: [],
              // @ts-ignore
              alreadySaved: true,
            });
            if (item.quantity > 1) {
              cart.updateQuantity(item.product_id, item.quantity);
            }
          });
        }
      } else {
        cart.setOrderId(null);
      }
    } catch (error) {
      console.error("Error buscando orden activa:", error);
    }
  };

  const handleSendToKitchen = async () => {
    if (!cart.items || cart.items.length === 0) {
      toast.error("El carrito está vacío");
      return;
    }

    try {
      const now = new Date().toISOString();
      let orderId = cart.orderId;

      if (!orderId) {
        const { data: newOrder, error: orderError } = await supabase
          .from("orders")
          .insert([
            {
              branch_id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
              table_id: cart.tableId,
              customer_name: cart.customerName || "Cliente",
              customer_count: cart.customerCount || 1,
              status: "in_progress",
              subtotal: cart.getSubtotal(),
              tax_amount: cart.getTaxAmount(),
              total: cart.getTotal(),
              created_at: now,
            },
          ])
          .select()
          .single();

        if (orderError) throw orderError;
        orderId = newOrder.id;
        cart.setOrderId(orderId);
      }

      const newItems = cart.items.filter((item: any) => !item.alreadySaved);

      if (newItems.length === 0) {
        toast("No hay productos nuevos para mandar a cocina", { icon: "ℹ️" });
        return;
      }

      for (const item of newItems) {
        const { data: insertedItem, error: itemError } = await supabase
          .from("order_items")
          .insert([
            {
              order_id: orderId,
              product_id: item.productId,
              product_name: item.productName,
              quantity: item.quantity,
              unit_price: item.price,
              tax_rate: item.taxRate || 0,
              tax_amount:
                (item.price * item.quantity * (item.taxRate || 0)) / 100,
              subtotal: item.price * item.quantity,
              total:
                item.price * item.quantity +
                (item.price * item.quantity * (item.taxRate || 0)) / 100,
              status: "pending",
              created_at: now,
              notes: item.notes || null,
            },
          ])
          .select()
          .single();

        if (itemError) throw itemError;

        if (item.variants && item.variants.length > 0) {
          const variantsToInsert = item.variants.map((v: any) => ({
            order_item_id: insertedItem.id,
            variant_id: v.variantId,
            variant_name: v.variantName,
            price_modifier: v.priceModifier || 0,
          }));

          const { error: variantError } = await supabase
            .from("order_item_variants")
            .insert(variantsToInsert);

          if (variantError) throw variantError;
        }
      }

      if (cart.orderId) {
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

      if (cart.tableId) {
        await supabase
          .from("restaurant_tables")
          .update({ status: "occupied" })
          .eq("id", cart.tableId);
      }

      toast.success("¡Pedido enviado a cocina! 👨‍🍳🔥");

      cart.clearCart();
      setShowTableSelection(true);
      loadTables();
      setShowMobileCart(false);
    } catch (error: any) {
      console.error("ERROR ENVIANDO ORDEN:", error.message);
      toast.error("Error al enviar orden");
    }
  };

  const filteredProducts = products.filter((p) => {
    const matchesCategory = !activeCategory || p.categoryId === activeCategory;
    const matchesSearch =
      !search || p.name.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch && p.isAvailable;
  });

  const formatCurrency = (n: number) =>
    `S/ ${n.toLocaleString("es-PE", { minimumFractionDigits: 2 })}`;

  const handleAddToCart = (product: Product) => {
    cart.addItem({
      productId: product.id,
      productName: product.name,
      price: product.price,
      taxRate: product.taxRate,
      variants: [],
    });
    toast.success(`${product.name} agregado`, {
      duration: 1000,
      position: "bottom-center",
    });
  };

  const registerInventoryMovement = async (
    productId: string,
    quantitySold: number,
    orderId: string,
    userId: string,
  ) => {
    const { data: inv } = await supabase
      .from("inventory")
      .select("id, current_stock")
      .eq("product_id", productId)
      .single();

    if (!inv) return;

    const previousStock = parseFloat(inv.current_stock);
    const newStock = previousStock - quantitySold;

    await supabase
      .from("inventory")
      .update({ current_stock: newStock, updated_at: new Date() })
      .eq("id", inv.id);

    await supabase.from("inventory_movements").insert({
      inventory_id: inv.id,
      order_id: orderId,
      user_id: userId,
      type: "sale",
      quantity: quantitySold,
      previous_stock: previousStock,
      new_stock: newStock,
      notes: "Sale processed from POS",
      created_at: new Date(),
    });
  };

  const baseTotal = cart.getTotal();
  const cardFee = paymentMethod === "card" ? baseTotal * 0.05 : 0;
  const finalTotal = baseTotal + cardFee;

  const handlePayment = async () => {
    if (cart.items.length === 0) return;

    try {
      const now = new Date().toISOString();

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
            tip_amount: cardFee,
            total: finalTotal,
            payment_method: paymentMethod,
            cash_received:
              paymentMethod === "cash" ? parseFloat(cashReceived) : null,
            change_amount:
              paymentMethod === "cash"
                ? parseFloat(cashReceived) - finalTotal
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
        notes: item.notes || null, // 👈 Respetando también las notas al cobrar
      }));

      const { error: itemsError } = await supabase
        .from("order_items")
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;

      await Promise.all(
        cart.items.map(async (item) => {
          await registerInventoryMovement(
            item.productId,
            item.quantity,
            order.id || cart.orderId || "",
            currentUser.id,
          );
        }),
      );

      toast.success("¡Venta registrada correctamente!");

      cart.clearCart();
      setShowPayment(false);
      setCashReceived("");
      setShowMobileCart(false);
    } catch (error: any) {
      console.error("ERROR REAL 👉", error.message);
      toast.error("Error al registrar venta");
    }
  };

  const changeAmount =
    paymentMethod === "cash" && cashReceived
      ? parseFloat(cashReceived) - finalTotal
      : 0;

  const totalItemsCount = cart.items.reduce(
    (acc, item) => acc + item.quantity,
    0,
  );

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-7rem)] animate-fade-in relative overflow-hidden">
      {totalItemsCount > 0 && !showMobileCart && (
        <button
          onClick={() => setShowMobileCart(true)}
          className="lg:hidden fixed bottom-4 right-4 z-50 bg-brand-600 text-white p-4 rounded-full shadow-2xl flex items-center gap-2 animate-bounce-slow"
        >
          <ShoppingBag size={24} />
          <span className="font-bold bg-white text-brand-600 rounded-full w-6 h-6 flex items-center justify-center text-xs">
            {totalItemsCount}
          </span>
        </button>
      )}

      {/* Area de Productos */}
      <div className="flex-1 flex flex-col min-w-0">
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

        <div className="h-[60vh] lg:h-auto flex-1 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 xl:grid-cols-4 gap-3 content-start no-scrollbar-thumb">
          {filteredProducts.map((product) => (
            <button
              key={product.id}
              onClick={() => handleAddToCart(product)}
              className="glass-panel-sm p-3 sm:p-4 text-left hover:border-brand-500/30 transition-all duration-200 active:scale-[0.97] group"
            >
              <div className="flex items-start justify-between mb-2">
                <h3 className="text-xs sm:text-sm font-semibold text-white group-hover:text-brand-300 transition-colors line-clamp-2 leading-tight">
                  {product.name}
                </h3>
              </div>
              {product.description && (
                <p className="text-xs text-dark-400 mb-3 line-clamp-1">
                  {product.description}
                </p>
              )}
              <div className="flex items-center justify-between">
                <span className="text-sm sm:text-lg font-bold text-brand-400">
                  {formatCurrency(product.price)}
                </span>
                <div className="w-7 h-7 sm:w-8 sm:h-8 bg-brand-600/20 rounded-lg flex items-center justify-center group-hover:bg-brand-600 transition-colors">
                  <Plus
                    size={14}
                    className="text-brand-400 group-hover:text-white"
                  />
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Barra lateral de Orden Actual */}
      <div
        className={clsx(
          "fixed inset-0 z-50 lg:relative lg:inset-auto lg:z-0 lg:flex",
          "w-full max-w-none lg:w-80 xl:w-96 glass-panel flex flex-col shrink-0 transition-transform duration-300 ease-in-out bg-dark-900 lg:bg-transparent",
          showMobileCart
            ? "translate-x-0"
            : "translate-x-full lg:translate-x-0",
        )}
      >
        <div className="p-4 border-b border-dark-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingBag size={18} className="text-brand-400" />
            <h2 className="font-bold text-white">Orden Actual</h2>
          </div>
          <div className="flex items-center gap-4">
            {cart.items.length > 0 && (
              <button
                onClick={cart.clearCart}
                className="text-xs text-dark-400 hover:text-red-400 transition-colors"
              >
                Limpiar
              </button>
            )}
            <button
              onClick={() => setShowMobileCart(false)}
              className="lg:hidden text-dark-400 hover:text-white"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          <div className="mb-3">
            <input
              type="text"
              value={cart.customerName || ""}
              onChange={(e) => handleSearchActiveOrder(e.target.value)}
              className="w-full bg-dark-700 text-white text-sm px-3 py-2 rounded-lg border border-dark-600 focus:border-brand-500 outline-none"
              placeholder="Escribe el nombre del cliente..."
            />
          </div>
          {cart.items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-dark-500">
              <ShoppingBag size={48} className="mb-3 opacity-30" />
              <p className="text-sm">Agrega productos</p>
            </div>
          ) : (
            cart.items.map((item: any) => (
              <div
                key={item.productId}
                className={clsx(
                  "rounded-xl p-3 animate-scale-in transition-colors",
                  item.alreadySaved
                    ? "bg-dark-800/40 opacity-75 border border-dark-700"
                    : "bg-dark-700/50",
                )}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="text-sm font-medium text-white pr-2">
                      {item.productName}
                      {item.alreadySaved && (
                        <span className="text-xs text-brand-400 ml-2">
                          (Enviado)
                        </span>
                      )}
                    </h4>
                    {/* Visualizador de variantes agregadas */}
                    {item.variants && item.variants.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {item.variants.map((v: any) => (
                          <span
                            key={v.variantId}
                            className="text-xs bg-dark-600 text-brand-400 px-1.5 py-0.5 rounded"
                          >
                            +{v.variantName}
                          </span>
                        ))}
                      </div>
                    )}
                    {/* Visualizador de notas */}
                    {item.notes && (
                      <p className="text-xs text-dark-400 mt-1 italic">
                        "{item.notes}"
                      </p>
                    )}
                  </div>
                  {!item.alreadySaved && (
                    <button
                      onClick={() => cart.removeItem(item.productId)}
                      className="text-dark-500 hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() =>
                        !item.alreadySaved &&
                        cart.updateQuantity(item.productId, item.quantity - 1)
                      }
                      className={clsx(
                        "w-7 h-7 rounded-lg flex items-center justify-center transition-colors",
                        item.alreadySaved
                          ? "bg-dark-700 text-dark-600 cursor-not-allowed"
                          : "bg-dark-600 hover:bg-dark-500",
                      )}
                      disabled={item.alreadySaved}
                    >
                      <Minus size={12} />
                    </button>
                    <span className="text-sm font-semibold text-white w-6 text-center">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() =>
                        !item.alreadySaved &&
                        cart.updateQuantity(item.productId, item.quantity + 1)
                      }
                      className={clsx(
                        "w-7 h-7 rounded-lg flex items-center justify-center transition-colors",
                        item.alreadySaved
                          ? "bg-dark-700 text-dark-600 cursor-not-allowed"
                          : "bg-dark-600 hover:bg-dark-500",
                      )}
                      disabled={item.alreadySaved}
                    >
                      <Plus size={12} />
                    </button>

                    {/* 🔥 BOTÓN DE CONFIGURACIÓN DEL MODAL */}
                    {!item.alreadySaved && (
                      <button
                        onClick={() => handleOpenCustomization(item)}
                        className="w-7 h-7 bg-dark-600 hover:bg-dark-500 text-dark-300 hover:text-white rounded-lg flex items-center justify-center transition-colors ml-1"
                        title="Personalizar producto"
                      >
                        <Settings2 size={13} />
                      </button>
                    )}
                  </div>
                  <span className="text-sm font-semibold text-brand-400">
                    {formatCurrency(item.price * item.quantity)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {cart.items.length > 0 && (
          <div className="p-4 border-t border-dark-700 space-y-3 bg-dark-900/90">
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

              <div className="flex justify-between text-lg font-bold pt-2 border-t border-dark-600">
                <span className="text-white">Total</span>
                <span className="text-brand-400">
                  {formatCurrency(cart.getTotal())}
                </span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleSendToKitchen}
                className="w-full btn-warning py-2.5 sm:py-3 text-sm sm:text-base flex-1"
              >
                🍳 Cocina
              </button>

              <button
                onClick={() => setShowPayment(true)}
                className="w-full btn-success py-2.5 sm:py-3 text-sm sm:text-base flex-1 flex items-center justify-center gap-2"
              >
                <Receipt size={16} />
                Cobrar
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal de Pago */}
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
              <p className="text-3xl sm:text-4xl font-bold text-brand-400 mt-1">
                {formatCurrency(finalTotal)}
              </p>
              {paymentMethod === "card" && (
                <p className="text-xs text-brand-300 mt-1">
                  Incluye comisión del 5% por pago con tarjeta.
                </p>
              )}
            </div>

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
                    "p-3 sm:p-4 rounded-xl border transition-all duration-200 text-center",
                    paymentMethod === method.id
                      ? "bg-brand-600/10 border-brand-500 text-brand-400"
                      : "bg-dark-800 border-dark-600 text-dark-300 hover:border-dark-500",
                  )}
                >
                  <method.icon size={20} className="mx-auto mb-2" />
                  <span className="text-xs font-medium">{method.label}</span>
                </button>
              ))}
            </div>

            {paymentMethod === "cash" && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-dark-300 mb-2">
                  Efectivo recibido
                </label>
                <input
                  type="number"
                  value={cashReceived}
                  onChange={(e) => setCashReceived(e.target.value)}
                  className="input-field text-xl sm:text-2xl text-center font-bold"
                  placeholder="S/ 0.00"
                  autoFocus
                />
                {cashReceived && changeAmount >= 0 && (
                  <div className="mt-3 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-center">
                    <p className="text-sm text-dark-300">Cambio:</p>
                    <p className="text-xl sm:text-2xl font-bold text-emerald-400">
                      {formatCurrency(changeAmount)}
                    </p>
                  </div>
                )}
              </div>
            )}

            <button
              onClick={handlePayment}
              disabled={
                paymentMethod === "cash" &&
                (!cashReceived || parseFloat(cashReceived) < finalTotal)
              }
              className="w-full btn-success py-3 text-base flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CheckCircle size={18} />
              Confirmar Pago
            </button>
          </div>
        </div>
      )}

      {/* 🔥 RENDERIZADO DEL MODAL DE PERSONALIZACIÓN */}
      {isCustomizationOpen && itemToCustomize && (
        <ModalCustomization
          isOpen={isCustomizationOpen}
          onClose={() => {
            setIsCustomizationOpen(false);
            setItemToCustomize(null);
          }}
          item={itemToCustomize}
          onSave={(itemId, newNotes, newVariants) => {
            cart.updateItemCustomization(itemId, newNotes, newVariants);
          }}
        />
      )}
    </div>
  );
}
