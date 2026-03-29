import { create } from "zustand";
import type { User } from "../types";
import { supabase } from "../supabaseClient";

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,

  login: async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      const session = data.session;
      const user = data.user;

      if (!session || !user) throw new Error("No session");

      // 🔥 traer profile
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profileError || !profile) {
        throw new Error("Profile no encontrado");
      }

      set({
        user: {
          id: user.id,
          email: user.email || "",
          firstName: profile.first_name,
          lastName: profile.last_name,
          role: profile.role,
        },
        token: session.access_token,
        isAuthenticated: true,
        isLoading: false,
      });

      localStorage.setItem("pos_token", session.access_token);
    } catch (err) {
      console.error("LOGIN ERROR:", err);
      throw err;
    }
  },

  logout: async () => {
    await supabase.auth.signOut(); // 🔥 IMPORTANTE
    localStorage.removeItem("pos_token");

    set({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
    });
  },

  checkAuth: async () => {
    try {
      const { data } = await supabase.auth.getSession();
      const session = data.session;

      if (!session) {
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
        });
        return;
      }

      const user = session.user;

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error || !profile) {
        set({ isAuthenticated: false, isLoading: false });
        return;
      }

      set({
        user: {
          id: user.id,
          email: user.email || "",
          firstName: profile.first_name,
          lastName: profile.last_name,
          role: profile.role,
        },
        token: session.access_token,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (err) {
      console.error("CHECK AUTH ERROR:", err);
      set({ isAuthenticated: false, isLoading: false });
    }
  },
}));
