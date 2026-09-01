// =====================================================
// SERVER ENTRY POINT
// =====================================================

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

const app = express();

app.use(
  cors({
    exposedHeaders: ["X-Total-Count"],
  })
);

app.use(express.json());


// =====================================================
// DATABASE CONNECTION
// =====================================================

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: Number(process.env.DB_PORT),
});


// =====================================================
// HEALTH CHECK
// =====================================================

app.get("/api/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");

    res.json({
      status: "ok",
      database: "connected",
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
});


// =====================================================
// DASHBOARD KPIs
// =====================================================

app.get("/api/dashboard/kpis", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        COUNT(*) AS total_orders,

        COUNT(*) FILTER (
          WHERE order_status = 'Delivered'
        ) AS delivered_orders,

        COUNT(*) FILTER (
          WHERE order_status = 'Rejected'
        ) AS rejected_orders,

        COALESCE(
          SUM(total) FILTER (
            WHERE order_status = 'Delivered'
          ),
          0
        ) AS revenue,

        ROUND(
          COALESCE(
            SUM(total) FILTER (
              WHERE order_status = 'Delivered'
            )
            /
            NULLIF(
              COUNT(*) FILTER (
                WHERE order_status = 'Delivered'
              ),
              0
            ),
            0
          ),
          2
        ) AS average_order_value,

        ROUND(
          COUNT(*) FILTER (
            WHERE order_status = 'Rejected'
          ) * 100.0
          /
          NULLIF(COUNT(*), 0),
          2
        ) AS rejection_rate,

        ROUND(
          AVG(rating) FILTER (
            WHERE rating IS NOT NULL
          ),
          2
        ) AS average_rating

      FROM orders;
    `);

    res.json(result.rows[0]);

  } catch (error) {
    console.error("KPI error:", error);

    res.status(500).json({
      error: error.message,
    });
  }
});


// =====================================================
// DASHBOARD DAILY TREND
// =====================================================

app.get("/api/dashboard/daily-trend", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        DATE(order_placed_at) AS order_date,

        COUNT(*) AS orders,

        COALESCE(
          SUM(total) FILTER (
            WHERE order_status = 'Delivered'
          ),
          0
        ) AS revenue

      FROM orders

      WHERE order_placed_at IS NOT NULL

      GROUP BY DATE(order_placed_at)

      ORDER BY order_date;
    `);

    res.json(result.rows);

  } catch (error) {
    console.error("Daily trend error:", error);

    res.status(500).json({
      error: error.message,
    });
  }
});


// =====================================================
// RESTAURANT DETAILS
// =====================================================

