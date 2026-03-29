import bcrypt from "bcryptjs";
import jwt, { SignOptions } from "jsonwebtoken";
import { query } from "../../config/database";
import { env } from "../../config/env";
import { LoginInput, RegisterInput } from "./auth.validation";

const jwtOptions: SignOptions = { expiresIn: env.jwt.expiresIn as any };

export class AuthService {
  async login(data: LoginInput) {
    const result = await query(
      "SELECT id, email, password_hash, first_name, last_name, role, branch_id, is_active FROM users WHERE email = $1",
      [data.email],
    );

    if (result.rows.length === 0) {
      throw new Error("Invalid email or password");
    }

    const user = result.rows[0];

    if (!user.is_active) {
      throw new Error("Account is deactivated");
    }

    const validPassword = await bcrypt.compare(
      data.password,
      user.password_hash,
    );
    if (!validPassword) {
      throw new Error("Invalid email or password");
    }

    // Update last login
    await query("UPDATE users SET last_login = NOW() WHERE id = $1", [user.id]);

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        branchId: user.branch_id,
      },
      env.jwt.secret,
      jwtOptions,
    );

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        branchId: user.branch_id,
      },
    };
  }

  async register(data: RegisterInput, branchId: string) {
    // Check if user already exists
    const existing = await query("SELECT id FROM users WHERE email = $1", [
      data.email,
    ]);
    if (existing.rows.length > 0) {
      throw new Error("Email already registered");
    }

    const passwordHash = await bcrypt.hash(data.password, 10);

    const result = await query(
      `INSERT INTO users (branch_id, email, password_hash, first_name, last_name, role, pin)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, email, first_name, last_name, role, branch_id`,
      [
        branchId,
        data.email,
        passwordHash,
        data.firstName,
        data.lastName,
        data.role || "waiter",
        data.pin || null,
      ],
    );

    const user = result.rows[0];

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        branchId: user.branch_id,
      },
      env.jwt.secret,
      jwtOptions,
    );

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        branchId: user.branch_id,
      },
    };
  }

  async getProfile(userId: string) {
    const result = await query(
      `SELECT id, email, first_name, last_name, role, branch_id, avatar_url, is_active, last_login, created_at
       FROM users WHERE auth_id = $1`,
      [userId],
    );

    if (result.rows.length === 0) {
      throw new Error("User not found");
    }

    const user = result.rows[0];
    return {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role,
      branchId: user.branch_id,
      avatarUrl: user.avatar_url,
      isActive: user.is_active,
      lastLogin: user.last_login,
      createdAt: user.created_at,
    };
  }
}
