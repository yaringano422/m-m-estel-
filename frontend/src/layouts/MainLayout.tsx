import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  UtensilsCrossed,
  Warehouse,
  Users,
  LogOut,
  Receipt,
  ChefHat,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";
import clsx from "clsx";

const navItems = [
  {
    to: "/dashboard",
    icon: LayoutDashboard,
    label: "Dashboard",
    roles: ["admin", "manager"],
  },
  {
    to: "/pos",
    icon: ShoppingCart,
    label: "Punto de Venta",
    roles: ["admin", "manager", "cashier", "waiter"],
  },
  {
    to: "/orders",
    icon: Receipt,
    label: "Órdenes",
    roles: ["admin", "manager", "cashier"],
  },
  {
    to: "/tables",
    icon: UtensilsCrossed,
    label: "Mesas",
    roles: ["admin", "manager", "waiter"],
  },
  {
    to: "/products",
    icon: Package,
    label: "Productos",
    roles: ["admin", "manager"],
  },
  {
    to: "/inventory",
    icon: Warehouse,
    label: "Inventario",
    roles: ["admin", "manager"],
  },
  { to: "/users", icon: Users, label: "Usuarios", roles: ["admin", "manager"] },
  {
    to: "/kitchen",
    icon: ChefHat,
    label: "Cocina",
    roles: ["admin", "manager", "chef"],
  },
];

export default function MainLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const filteredNav = navItems.filter(
    (item) => user && item.roles.includes(user.role),
  );

  return (
    <div className="min-h-screen flex bg-dark-950">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={clsx(
          "fixed lg:static inset-y-0 left-0 z-50 w-72 bg-dark-900/95 backdrop-blur-xl border-r border-dark-800 flex flex-col transition-transform duration-300 lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {/* Logo */}
        <div className="h-16 flex items-center gap-3 px-6 border-b border-dark-800">
          <div className="w-9 h-9 bg-gradient-to-br from-brand-500 to-purple-600 rounded-xl flex items-center justify-center">
            <ChefHat size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white tracking-tight">
              RestaurantPOS
            </h1>
            <p className="text-[10px] text-dark-400 uppercase tracking-widest">
              Sistema de Ventas
            </p>
          </div>
          <button
            className="ml-auto lg:hidden text-dark-400"
            onClick={() => setSidebarOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {filteredNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                clsx("sidebar-link", isActive && "active")
              }
            >
              <item.icon size={20} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* User section */}
        <div className="p-4 border-t border-dark-800">
          <div className="flex items-center gap-3 mb-3 px-2">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-500 to-cyan-500 flex items-center justify-center text-white text-sm font-bold">
              {user?.firstName?.[0]}
              {user?.lastName?.[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-xs text-dark-400 capitalize">{user?.role}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-dark-400 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200"
          >
            <LogOut size={18} />
            <span className="text-sm">Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-16 bg-dark-900/50 backdrop-blur-xl border-b border-dark-800 flex items-center px-6 gap-4">
          <button
            className="lg:hidden text-dark-300 hover:text-white"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu size={24} />
          </button>
          <div className="flex-1" />
          <div className="text-sm text-dark-400">
            {new Date().toLocaleDateString("es-MX", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