app.get("/api/restaurants/:id", async (req, res) => {
  try {
    const restaurantId = Number(req.params.id);

    if (!restaurantId) {
      return res.status(400).json({
        error: "Invalid restaurant ID",
      });
    }

    const result = await pool.query(
      `
      SELECT

        r.restaurant_id,
        r.restaurant_name,
        r.subzone,
        r.city,

        COUNT(o.order_id) AS total_orders,

        COUNT(o.order_id) FILTER (
          WHERE o.order_status = 'Delivered'
        ) AS delivered_orders,

        COUNT(o.order_id) FILTER (
          WHERE o.order_status = 'Rejected'
        ) AS rejected_orders,

        COUNT(o.order_id) FILTER (
          WHERE o.order_status = 'Returned'
        ) AS returned_orders,

        COUNT(o.order_id) FILTER (
          WHERE o.order_status = 'Timed out'
        ) AS timed_out_orders,

        COALESCE(
          SUM(o.total) FILTER (
            WHERE o.order_status = 'Delivered'
          ),
          0
        ) AS revenue,

        ROUND(
          COALESCE(
            SUM(o.total) FILTER (
              WHERE o.order_status = 'Delivered'
            )
            /
            NULLIF(
              COUNT(o.order_id) FILTER (
                WHERE o.order_status = 'Delivered'
              ),
              0
            ),
            0
          ),
          2
        ) AS average_order_value,

        ROUND(
          AVG(o.rating) FILTER (
            WHERE o.rating IS NOT NULL
          ),
          2
        ) AS average_rating,

        ROUND(
          AVG(o.distance_km) FILTER (
            WHERE o.distance_km IS NOT NULL
          ),
          2
        ) AS average_distance_km,

        ROUND(
          COUNT(o.order_id) FILTER (
            WHERE o.order_status = 'Delivered'
          ) * 100.0
          /
          NULLIF(COUNT(o.order_id), 0),
          2
        ) AS delivery_success_rate,

        ROUND(
          COUNT(o.order_id) FILTER (
            WHERE o.order_status = 'Rejected'
          ) * 100.0
          /
          NULLIF(COUNT(o.order_id), 0),
          2
        ) AS rejection_rate,

        COUNT(o.order_id) FILTER (
          WHERE o.customer_complaint_tag IS NOT NULL
          AND TRIM(o.customer_complaint_tag) <> ''
        ) AS complaint_count,

        ROUND(
          AVG(o.kpt_duration) FILTER (
            WHERE o.kpt_duration IS NOT NULL
          ),
          2
        ) AS average_kpt,

        ROUND(
          AVG(o.rider_wait_time) FILTER (
            WHERE o.rider_wait_time IS NOT NULL
          ),
          2
        ) AS average_rider_wait

      FROM restaurants r

      LEFT JOIN orders o
        ON o.restaurant_id = r.restaurant_id

      WHERE r.restaurant_id = $1

      GROUP BY
        r.restaurant_id,
        r.restaurant_name,
        r.subzone,
        r.city;
      `,
      [restaurantId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "Restaurant not found",
      });
    }

    res.json(result.rows[0]);

  } catch (error) {
    console.error("Restaurant details error:", error);

    res.status(500).json({
      error: error.message,
    });
  }
});


// =====================================================
// ⭐ NEW
// RESTAURANT ANALYTICS
//
// Used for charts on the restaurant details page.
//
// Returns:
// 1. Daily orders and revenue
// 2. Order status breakdown
// 3. Rating distribution
// 4. Complaint analysis
// 5. Delivery type breakdown
// 6. Distance range analysis
// =====================================================

