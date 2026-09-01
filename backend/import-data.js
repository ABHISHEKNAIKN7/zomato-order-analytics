// =====================================================
// DATA IMPORT SCRIPT
// =====================================================
// Purpose:
// Import the cleaned and merged CSV file into PostgreSQL.
//
// This script performs 3 main imports:
// 1. Restaurants
// 2. Customers
// 3. Orders
//
// It uses a database transaction so that if something
// goes wrong during the import, the changes can be
// rolled back.
// =====================================================

require("dotenv").config();

const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");
const { Pool } = require("pg");

// =====================================================
// DATABASE CONNECTION
// =====================================================
// Creates a connection pool to PostgreSQL.
//
// The database details are taken from the .env file.
// This keeps sensitive information such as the password
// outside the JavaScript source code.
// =====================================================

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: Number(process.env.DB_PORT)
});

// =====================================================
// CSV FILE LOCATION
// =====================================================
// Points to the cleaned merged CSV file.
//
// __dirname = current backend folder
// ".."      = move one folder up
// "data"    = data folder
//
// Final file:
// data/merged_orders_cleaned.csv
// =====================================================

const file = path.join(
  __dirname,
  "..",
  "data",
  "merged_orders_cleaned.csv"
);

// =====================================================
// STORE CSV ROWS
// =====================================================
// Every row from the CSV will be stored in this array
// before it is inserted into PostgreSQL.
// =====================================================

const rows = [];

// =====================================================
// READ CSV FILE
// =====================================================
// createReadStream() reads the CSV file.
//
// csv-parser converts each CSV row into a JavaScript
// object.
//
// Example:
// {
//   restaurant: "...",
//   customer_id: "...",
//   order_id: "..."
// }
//
// Each row is pushed into the rows array.
// =====================================================

