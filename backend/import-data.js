// =====================================================
// DATA IMPORT SCRIPT
// =====================================================
// Purpose:
// Import the cleaned Zomato order CSV into PostgreSQL.
//
// This version is optimized for Neon PostgreSQL.
// Instead of sending thousands of individual queries,
// it sends records in batches to make the import faster
// and more reliable.
// =====================================================

require("dotenv").config();

const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");
const { Pool } = require("pg");

// =====================================================
// DATABASE CONNECTION
// =====================================================
// Neon PostgreSQL requires an SSL connection.
// The connection values come from backend/.env.
// =====================================================

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: Number(process.env.DB_PORT),
  ssl: {
    rejectUnauthorized: false,
  },
});

// =====================================================
// CSV FILE LOCATION
// =====================================================
// The CSV is stored in the project's data folder.
// =====================================================

const file = path.join(
  __dirname,
  "..",
  "data",
  "merged_orders_cleaned.csv"
);

// =====================================================
// READ CSV DATA
// =====================================================

const rows = [];

console.log("Reading CSV file...");

fs.createReadStream(file)
  .pipe(csv())
  .on("data", (row) => {
    rows.push(row);
  })
  .on("end", async () => {
    console.log(`CSV loaded successfully: ${rows.length} rows`);

    const client = await pool.connect();

    try {
      // =================================================
      // START DATABASE TRANSACTION
      // =================================================

      await client.query("BEGIN");

      // =================================================
      // STEP 1 — INSERT RESTAURANTS
      // =================================================
      // Create a unique list of restaurants first.
      // =================================================

      const restaurantMap = new Map();

      for (const row of rows) {
        const name =
          row.restaurant ||
          row.restaurant_name ||
          row.restaurant_id;

        if (!name) {
          continue;
        }

        if (!restaurantMap.has(name)) {
          restaurantMap.set(name, {
            name,
            subzone: row.subzone || null,
            city: row.city || null,
          });
        }
      }

      const restaurants = Array.from(restaurantMap.values());

      console.log(`Importing ${restaurants.length} restaurants...`);

      if (restaurants.length > 0) {
        const values = [];
        const placeholders = [];

        restaurants.forEach((restaurant, index) => {
          const base = index * 3;

          placeholders.push(
            `($${base + 1}, $${base + 2}, $${base + 3})`
          );

          values.push(
            restaurant.name,
            restaurant.subzone,
            restaurant.city
          );
        });

        const restaurantQuery = `
          INSERT INTO restaurants (
            restaurant_name,
            subzone,
            city
          )
          VALUES ${placeholders.join(",")}
          ON CONFLICT (restaurant_name)
          DO UPDATE SET
            restaurant_name = EXCLUDED.restaurant_name
          RETURNING restaurant_id, restaurant_name
        `;

        const result = await client.query(
          restaurantQuery,
          values
        );

        // Build restaurant name → database ID map.
        for (const restaurant of result.rows) {
          restaurantMap.get(restaurant.restaurant_name).restaurant_id =
            restaurant.restaurant_id;
        }
      }

      // =================================================
      // STEP 2 — INSERT CUSTOMERS
      // =================================================
      // Customers are inserted in one batch.
      // =================================================

      const customerMap = new Map();

      for (const row of rows) {
        if (!row.customer_id) {
          continue;
        }

        if (!customerMap.has(row.customer_id)) {
          customerMap.set(row.customer_id, {
            customer_id: row.customer_id,
            customer_phone: row.customer_phone || null,
          });
        }
      }

      const customers = Array.from(customerMap.values());

      console.log(`Importing ${customers.length} customers...`);

      const CUSTOMER_BATCH_SIZE = 1000;

      for (
        let start = 0;
        start < customers.length;
        start += CUSTOMER_BATCH_SIZE
      ) {
        const batch = customers.slice(
          start,
          start + CUSTOMER_BATCH_SIZE
        );

        const values = [];
        const placeholders = [];

        batch.forEach((customer, index) => {
          const base = index * 2;

          placeholders.push(
            `($${base + 1}, $${base + 2})`
          );

          values.push(
            customer.customer_id,
            customer.customer_phone
          );
        });

        await client.query(
          `
          INSERT INTO customers (
            customer_id,
            customer_phone
          )
          VALUES ${placeholders.join(",")}
          ON CONFLICT (customer_id)
          DO NOTHING
          `,
          values
        );

        console.log(
          `Customers imported: ${Math.min(
            start + CUSTOMER_BATCH_SIZE,
            customers.length
          )}/${customers.length}`
        );
      }

      // =================================================
      // STEP 3 — INSERT ORDERS
      // =================================================
      // Orders are inserted in batches.
      // This avoids thousands of individual queries.
      // =================================================

      console.log(`Importing ${rows.length} orders...`);

      const ORDER_BATCH_SIZE = 500;

      for (
        let start = 0;
        start < rows.length;
        start += ORDER_BATCH_SIZE
      ) {
        const batch = rows.slice(
          start,
          start + ORDER_BATCH_SIZE
        );

        const values = [];
        const placeholders = [];

        batch.forEach((row, index) => {
          const base = index * 24;

          const restaurantName =
            row.restaurant ||
            row.restaurant_name ||
            row.restaurant_id;

          const restaurant =
            restaurantMap.get(restaurantName);

          const orderId =
            row.order_id ||
            row.orderid;

          const placed =
            row.parsed_order_placed_at ||
            row.order_placed_at ||
            null;

          placeholders.push(`
            (
              $${base + 1},
              $${base + 2},
              $${base + 3},
              $${base + 4},
              $${base + 5},
              $${base + 6},
              $${base + 7},
              $${base + 8},
              $${base + 9},
              $${base + 10},
              $${base + 11},
              $${base + 12},
              $${base + 13},
              $${base + 14},
              $${base + 15},
              $${base + 16},
              $${base + 17},
              $${base + 18},
              $${base + 19},
              $${base + 20},
              $${base + 21},
              $${base + 22},
              $${base + 23},
              $${base + 24}
            )
          `);

          values.push(
            orderId,
            restaurant ? restaurant.restaurant_id : null,
            row.customer_id || null,
            row.subzone || null,
            row.city || null,
            placed,
            row.order_status || null,
            row.delivery_type || null,
            row.distance_km || null,
            row.items_in_order || null,
            row.instructions || null,
            row.bill_subtotal || null,
            row.packaging_charges || null,
            row.total || null,
            row.rating || null,
            row.review || null,
            row.cancellation_reason || null,
            row.restaurant_compensation || null,
            row.restaurant_penalty || null,
            row.kpt_duration || null,
            row.rider_wait_time || null,
            row.order_ready_marked || null,
            row.customer_complaint_tag || null,
            row.customer_phone || null
          );
        });

        await client.query(
          `
          INSERT INTO orders (
            order_id,
            restaurant_id,
            customer_id,
            subzone,
            city,
            order_placed_at,
            order_status,
            delivery_type,
            distance_km,
            items_in_order,
            instructions,
            bill_subtotal,
            packaging_charges,
            total,
            rating,
            review,
            cancellation_reason,
            restaurant_compensation,
            restaurant_penalty,
            kpt_duration,
            rider_wait_time,
            order_ready_marked,
            customer_complaint_tag,
            customer_phone
          )
          VALUES ${placeholders.join(",")}
          ON CONFLICT (order_id)
          DO NOTHING
          `,
          values
        );

        console.log(
          `Orders imported: ${Math.min(
            start + ORDER_BATCH_SIZE,
            rows.length
          )}/${rows.length}`
        );
      }

      // =================================================
      // COMMIT TRANSACTION
      // =================================================

      await client.query("COMMIT");

      console.log("");
      console.log("==============================================");
      console.log("IMPORT COMPLETED SUCCESSFULLY");
      console.log("==============================================");
      console.log(`Rows read from CSV: ${rows.length}`);
      console.log(`Restaurants: ${restaurants.length}`);
      console.log(`Customers: ${customers.length}`);
      console.log(`Orders: ${rows.length}`);
      console.log("==============================================");
    } catch (error) {
      // =================================================
      // ROLLBACK IF ANYTHING FAILS
      // =================================================

      await client.query("ROLLBACK");

      console.error("");
      console.error("==============================================");
      console.error("IMPORT FAILED");
      console.error("==============================================");
      console.error(error);
      console.error("==============================================");
    } finally {
      // =================================================
      // CLOSE DATABASE CONNECTION
      // =================================================

      client.release();
      await pool.end();
    }
  })
  .on("error", (error) => {
    console.error("Error reading CSV file:", error);
  });