app.get("/api/restaurants/:id/analytics", async (req, res) => {
  try {

    const restaurantId = Number(req.params.id);

    if (!restaurantId) {
      return res.status(400).json({
        error: "Invalid restaurant ID",
      });
    }


    // =================================================
    // CHECK RESTAURANT
    // =================================================

    const restaurantResult = await pool.query(
      `
      SELECT
        restaurant_id,
        restaurant_name,
        subzone,
        city
      FROM restaurants
      WHERE restaurant_id = $1;
      `,
      [restaurantId]
    );


    if (restaurantResult.rows.length === 0) {
      return res.status(404).json({
        error: "Restaurant not found",
      });
    }


    // =================================================
    // 1. DAILY ORDERS + REVENUE
    // =================================================

    const dailyResult = await pool.query(
      `
      SELECT

        DATE(order_placed_at) AS order_date,

        COUNT(*) AS orders,

        COUNT(*) FILTER (
          WHERE order_status = 'Delivered'
        ) AS delivered_orders,

        COUNT(*) FILTER (
          WHERE order_status = 'Rejected'
        ) AS rejected_orders,

        COALESCE(
          SUM(total) FILTER (
            WHERE order_status = 'Delivered'
          ),
          0
        ) AS revenue

      FROM orders

      WHERE restaurant_id = $1

      AND order_placed_at IS NOT NULL

      GROUP BY DATE(order_placed_at)

      ORDER BY order_date;
      `,
      [restaurantId]
    );


    // =================================================
    // 2. ORDER STATUS BREAKDOWN
    // =================================================

    const statusResult = await pool.query(
      `
      SELECT

        order_status AS status,

        COUNT(*) AS orders

      FROM orders

      WHERE restaurant_id = $1

      GROUP BY order_status

      ORDER BY orders DESC;
      `,
      [restaurantId]
    );


    // =================================================
    // 3. RATING DISTRIBUTION
    // =================================================

    const ratingResult = await pool.query(
      `
      SELECT

        rating,

        COUNT(*) AS count

      FROM orders

      WHERE restaurant_id = $1

      AND rating IS NOT NULL

      GROUP BY rating

      ORDER BY rating;
      `,
      [restaurantId]
    );


    // =================================================
    // 4. CUSTOMER COMPLAINTS
    // =================================================

    const complaintResult = await pool.query(
      `
      SELECT

        customer_complaint_tag AS complaint,

        COUNT(*) AS count

      FROM orders

      WHERE restaurant_id = $1

      AND customer_complaint_tag IS NOT NULL

      AND TRIM(customer_complaint_tag) <> ''

      GROUP BY customer_complaint_tag

      ORDER BY count DESC;
      `,
      [restaurantId]
    );


    // =================================================
    // 5. DELIVERY TYPE
    // =================================================

    const deliveryResult = await pool.query(
      `
      SELECT

        COALESCE(
          NULLIF(TRIM(delivery_type), ''),
          'Not Available'
        ) AS delivery_type,

        COUNT(*) AS orders

      FROM orders

      WHERE restaurant_id = $1

      GROUP BY
        COALESCE(
          NULLIF(TRIM(delivery_type), ''),
          'Not Available'
        )

      ORDER BY orders DESC;
      `,
      [restaurantId]
    );


    // =================================================
    // 6. DISTANCE RANGE
    // =================================================

    const distanceResult = await pool.query(
      `
      SELECT

        CASE

          WHEN distance_km IS NULL
            THEN 'Not Available'

          WHEN distance_km < 2
            THEN '0 - 2 km'

          WHEN distance_km < 5
            THEN '2 - 5 km'

          WHEN distance_km < 8
            THEN '5 - 8 km'

          ELSE '8+ km'

        END AS distance_range,

        COUNT(*) AS orders

      FROM orders

      WHERE restaurant_id = $1

      GROUP BY

        CASE

          WHEN distance_km IS NULL
            THEN 'Not Available'

          WHEN distance_km < 2
            THEN '0 - 2 km'

          WHEN distance_km < 5
            THEN '2 - 5 km'

          WHEN distance_km < 8
            THEN '5 - 8 km'

          ELSE '8+ km'

        END

      ORDER BY orders DESC;
      `,
      [restaurantId]
    );


    // =================================================
    // SEND ANALYTICS
    // =================================================

    res.json({

      restaurant: restaurantResult.rows[0],

      daily: dailyResult.rows,

      status_breakdown: statusResult.rows,

      ratings: ratingResult.rows,

      complaints: complaintResult.rows,

      delivery_types: deliveryResult.rows,

      distance_ranges: distanceResult.rows,

    });


  } catch (error) {

    console.error(
      "Restaurant analytics error:",
      error
    );

    res.status(500).json({
      error: error.message,
    });
  }
});


// =====================================================
// RESTAURANT ORDERS
// =====================================================

app.get("/api/restaurants/:id/orders", async (req, res) => {
  try {

    const restaurantId =
      Number(req.params.id);

    if (!restaurantId) {
      return res.status(400).json({
        error: "Invalid restaurant ID",
      });
    }


    const pageNumber =
      Math.max(
        Number(req.query.page) || 1,
        1
      );


    const pageSize =
      Math.min(
        Math.max(
          Number(req.query.limit) || 10,
          1
        ),
        100
      );


    const offset =
      (pageNumber - 1) * pageSize;


    // =================================================
    // TOTAL COUNT
    // =================================================

    const countResult =
      await pool.query(
        `
        SELECT COUNT(*) AS total

        FROM orders

        WHERE restaurant_id = $1;
        `,
        [restaurantId]
      );


    const total =
      Number(
        countResult.rows[0].total
      ) || 0;


    // =================================================
    // ORDERS
    // =================================================

    const result =
      await pool.query(
        `
        SELECT

          o.order_id,
          o.customer_id,
          o.order_placed_at,
          o.order_status,
          o.delivery_type,
          o.distance_km,
          o.items_in_order,
          o.instructions,
          o.bill_subtotal,
          o.packaging_charges,
          o.total,
          o.rating,
          o.review,
          o.cancellation_reason,
          o.restaurant_compensation,
          o.restaurant_penalty,
          o.kpt_duration,
          o.rider_wait_time,
          o.order_ready_marked,
          o.customer_complaint_tag

        FROM orders o

        WHERE o.restaurant_id = $1

        ORDER BY
          o.order_placed_at DESC

        LIMIT $2

        OFFSET $3;
        `,
        [
          restaurantId,
          pageSize,
          offset,
        ]
      );


    res.setHeader(
      "X-Total-Count",
      total
    );

    res.json(result.rows);

  } catch (error) {

    console.error(
      "Restaurant orders error:",
      error
    );

    res.status(500).json({
      error: error.message,
    });
  }
});