fs.createReadStream(file)
  .pipe(csv())
  .on("data", (r) => rows.push(r))

  // ===================================================
  // CSV READING COMPLETED
  // ===================================================
  // Once the entire CSV has been read, connect to the
  // PostgreSQL database and start the import process.
  // ===================================================

  .on("end", async () => {

    const client = await pool.connect();

    try {

      // =================================================
      // START DATABASE TRANSACTION
      // =================================================
      // All database operations below happen inside one
      // transaction.
      //
      // If everything succeeds:
      // COMMIT
      //
      // If an error happens:
      // ROLLBACK
      //
      // This prevents partially imported data.
      // =================================================

      await client.query("BEGIN");

      // =================================================
      // IMPORT RESTAURANTS
      // =================================================
      // The CSV may contain the same restaurant many
      // times because every order has a restaurant.
      //
      // We use a Map to make sure each restaurant is
      // processed only once during this import.
      //
      // The PostgreSQL restaurant_id generated for each
      // restaurant is stored in the Map.
      // =================================================

      const restaurants = new Map();

      for (const r of rows) {

        // -----------------------------------------------
        // Find the restaurant name from the CSV.
        //
        // Different possible column names are supported.
        // -----------------------------------------------

        const name =
          r.restaurant ||
          r.restaurant_name ||
          r.restaurant_id;

        // -----------------------------------------------
        // Only insert the restaurant if it hasn't already
        // been processed.
        // -----------------------------------------------

        if (!restaurants.has(name)) {

          const q = await client.query(
            `INSERT INTO restaurants(
              restaurant_name,
              subzone,
              city
            )
             VALUES($1,$2,$3)

             ON CONFLICT(restaurant_name)
             DO UPDATE SET
               restaurant_name=EXCLUDED.restaurant_name

             RETURNING restaurant_id`,

            [
              name,
              r.subzone || null,
              r.city || null
            ]
          );

          // ---------------------------------------------
          // Store the generated PostgreSQL restaurant ID.
          //
          // Example:
          // "Restaurant A" -> 1
          // "Restaurant B" -> 2
          // ---------------------------------------------

          restaurants.set(
            name,
            q.rows[0].restaurant_id
          );
        }
      }

      // =================================================
      // IMPORT CUSTOMERS
      // =================================================
      // Customers are inserted into the customers table.
      //
      // customer_id is unique, so duplicate customers
      // are ignored.
      // =================================================

      for (const r of rows) {

        // -----------------------------------------------
        // Only insert a customer when customer_id exists.
        // -----------------------------------------------

        if (r.customer_id) {

          await client.query(
            `INSERT INTO customers(
              customer_id,
              customer_phone
            )
             VALUES($1,$2)

             ON CONFLICT(customer_id)
             DO NOTHING`,

            [
              r.customer_id,
              r.customer_phone || null
            ]
          );
        }
      }

      // =================================================
      // IMPORT ORDERS
      // =================================================
      // This is the main data import.
      //
      // Every CSV row represents an order.
      //
      // The order is connected to:
      // - Restaurant
      // - Customer
      //
      // Other information such as:
      // - Amount
      // - Status
      // - Rating
      // - Delivery
      // - Distance
      // - Charges
      // - Complaints
      // - Cancellation reason
      // etc.
      //
      // is also stored here.
      // =================================================

      for (const r of rows) {

        // -----------------------------------------------
        // Find the restaurant name.
        // -----------------------------------------------

        const name =
          r.restaurant ||
          r.restaurant_name ||
          r.restaurant_id;

        // -----------------------------------------------
        // Find the order ID.
        // -----------------------------------------------

        const orderId =
          r.order_id ||
          r.orderid;

        // -----------------------------------------------
        // Find the order date/time.
        //
        // parsed_order_placed_at is preferred when
        // available.
        // -----------------------------------------------

        const placed =
          r.parsed_order_placed_at ||
          r.order_placed_at ||
          null;

        // -----------------------------------------------
        // Insert the order into PostgreSQL.
        //
        // $1, $2, $3 ... are PostgreSQL parameter
        // placeholders.
        //
        // Using parameters prevents values from being
        // directly inserted into the SQL query.
        // -----------------------------------------------

        await client.query(
          `INSERT INTO orders(
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

           VALUES(
            $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
            $11,$12,$13,$14,$15,$16,$17,$18,
            $19,$20,$21,$22,$23,$24
           )

           ON CONFLICT(order_id)
           DO NOTHING`,

          [
            // -------------------------------------------
            // Order identification
            // -------------------------------------------

            orderId,

            // -------------------------------------------
            // Restaurant ID obtained from the Map above.
            // -------------------------------------------

            restaurants.get(name),

            // -------------------------------------------
            // Customer information
            // -------------------------------------------

            r.customer_id || null,

            // -------------------------------------------
            // Location information
            // -------------------------------------------

            r.subzone || null,
            r.city || null,

            // -------------------------------------------
            // Order date/time
            // -------------------------------------------

            placed,

            // -------------------------------------------
            // Order status and delivery information
            // -------------------------------------------

            r.order_status || null,
            r.delivery_type || null,

            // -------------------------------------------
            // Order distance and items
            // -------------------------------------------

            r.distance_km || null,
            r.items_in_order || null,
            r.instructions || null,

            // -------------------------------------------
            // Billing information
            // -------------------------------------------

            r.bill_subtotal || null,
            r.packaging_charges || null,
            r.total || null,

            // -------------------------------------------
            // Rating and review
            // -------------------------------------------

            r.rating || null,
            r.review || null,

            // -------------------------------------------
            // Cancellation and restaurant compensation
            // -------------------------------------------

            r.cancellation_reason || null,
            r.restaurant_compensation || null,
            r.restaurant_penalty || null,

            // -------------------------------------------
            // Operational performance data
            // -------------------------------------------

            r.kpt_duration || null,
            r.rider_wait_time || null,
            r.order_ready_marked || null,

            // -------------------------------------------
            // Customer complaint information
            // -------------------------------------------

            r.customer_complaint_tag || null,

            // -------------------------------------------
            // Customer phone
            // -------------------------------------------

            r.customer_phone || null
          ]
        );
      }

      // =================================================
      // COMMIT TRANSACTION
      // =================================================
      // If all restaurant, customer and order inserts
      // completed successfully, permanently save the
      // changes to PostgreSQL.
      // =================================================

      await client.query("COMMIT");

      // =================================================
      // IMPORT SUCCESS MESSAGE
      // =================================================

      console.log(`Imported ${rows.length} rows.`);

    } catch (e) {

      // =================================================
      // ROLLBACK
      // =================================================
      // If any error happens during the import, undo all
      // database changes made during this transaction.
      // =================================================

      await client.query("ROLLBACK");

      console.error(e);

    } finally {

      // =================================================
      // CLEANUP
      // =================================================
      // Release the database client and close the pool.
      // =================================================

      client.release();

      await pool.end();
    }
  });