import { create } from "zustand";
import type { CartItem } from "../types";

export interface SelectedVariant {
  variantId: string;
  variantName: string;
  priceModifier: number;
}

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
  updateItemCustomization: (
    productId: string,
    newNotes: string,
    newVariants: SelectedVariant[],
  ) => void;
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

  updateItemCustomization: (productId, newNotes, newVariants) => {
    set((state) => ({
      items: state.items.map((item) => {
        if (item.productId !== productId) return item;

        // 1. Sumamos el valor de los nuevos modificadores (CamelCase)
        const modifiersSum = newVariants.reduce(
          (acc, v) => acc + (v.priceModifier || 0),
          0,
        );

        // 2. Quitamos el precio de los modificadores anteriores para recuperar el precio base puro
        const previousModifiersSum = item.variants.reduce(
          (acc, v) => acc + (v.priceModifier || 0),
          0,
        );
        const baseOriginalPrice = item.price - previousModifiersSum;

        // 3. El nuevo precio unitario será el base puro + los nuevos modificadores
        const newUnitPrice = baseOriginalPrice + modifiersSum;

        return {
          ...item,
          notes: newNotes,
          variants: newVariants, // Cumple estrictamente con CartItem
          price: newUnitPrice, // Cumple estrictamente con CartItem
        };
      }),
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
    const totalConIgv = get().items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );
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