// =====================================================
// RESTAURANT PERFORMANCE
// =====================================================

app.get("/api/dashboard/restaurants", async (req, res) => {
  try {

    const result =
      await pool.query(`
        SELECT

          r.restaurant_id,
          r.restaurant_name,

          COUNT(o.order_id) AS total_orders,

          COUNT(o.order_id) FILTER (
            WHERE o.order_status = 'Delivered'
          ) AS delivered_orders,

          COALESCE(
            SUM(o.total) FILTER (
              WHERE o.order_status = 'Delivered'
            ),
            0
          ) AS revenue,

          ROUND(
            AVG(o.rating) FILTER (
              WHERE o.rating IS NOT NULL
            ),
            2
          ) AS average_rating

        FROM restaurants r

        LEFT JOIN orders o
          ON o.restaurant_id = r.restaurant_id

        GROUP BY
          r.restaurant_id,
          r.restaurant_name

        ORDER BY revenue DESC;
      `);


    res.json(result.rows);

  } catch (error) {

    console.error(
      "Restaurant performance error:",
      error
    );

    res.status(500).json({
      error: error.message,
    });
  }
});


// =====================================================
// ORDERS API
// =====================================================

app.get("/api/orders", async (req, res) => {

  try {

    const {
      status,
      restaurant,
      search,
      from,
      to,
      page = 1,
      limit = 10,
    } = req.query;


    // =================================================
    // PAGINATION
    // =================================================

    const pageNumber =
      Math.max(
        Number(page) || 1,
        1
      );


    const pageSize =
      Math.min(
        Math.max(
          Number(limit) || 10,
          1
        ),
        100
      );


    const offset =
      (pageNumber - 1) * pageSize;


    // =================================================
    // CONDITIONS
    // =================================================

    const values = [];
    const conditions = [];


    function addCondition(
      sql,
      value
    ) {

      values.push(value);

      conditions.push(
        sql.replace(
          "?",
          `$${values.length}`
        )
      );

    }


    // =================================================
    // STATUS
    // =================================================

    if (status) {

      addCondition(
        "o.order_status = ?",
        status
      );

    }


    // =================================================
    // RESTAURANT
    // =================================================

    if (restaurant) {

      addCondition(
        "r.restaurant_name = ?",
        restaurant
      );

    }


    // =================================================
    // SEARCH
    // =================================================

    if (search) {

      values.push(
        `%${search}%`
      );


      const searchParameter =
        `$${values.length}`;


      conditions.push(`
        (
          CAST(o.order_id AS TEXT)
          ILIKE ${searchParameter}

          OR

          r.restaurant_name
          ILIKE ${searchParameter}

          OR

          CAST(o.customer_id AS TEXT)
          ILIKE ${searchParameter}
        )
      `);

    }


    // =================================================
    // DATE FROM
    // =================================================

    if (from) {

      addCondition(
        "DATE(o.order_placed_at) >= ?",
        from
      );

    }


    // =================================================
    // DATE TO
    // =================================================

    if (to) {

      addCondition(
        "DATE(o.order_placed_at) <= ?",
        to
      );

    }


    const whereClause =
      conditions.length > 0
        ? `WHERE ${conditions.join(" AND ")}`
        : "";


    // =================================================
    // COUNT
    // =================================================

    const countResult =
      await pool.query(
        `
        SELECT COUNT(*) AS total

        FROM orders o

        JOIN restaurants r
          ON r.restaurant_id =
             o.restaurant_id

        ${whereClause};
        `,
        values
      );


    const total =
      Number(
        countResult.rows[0].total
      ) || 0;


    // =================================================
    // PAGINATION VALUES
    // =================================================

    values.push(pageSize);

    const limitParameter =
      `$${values.length}`;


    values.push(offset);

    const offsetParameter =
      `$${values.length}`;


    // =================================================
    // FETCH ORDERS
    // =================================================

    const result =
      await pool.query(
        `
        SELECT

          o.order_id,
          r.restaurant_name,
          o.customer_id,
          o.order_placed_at,
          o.order_status,
          o.total,
          o.rating,
          o.kpt_duration,
          o.rider_wait_time,
          o.customer_complaint_tag

        FROM orders o

        JOIN restaurants r
          ON r.restaurant_id =
             o.restaurant_id

        ${whereClause}

        ORDER BY
          o.order_placed_at DESC

        LIMIT ${limitParameter}

        OFFSET ${offsetParameter};
        `,
        values
      );


    res.setHeader(
      "X-Total-Count",
      total
    );


    res.json(
      result.rows
    );


  } catch (error) {

    console.error(
      "Orders API error:",
      error
    );

    res.status(500).json({
      error: error.message,
    });

  }

});


