import { Request, Response, NextFunction } from "express";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    branchId: string;
  };
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({ error: "No token provided" });
      return;
    }

    const token = authHeader.split(" ")[1];
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
      res.status(401).json({ error: "Invalid token" });
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("branch_id")
      .eq("id", data.user.id)
      .single();

    if (profileError || !profile) {
      console.error("Error al obtener perfil:", profileError);
      res.status(401).json({ error: "User profile not found" });
      return;
    }

    req.user = {
      id: data.user.id,
      email: data.user.email || "",
      branchId: profile.branch_id,
    };

    next();
  } catch (err) {
    console.error("Auth catch error:", err);
    res.status(401).json({ error: "Auth error" });
  }
};
