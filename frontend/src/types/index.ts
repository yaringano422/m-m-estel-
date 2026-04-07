// ============================================
// Core Types for POS Restaurant System
// ============================================

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: "admin" | "manager" | "cashier" | "waiter";
  branchId: string;
  avatarUrl?: string;
  isActive: boolean;
  lastLogin?: string;
  createdAt: string;
}

export interface Branch {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  taxId?: string;
  currency: string;
  isActive: boolean;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  sortOrder: number;
  productCount: number;
  isActive: boolean;
}

export interface ProductVariant {
  id: string;
  name: string;
  type: "size" | "extra" | "option";
  priceModifier: number;
}

export interface Product {
  id: string;
  categoryId: string;
  categoryName: string;
  name: string;
  description?: string;
  sku?: string;
  price: number;
  cost: number;
  taxRate: number;
  imageUrl?: string;
  isAvailable: boolean;
  preparationTime: number;
  variants: ProductVariant[];
}

export type TableStatus = "available" | "occupied" | "reserved" | "maintenance";

export interface RestaurantTable {
  id: string;
  number: number;
  name: string;
  capacity: number;
  status: TableStatus;
  zone: string;
  position_x: number;
  position_y: number;
  currentOrder?: {
    id: string;
    orderNumber: number;
    total: number;
    status: string;
    waiterName?: string;
    role?: string;
  };
}

export type OrderStatus =
  | "open"
  | "in_progress"
  | "delivered"
  | "paid"
  | "cancelled";
export type PaymentMethod = "cash" | "card" | "mixed" | "other";

export interface OrderItemVariant {
  id: string;
  variantName: string;
  priceModifier: number;
}

export interface OrderItem {
  id: string;
  order_id: string; // Coincide con Supabase
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  tax_amount: number;
  subtotal: number;
  total: number;
  notes?: string;
  status: string;
}

export interface Order {
  id: string;
  branch_id: string;
  table_id?: string;
  user_id?: string;
  cashier_id?: string;
  order_number: number;
  status: OrderStatus;
  subtotal: number;
  table_name?: string;
  tax_amount: number;
  discount_amount: number;
  tip_amount: number;
  total: number;
  payment_method?: PaymentMethod;
  payment_reference?: string;
  cash_received?: number;
  change_amount?: number;
  notes?: string;
  customer_name?: string;
  customer_count: number;
  paid_at?: string;
  created_at: string;
  updated_at: string;
  items: OrderItem[];
}

export interface InventoryItem {
  id: string;
  productId: string;
  productName: string;
  sku?: string;
  price: number;
  categoryName?: string;
  currentStock: number;
  minStock: number;
  maxStock: number;
  unit: string;
  isLowStock: boolean;
  lastRestockAt?: string;
}

export interface InventoryMovement {
  id: string;
  type: "sale" | "restock" | "adjustment" | "waste" | "transfer";
  quantity: number;
  previousStock: number;
  newStock: number;
  notes?: string;
  userName?: string;
  createdAt: string;
}

// Cart types for POS
export interface CartItem {
  productId: string;
  productName: string;
  price: number;
  quantity: number;
  taxRate: number;
  notes?: string;
  variants: {
    variantId: string;
    variantName: string;
    priceModifier: number;
  }[];
}

// Dashboard types
export interface DashboardSummary {
  today: {
    totalOrders: number;
    totalRevenue: number;
    totalTax: number;
    totalTips: number;
    avgTicket: number;
  };
  ordersByStatus: Record<string, number>;
  topProducts: { name: string; quantity: number; revenue: number }[];
  hourlySales: { hour: number; orders: number; revenue: number }[];
  paymentBreakdown: { method: string; count: number; total: number }[];
  tablesStatus: Record<string, number>;
  lowStockCount: number;
  weeklyRevenue: { date: string; orders: number; revenue: number }[];
}

// Auth types
export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => void;
}
// Kitchen types
export interface KitchenOrder {
  id: string;
  status: OrderStatus;
  order_number?: number;
  customer_name?: string;
  created_at: string;
  restaurant_tables?: {
    name: string;
  } | null;
  order_items: {
    id: string;
    product_name: string;
    quantity: number;
    notes?: string;
  }[];
}