// =====================================================
// ORDER DETAILS
// =====================================================

app.get("/api/orders/:id", async (req, res) => {

  try {

    const result =
      await pool.query(
        `
        SELECT

          o.order_id,

          o.restaurant_id,

          r.restaurant_name,
          r.subzone AS restaurant_subzone,
          r.city AS restaurant_city,

          o.customer_id,

          c.customer_phone
            AS registered_customer_phone,

          o.customer_phone,

          o.subzone,
          o.city,

          o.order_placed_at,
          o.order_status,
          o.delivery_type,
          o.distance_km,

          o.items_in_order,
          o.instructions,

          o.bill_subtotal,
          o.packaging_charges,
          o.total,

          o.rating,
          o.review,

          o.cancellation_reason,

          o.restaurant_compensation,
          o.restaurant_penalty,

          o.kpt_duration,
          o.rider_wait_time,
          o.order_ready_marked,

          o.customer_complaint_tag

        FROM orders o

        LEFT JOIN restaurants r
          ON r.restaurant_id =
             o.restaurant_id

        LEFT JOIN customers c
          ON c.customer_id =
             o.customer_id

        WHERE o.order_id = $1

        LIMIT 1;
        `,
        [req.params.id]
      );


    if (
      result.rows.length === 0
    ) {

      return res.status(404).json({
        error: "Order not found",
      });

    }


    res.json(
      result.rows[0]
    );


  } catch (error) {

    console.error(
      "Order details error:",
      error
    );

    res.status(500).json({
      error: error.message,
    });

  }

});


// =====================================================
// E-BILL
// =====================================================

app.get("/api/orders/:id/bill", async (req, res) => {

  try {

    const result =
      await pool.query(
        `
        SELECT

          o.order_id,
          o.order_placed_at,
          o.order_status,

          r.restaurant_name,
          r.subzone AS restaurant_subzone,
          r.city AS restaurant_city,

          o.customer_id,

          COALESCE(
            o.customer_phone,
            c.customer_phone
          ) AS customer_phone,

          o.items_in_order,

          o.bill_subtotal,
          o.packaging_charges,
          o.total,

          o.rating,
          o.review,

          o.delivery_type,
          o.distance_km

        FROM orders o

        LEFT JOIN restaurants r
          ON r.restaurant_id =
             o.restaurant_id

        LEFT JOIN customers c
          ON c.customer_id =
             o.customer_id

        WHERE o.order_id = $1

        LIMIT 1;
        `,
        [req.params.id]
      );


    if (
      result.rows.length === 0
    ) {

      return res.status(404).json({
        error: "Order not found",
      });

    }


    res.json(
      result.rows[0]
    );


  } catch (error) {

    console.error(
      "E-bill error:",
      error
    );

    res.status(500).json({
      error: error.message,
    });

  }

});


// =====================================================
// CUSTOMER DETAILS
// =====================================================

