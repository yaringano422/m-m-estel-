import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { ChefHat, Eye, EyeOff, ArrowRight } from "lucide-react";
import toast from "react-hot-toast";

export default function LoginPage() {
  const [email, setEmail] = useState("admin@restaurant.com");
  const [password, setPassword] = useState("admin123");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const login = useAuthStore((s) => s.login);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await login(email, password);
      toast.success("¡Bienvenido!");
      navigate("/dashboard");
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Credenciales inválidas");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-950 flex">
      {/* Left panel - branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-brand-600/20 via-dark-900 to-purple-600/20 items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(59,130,246,0.1),transparent_70%)]" />
        <div className="relative z-10 max-w-md text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-brand-500 to-purple-600 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-brand-600/30">
            <ChefHat size={40} className="text-white" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-4">RestaurantPOS</h1>
          <p className="text-dark-300 text-lg leading-relaxed">
            Sistema profesional de punto de venta para restaurantes. Gestiona
            ventas, mesas, inventario y más.
          </p>
          <div className="mt-12 grid grid-cols-3 gap-6 text-center">
            <div>
              <div className="text-2xl font-bold text-brand-400">100+</div>
              <div className="text-xs text-dark-400 mt-1">Restaurantes</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-400">50K+</div>
              <div className="text-xs text-dark-400 mt-1">
                Transacciones/día
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold text-emerald-400">99.9%</div>
              <div className="text-xs text-dark-400 mt-1">Uptime</div>
            </div>
          </div>
        </div>
      </div>

      {/* Right panel - login form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-10 justify-center">
            <div className="w-12 h-12 bg-gradient-to-br from-brand-500 to-purple-600 rounded-2xl flex items-center justify-center">
              <ChefHat size={24} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">RestaurantPOS</h1>
          </div>

          <h2 className="text-2xl font-bold text-white mb-2">Iniciar Sesión</h2>
          <p className="text-dark-400 mb-8">
            Ingresa tus credenciales para acceder al sistema
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                placeholder="correo@restaurante.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">
                Contraseña
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field pr-12"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-dark-400 hover:text-dark-200 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full btn-primary flex items-center justify-center gap-2 py-3 text-base disabled:opacity-50"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Ingresar
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 p-4 bg-dark-800/50 rounded-xl border border-dark-700/50">
            <p className="text-xs text-dark-400 mb-2 font-medium">
              Demo credentials:
            </p>
            <div className="space-y-1 text-xs text-dark-300">
              <p>Admin: admin@restaurant.com / admin123</p>
              <p>Cajero: cajero@restaurant.com / cashier123</p>
              <p>Mesero: mesero@restaurant.com / waiter123</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
