import { create } from "zustand";
import type { CartItem } from "../types";

interface CartState {
  items: CartItem[];
  tableId: string | null;
  orderId: string | null;
  customerName: string;
  customerCount: number;
  notes: string;
  discountAmount: number;
  addItem: (item: Omit<CartItem, "quantity">) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  updateNotes: (productId: string, notes: string) => void;
  setTable: (tableId: string | null) => void;
  setOrderId: (orderId: string | null) => void;
  setCustomer: (name: string, count?: number) => void;
  setOrderNotes: (notes: string) => void;
  setDiscount: (amount: number) => void;
  clearCart: () => void;
  getSubtotal: () => number;
  getTaxAmount: () => number;
  getTotal: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  tableId: null,
  orderId: null,
  customerName: "",
  customerCount: 1,
  notes: "",
  discountAmount: 0,

  addItem: (item) => {
    set((state) => {
      const existing = state.items.find((i) => i.productId === item.productId);
      if (existing) {
        return {
          items: state.items.map((i) =>
            i.productId === item.productId
              ? { ...i, quantity: i.quantity + 1 }
              : i,
          ),
        };
      }
      return { items: [...state.items, { ...item, quantity: 1 }] };
    });
  },

  removeItem: (productId) => {
    set((state) => ({
      items: state.items.filter((i) => i.productId !== productId),
    }));
  },

  updateQuantity: (productId, quantity) => {
    if (quantity <= 0) {
      get().removeItem(productId);
      return;
    }
    set((state) => ({
      items: state.items.map((i) =>
        i.productId === productId ? { ...i, quantity } : i,
      ),
    }));
  },

  updateNotes: (productId, notes) => {
    set((state) => ({
      items: state.items.map((i) =>
        i.productId === productId ? { ...i, notes } : i,
      ),
    }));
  },

  setTable: (tableId) => set({ tableId }),
  setOrderId: (orderId) => set({ orderId }),
  setCustomer: (name, count) =>
    set({ customerName: name, customerCount: count || 1 }),
  setOrderNotes: (notes) => set({ notes }),
  setDiscount: (amount) => set({ discountAmount: amount }),
  clearCart: () =>
    set({
      items: [],
      tableId: null,
      orderId: null,
      customerName: "",
      customerCount: 1,
      notes: "",
      discountAmount: 0,
    }),

  getSubtotal: () => {
    const totalConIgv = get().items.reduce((sum, item) => {
      const variantExtra = item.variants.reduce(
        (v, vr) => v + vr.priceModifier,
        0,
      );
      return sum + (item.price + variantExtra) * item.quantity;
    }, 0);

    // El subtotal real es el Total entre 1.18
    return totalConIgv / 1.18;
  },

  getTaxAmount: () => {
    const totalConIgv = get().items.reduce((sum, item) => {
      const variantExtra = item.variants.reduce(
        (v, vr) => v + vr.priceModifier,
        0,
      );
      return sum + (item.price + variantExtra) * item.quantity;
    }, 0);

    const subtotal = totalConIgv / 1.18;
    // El IGV es la diferencia exacta
    return totalConIgv - subtotal;
  },

  getTotal: () => {
    const totalConIgv = get().items.reduce((sum, item) => {
      const variantExtra = item.variants.reduce(
        (v, vr) => v + vr.priceModifier,
        0,
      );
      return sum + (item.price + variantExtra) * item.quantity;
    }, 0);

    return totalConIgv - get().discountAmount;
  },
}));