app.get("/api/customers/:id", async (req, res) => {

  try {

    const customerId =
      req.params.id;


    // =================================================
    // CUSTOMER
    // =================================================

    const customer =
      await pool.query(
        `
        SELECT

          customer_id,
          customer_phone

        FROM customers

        WHERE customer_id = $1;
        `,
        [customerId]
      );


    if (
      customer.rows.length === 0
    ) {

      return res.status(404).json({
        error: "Customer not found",
      });

    }


    // =================================================
    // CUSTOMER STATS
    // =================================================

    const stats =
      await pool.query(
        `
        SELECT

          COUNT(*) AS total_orders,

          COUNT(*) FILTER (
            WHERE order_status = 'Delivered'
          ) AS delivered_orders,

          COUNT(*) FILTER (
            WHERE order_status = 'Rejected'
          ) AS rejected_orders,

          COALESCE(
            SUM(total) FILTER (
              WHERE order_status = 'Delivered'
            ),
            0
          ) AS total_spending,

          ROUND(
            AVG(total) FILTER (
              WHERE order_status = 'Delivered'
            ),
            2
          ) AS average_order_value,

          ROUND(
            AVG(rating) FILTER (
              WHERE rating IS NOT NULL
            ),
            2
          ) AS average_rating

        FROM orders

        WHERE customer_id = $1;
        `,
        [customerId]
      );


    // =================================================
    // FAVOURITE RESTAURANT
    // =================================================

    const favourite =
      await pool.query(
        `
        SELECT

          r.restaurant_name,
          COUNT(*) AS order_count

        FROM orders o

        JOIN restaurants r
          ON r.restaurant_id =
             o.restaurant_id

        WHERE o.customer_id = $1

        GROUP BY
          r.restaurant_id,
          r.restaurant_name

        ORDER BY
          order_count DESC

        LIMIT 1;
        `,
        [customerId]
      );


    // =================================================
    // RECENT ORDERS
    // =================================================

    const orders =
      await pool.query(
        `
        SELECT

          o.order_id,
          r.restaurant_name,
          o.order_placed_at,
          o.order_status,
          o.total,
          o.rating

        FROM orders o

        LEFT JOIN restaurants r
          ON r.restaurant_id =
             o.restaurant_id

        WHERE o.customer_id = $1

        ORDER BY
          o.order_placed_at DESC

        LIMIT 20;
        `,
        [customerId]
      );


    res.json({

      ...customer.rows[0],

      ...stats.rows[0],

      favourite_restaurant:
        favourite.rows[0] || null,

      recent_orders:
        orders.rows,

    });


  } catch (error) {

    console.error(
      "Customer details error:",
      error
    );

    res.status(500).json({
      error: error.message,
    });

  }

});


// =====================================================
// PERFORMANCE ANALYTICS
// =====================================================

app.get("/api/dashboard/performance", async (req, res) => {

  try {

    const result =
      await pool.query(
        `
        SELECT

          ROUND(
            AVG(kpt_duration)
            FILTER (
              WHERE kpt_duration IS NOT NULL
            ),
            2
          ) AS average_kpt,

          ROUND(
            AVG(rider_wait_time)
            FILTER (
              WHERE rider_wait_time IS NOT NULL
            ),
            2
          ) AS average_rider_wait,

          ROUND(
            AVG(distance_km)
            FILTER (
              WHERE distance_km IS NOT NULL
            ),
            2
          ) AS average_distance_km,

          COUNT(*) FILTER (
            WHERE customer_complaint_tag IS NOT NULL
            AND TRIM(customer_complaint_tag) <> ''
          ) AS complaint_count,

          COUNT(*) FILTER (
            WHERE cancellation_reason IS NOT NULL
            AND TRIM(cancellation_reason) <> ''
          ) AS cancellation_count,

          COALESCE(
            SUM(restaurant_compensation),
            0
          ) AS restaurant_compensation,

          COALESCE(
            SUM(restaurant_penalty),
            0
          ) AS restaurant_penalty

        FROM orders;
        `
      );


    res.json(
      result.rows[0]
    );


  } catch (error) {

    console.error(
      "Performance error:",
      error
    );

    res.status(500).json({
      error: error.message,
    });

  }

});


// =====================================================
// GLOBAL ERROR HANDLER
// =====================================================

app.use(
  (err, req, res, next) => {

    console.error(err);

    res.status(500).json({
      error: "Internal server error",
    });

  }
);


// =====================================================
// START SERVER
// =====================================================

const PORT =
  process.env.PORT || 5000;


app.listen(
  PORT,
  () => {

    console.log(
      `API running on http://localhost:${PORT}`
    );

  }
);