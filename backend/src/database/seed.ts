import bcrypt from "bcryptjs";
import { pool, query } from "../config/database";

async function seed() {
  console.log("🌱 Seeding database...");

  try {
    const passwordHash = await bcrypt.hash("admin123", 10);

    await query(
      `UPDATE users SET password_hash = $1 WHERE email = 'admin@restaurant.com'`,
      [passwordHash],
    );

    const cashierHash = await bcrypt.hash("cashier123", 10);
    const waiterHash = await bcrypt.hash("waiter123", 10);

    await query(
      `INSERT INTO users (branch_id, email, password_hash, first_name, last_name, role, pin)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (email) DO NOTHING`,
      [
        "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
        "cajero@restaurant.com",
        cashierHash,
        "Maria",
        "García",
        "cashier",
        "1234",
      ],
    );

    await query(
      `INSERT INTO users (branch_id, email, password_hash, first_name, last_name, role, pin)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (email) DO NOTHING`,
      [
        "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
        "mesero@restaurant.com",
        waiterHash,
        "Carlos",
        "López",
        "waiter",
        "5678",
      ],
    );

    // Get category IDs
    const categories = await query(
      `SELECT id, name FROM categories WHERE branch_id = $1`,
      ["a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11"],
    );
    const catMap: Record<string, string> = {};
    categories.rows.forEach((c) => {
      catMap[c.name] = c.id;
    });

    // Sample products
    const products = [
      {
        cat: "Entradas",
        name: "Guacamole con Totopos",
        price: 120,
        cost: 35,
        desc: "Guacamole fresco con totopos artesanales",
      },
      {
        cat: "Entradas",
        name: "Quesadillas",
        price: 95,
        cost: 25,
        desc: "Quesadillas de queso Oaxaca con flor de calabaza",
      },
      {
        cat: "Entradas",
        name: "Sopa de Tortilla",
        price: 85,
        cost: 20,
        desc: "Sopa de tortilla con aguacate, crema y queso",
      },
      {
        cat: "Platos Fuertes",
        name: "Tacos al Pastor",
        price: 160,
        cost: 45,
        desc: "Orden de 4 tacos al pastor con piña",
      },
      {
        cat: "Platos Fuertes",
        name: "Enchiladas Suizas",
        price: 145,
        cost: 40,
        desc: "Enchiladas verdes con crema y queso gratinado",
      },
      {
        cat: "Platos Fuertes",
        name: "Arrachera",
        price: 280,
        cost: 100,
        desc: "Arrachera a la parrilla con guarnición",
      },
      {
        cat: "Platos Fuertes",
        name: "Salmón a la Plancha",
        price: 320,
        cost: 140,
        desc: "Salmón fresco con vegetales asados",
      },
      {
        cat: "Platos Fuertes",
        name: "Mole Poblano",
        price: 195,
        cost: 55,
        desc: "Pollo bañado en mole poblano tradicional",
      },
      {
        cat: "Bebidas",
        name: "Agua Fresca",
        price: 45,
        cost: 8,
        desc: "Horchata, Jamaica, Limón o Tamarindo",
      },
      {
        cat: "Bebidas",
        name: "Refresco",
        price: 35,
        cost: 10,
        desc: "Coca-Cola, Sprite, Fanta",
      },
      {
        cat: "Bebidas",
        name: "Cerveza Artesanal",
        price: 85,
        cost: 30,
        desc: "Cerveza artesanal de barril",
      },
      {
        cat: "Bebidas",
        name: "Margarita",
        price: 120,
        cost: 35,
        desc: "Margarita clásica de limón",
      },
      {
        cat: "Bebidas",
        name: "Café Americano",
        price: 45,
        cost: 8,
        desc: "Café de altura recién molido",
      },
      {
        cat: "Postres",
        name: "Flan Napolitano",
        price: 75,
        cost: 18,
        desc: "Flan casero con caramelo",
      },
      {
        cat: "Postres",
        name: "Churros con Chocolate",
        price: 85,
        cost: 20,
        desc: "Churros calientes con salsa de chocolate",
      },
      {
        cat: "Postres",
        name: "Pastel de Tres Leches",
        price: 90,
        cost: 22,
        desc: "Pastel de tres leches con frutas",
      },
      {
        cat: "Ensaladas",
        name: "Ensalada César",
        price: 110,
        cost: 30,
        desc: "Lechuga romana, crutones, parmesano y aderezo césar",
      },
      {
        cat: "Ensaladas",
        name: "Ensalada Mediterránea",
        price: 125,
        cost: 35,
        desc: "Mix de lechugas, aceitunas, tomate y queso feta",
      },
      {
        cat: "Sopas",
        name: "Crema de Elote",
        price: 80,
        cost: 18,
        desc: "Crema de elote con epazote",
      },
      {
        cat: "Sopas",
        name: "Pozole Rojo",
        price: 130,
        cost: 38,
        desc: "Pozole rojo de puerco con guarniciones",
      },
    ];

    for (const p of products) {
      const result = await query(
        `INSERT INTO products (branch_id, category_id, name, description, price, cost, tax_rate)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT DO NOTHING
         RETURNING id`,
        [
          "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
          catMap[p.cat],
          p.name,
          p.desc,
          p.price,
          p.cost,
          16,
        ],
      );

      if (result.rows.length > 0) {
        await query(
          `INSERT INTO inventory (branch_id, product_id, current_stock, min_stock, max_stock)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT DO NOTHING`,
          [
            "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
            result.rows[0].id,
            Math.floor(Math.random() * 50) + 10,
            5,
            100,
          ],
        );
      }
    }

    const tacos = await query(
      `SELECT id FROM products WHERE name = 'Tacos al Pastor' LIMIT 1`,
    );
    if (tacos.rows.length > 0) {
      await query(
        `INSERT INTO product_variants (product_id, name, type, price_modifier) VALUES
         ($1, 'Extra Piña', 'extra', 15),
         ($1, 'Sin Cebolla', 'option', 0),
         ($1, 'Orden de 6', 'size', 80)
         ON CONFLICT DO NOTHING`,
        [tacos.rows[0].id],
      );
    }

    const agua = await query(
      `SELECT id FROM products WHERE name = 'Agua Fresca' LIMIT 1`,
    );
    if (agua.rows.length > 0) {
      await query(
        `INSERT INTO product_variants (product_id, name, type, price_modifier) VALUES
         ($1, 'Grande', 'size', 15),
         ($1, 'Litro', 'size', 30)
         ON CONFLICT DO NOTHING`,
        [agua.rows[0].id],
      );
    }

    console.log("✅ Database seeded successfully!");
    console.log("");
    console.log("📋 Default credentials:");
    console.log("   Admin:   admin@restaurant.com / admin123");
    console.log("   Cajero:  cajero@restaurant.com / cashier123");
    console.log("   Mesero:  mesero@restaurant.com / waiter123");
  } catch (error) {
    console.error("❌ Seeding failed:", error);
  } finally {
    await pool.end();
  }
}

seed();
