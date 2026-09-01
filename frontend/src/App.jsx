/*
=========================================================
RESTAURANT ORDER ANALYTICS - FRONTEND
---------------------------------------------------------
This file contains the React application.

Main responsibilities:
1. Login page and login state
2. Dashboard and KPI cards
3. Restaurant ranking and trend charts
4. Restaurant detail pages
5. Orders, filters and pagination
6. Order details and e-bill modals
7. API calls to the Express backend

IMPORTANT:
The code below is the working application code.
Only explanatory comments were added; application logic
and values are intentionally preserved.
=========================================================
*/

import React, { useEffect, useState } from "react";
import axios from "axios";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from "recharts";

import "./styles.css";

const API = "http://localhost:5000/api";
const PAGE_SIZE = 10;

// =====================================================
// HELPERS
// =====================================================

const money = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  })}`;

const number = (value) =>
  Number(value || 0).toLocaleString("en-IN");

const shortDate = (value) => {
  if (!value) return "";

  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
  });
};

const dateTime = (value) => {
  if (!value) return "—";

  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// =====================================================
// STAT CARD
// =====================================================

function StatCard({ title, value, description }) {
  return (
    <div className="stat-card">
      <div className="stat-title">{title}</div>

      <div className="stat-value">
        {value}
      </div>

      <div className="stat-description">
        {description}
      </div>
    </div>
  );
}

// =====================================================
// STATUS BADGE
// =====================================================

function StatusBadge({ status }) {
  const normalized = String(status || "")
    .toLowerCase()
    .replace(/\s+/g, "-");

  return (
    <span className={`status-badge ${normalized}`}>
      {status || "Unknown"}
    </span>
  );
}

// =====================================================
// RESTAURANT METRIC
// =====================================================

function RestaurantMetric({ label, value, note }) {
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e8e8e8",
        borderRadius: 14,
        padding: 18,
      }}
    >
      <div
        style={{
          fontSize: 12,
          color: "#777",
          marginBottom: 7,
        }}
      >
        {label}
      </div>

      <strong
        style={{
          fontSize: 22,
          color: "#12213f",
        }}
      >
        {value}
      </strong>

      {note && (
        <div
          style={{
            fontSize: 11,
            color: "#999",
            marginTop: 5,
          }}
        >
          {note}
        </div>
      )}
    </div>
  );
}

// =====================================================
// ORDER DETAIL MODAL
// =====================================================

function OrderDetailModal({
  order,
  onClose,
  onBill,
  loading,
}) {
  if (!order) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(8, 20, 40, 0.55)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        overflowY: "auto",
      }}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        style={{
          width: "min(900px, 100%)",
          maxHeight: "92vh",
          overflowY: "auto",
          background: "#fff",
          borderRadius: 18,
          boxShadow: "0 25px 70px rgba(0,0,0,.25)",
        }}
      >
        {/* HEADER */}
        <div
          style={{
            padding: "22px 26px",
            borderBottom: "1px solid #eee",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 20,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 12,
                color: "#7a879d",
                marginBottom: 7,
              }}
            >
              ORDER DETAILS
            </div>

            <h2
              style={{
                margin: 0,
                color: "#12213f",
              }}
            >
              #{order.order_id}
            </h2>

            <div style={{ marginTop: 10 }}>
              <StatusBadge status={order.order_status} />
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              border: "1px solid #ddd",
              background: "#fff",
              cursor: "pointer",
              fontSize: 18,
            }}
          >
            ×
          </button>
        </div>

        {loading ? (
          <div
            style={{
              padding: 60,
              textAlign: "center",
              color: "#777",
            }}
          >
            Loading order details...
          </div>
        ) : (
          <>
            {/* RESTAURANT / DATE */}
            <div
              style={{
                padding: 26,
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit,minmax(230px,1fr))",
                gap: 16,
              }}
            >
              <div
                style={{
                  background: "#f7f9fc",
                  borderRadius: 12,
                  padding: 16,
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    color: "#7a879d",
                    marginBottom: 6,
                  }}
                >
                  RESTAURANT
                </div>

                <strong>
                  {order.restaurant_name || "—"}
                </strong>
              </div>

              <div
                style={{
                  background: "#f7f9fc",
                  borderRadius: 12,
                  padding: 16,
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    color: "#7a879d",
                    marginBottom: 6,
                  }}
                >
                  ORDER DATE
                </div>

                <strong>
                  {dateTime(order.order_placed_at)}
                </strong>
              </div>

              <div
                style={{
                  background: "#f7f9fc",
                  borderRadius: 12,
                  padding: 16,
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    color: "#7a879d",
                    marginBottom: 6,
                  }}
                >
                  CUSTOMER ID
                </div>

                <strong
                  style={{
                    wordBreak: "break-all",
                    fontSize: 12,
                  }}
                >
                  {order.customer_id || "—"}
                </strong>
              </div>
            </div>

            {/* ORDER INFORMATION */}
            <div style={{ padding: "0 26px 22px" }}>
              <h3
                style={{
                  marginBottom: 14,
                  color: "#12213f",
                }}
              >
                Order Information
              </h3>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit,minmax(170px,1fr))",
                  gap: 12,
                }}
              >
                <InfoBox
                  label="Delivery Type"
                  value={order.delivery_type}
                />

                <InfoBox
                  label="Distance"
                  value={
                    order.distance_km != null
                      ? `${order.distance_km} km`
                      : "—"
                  }
                />

                <InfoBox
                  label="KPT Duration"
                  value={
                    order.kpt_duration != null
                      ? `${order.kpt_duration}`
                      : "—"
                  }
                />

                <InfoBox
                  label="Rider Wait"
                  value={
                    order.rider_wait_time != null
                      ? `${order.rider_wait_time}`
                      : "—"
                  }
                />

                <InfoBox
                  label="Order Ready"
                  value={order.order_ready_marked}
                />

                <InfoBox
                  label="Rating"
                  value={
                    order.rating
                      ? `★ ${order.rating}`
                      : "—"
                  }
                />
              </div>
            </div>

            {/* ITEMS */}
            <div
              style={{
                margin: "0 26px 22px",
                border: "1px solid #e8e8e8",
                borderRadius: 14,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  padding: 16,
                  background: "#f7f9fc",
                  fontWeight: 700,
                }}
              >
                Items Ordered
              </div>

              <div style={{ padding: 18 }}>
                <div
                  style={{
                    fontSize: 15,
                    lineHeight: 1.7,
                  }}
                >
                  {order.items_in_order || "No item information"}
                </div>

                {order.instructions && (
                  <div
                    style={{
                      marginTop: 15,
                      padding: 14,
                      background: "#fff9e8",
                      borderRadius: 10,
                      fontSize: 13,
                    }}
                  >
                    <strong>Customer Instructions:</strong>
                    <br />
                    {order.instructions}
                  </div>
                )}
              </div>
            </div>

            {/* BILL */}
            <div
              style={{
                margin: "0 26px 22px",
                border: "1px solid #e8e8e8",
                borderRadius: 14,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  padding: 16,
                  background: "#f7f9fc",
                  fontWeight: 700,
                }}
              >
                Bill Summary
              </div>

              <div style={{ padding: 18 }}>
                <BillRow
                  label="Subtotal"
                  value={money(order.bill_subtotal)}
                />

                <BillRow
                  label="Packaging Charges"
                  value={money(order.packaging_charges)}
                />

                <div
                  style={{
                    borderTop: "1px dashed #ddd",
                    marginTop: 12,
                    paddingTop: 14,
                  }}
                >
                  <BillRow
                    label="Total Amount"
                    value={money(order.total)}
                    strong
                  />
                </div>
              </div>
            </div>

            {/* FEEDBACK */}
            {(order.rating ||
              order.review ||
              order.customer_complaint_tag ||
              order.cancellation_reason) && (
              <div
                style={{
                  margin: "0 26px 22px",
                  border: "1px solid #e8e8e8",
                  borderRadius: 14,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    padding: 16,
                    background: "#f7f9fc",
                    fontWeight: 700,
                  }}
                >
                  Customer Feedback & Issues
                </div>

                <div style={{ padding: 18 }}>
                  {order.rating && (
                    <p>
                      <strong>Rating:</strong>{" "}
                      ★ {order.rating}
                    </p>
                  )}

                  {order.review && (
                    <p>
                      <strong>Review:</strong>{" "}
                      {order.review}
                    </p>
                  )}

                  {order.customer_complaint_tag && (
                    <p>
                      <strong>Complaint:</strong>{" "}
                      {order.customer_complaint_tag}
                    </p>
                  )}

                  {order.cancellation_reason && (
                    <p>
                      <strong>Cancellation:</strong>{" "}
                      {order.cancellation_reason}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* RESTAURANT FINANCIALS */}
            {(order.restaurant_compensation != null ||
              order.restaurant_penalty != null) && (
              <div
                style={{
                  margin: "0 26px 22px",
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit,minmax(200px,1fr))",
                  gap: 12,
                }}
              >
                <InfoBox
                  label="Restaurant Compensation"
                  value={money(
                    order.restaurant_compensation
                  )}
                />

                <InfoBox
                  label="Restaurant Penalty"
                  value={money(
                    order.restaurant_penalty
                  )}
                />
              </div>
            )}

            {/* FOOTER BUTTONS */}
            <div
              style={{
                padding: "18px 26px",
                borderTop: "1px solid #eee",
                display: "flex",
                justifyContent: "flex-end",
                gap: 10,
              }}
            >
              <button
                onClick={onClose}
                style={{
                  padding: "11px 18px",
                  borderRadius: 9,
                  border: "1px solid #ddd",
                  background: "#fff",
                  cursor: "pointer",
                }}
              >
                Close
              </button>

              <button
                onClick={onBill}
                style={{
                  padding: "11px 18px",
                  borderRadius: 9,
                  border: "none",
                  background: "#12213f",
                  color: "#fff",
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                🧾 View E-Bill
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// =====================================================
// INFO BOX
// =====================================================

function InfoBox({ label, value }) {
  return (
    <div
      style={{
        border: "1px solid #e8e8e8",
        borderRadius: 11,
        padding: 14,
        background: "#fff",
      }}
    >
      <div
        style={{
          fontSize: 11,
          color: "#8a95a8",
          marginBottom: 6,
        }}
      >
        {label}
      </div>

      <strong
        style={{
          fontSize: 14,
          wordBreak: "break-word",
        }}
      >
        {value || "—"}
      </strong>
    </div>
  );
}

// =====================================================
// BILL ROW
// =====================================================

function BillRow({ label, value, strong }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: 20,
        marginBottom: 9,
        fontSize: strong ? 18 : 14,
        fontWeight: strong ? 700 : 400,
      }}
    >
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

// =====================================================
// E-BILL MODAL
// =====================================================

function BillModal({ order, onClose }) {
  if (!order) return null;

  function printBill() {
    const billWindow = window.open(
      "",
      "_blank",
      "width=800,height=900"
    );

    if (!billWindow) {
      alert(
        "Please allow pop-ups in your browser to print the bill."
      );
      return;
    }

    billWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Bill - ${order.order_id}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            padding: 40px;
            color: #111827;
          }

          .bill {
            max-width: 650px;
            margin: auto;
          }

          h1 {
            margin-bottom: 5px;
          }

          .muted {
            color: #6b7280;
          }

          .line {
            border-top: 1px dashed #999;
            margin: 20px 0;
          }

          .row {
            display: flex;
            justify-content: space-between;
            margin: 12px 0;
          }

          .total {
            font-size: 22px;
            font-weight: bold;
          }

          .footer {
            margin-top: 40px;
            text-align: center;
            color: #777;
          }
        </style>
      </head>

      <body>
        <div class="bill">

          <h1>Restaurant Order Bill</h1>

          <div class="muted">
            Restaurant Order Analytics
          </div>

          <div class="line"></div>

          <div class="row">
            <strong>Order ID</strong>
            <span>#${order.order_id}</span>
          </div>

          <div class="row">
            <strong>Restaurant</strong>
            <span>${order.restaurant_name || "—"}</span>
          </div>

          <div class="row">
            <strong>Date</strong>
            <span>${dateTime(order.order_placed_at)}</span>
          </div>

          <div class="row">
            <strong>Status</strong>
            <span>${order.order_status || "—"}</span>
          </div>

          <div class="line"></div>

          <h3>Items</h3>

          <p>
            ${order.items_in_order || "No item information"}
          </p>

          <div class="line"></div>

          <div class="row">
            <span>Subtotal</span>
            <span>${money(order.bill_subtotal)}</span>
          </div>

          <div class="row">
            <span>Packaging Charges</span>
            <span>${money(order.packaging_charges)}</span>
          </div>

          <div class="line"></div>

          <div class="row total">
            <span>Total</span>
            <span>${money(order.total)}</span>
          </div>

          <div class="line"></div>

          <div class="footer">
            Thank you for your order.
            <br/>
            Restaurant Order Analytics
          </div>

        </div>
      </body>
      </html>
    `);

    billWindow.document.close();

    setTimeout(() => {
      billWindow.focus();
      billWindow.print();
    }, 300);
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10000,
        background: "rgba(8,20,40,.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        style={{
          width: "min(620px,100%)",
          maxHeight: "92vh",
          overflowY: "auto",
          background: "#fff",
          borderRadius: 18,
          boxShadow: "0 25px 70px rgba(0,0,0,.3)",
        }}
      >
        <div
          style={{
            padding: 25,
            borderBottom: "1px solid #eee",
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div
              style={{
                fontSize: 11,
                color: "#777",
              }}
            >
              E-BILL
            </div>

            <h2 style={{ margin: "5px 0" }}>
              Restaurant Order Bill
            </h2>

            <div
              style={{
                color: "#777",
                fontSize: 13,
              }}
            >
              Order #{order.order_id}
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              width: 35,
              height: 35,
              borderRadius: 9,
              border: "1px solid #ddd",
              background: "#fff",
              cursor: "pointer",
              fontSize: 18,
            }}
          >
            ×
          </button>
        </div>

        <div style={{ padding: 26 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 20,
              marginBottom: 25,
            }}
          >
            <div>
              <strong>
                {order.restaurant_name || "Restaurant"}
              </strong>

              <div
                style={{
                  fontSize: 13,
                  color: "#777",
                  marginTop: 5,
                }}
              >
                {dateTime(order.order_placed_at)}
              </div>
            </div>

            <StatusBadge status={order.order_status} />
          </div>

          <div
            style={{
              padding: 16,
              background: "#f7f9fc",
              borderRadius: 12,
              marginBottom: 20,
            }}
          >
            <strong>Items</strong>

            <div
              style={{
                marginTop: 10,
                lineHeight: 1.7,
              }}
            >
              {order.items_in_order ||
                "No item information"}
            </div>
          </div>

          <BillRow
            label="Subtotal"
            value={money(order.bill_subtotal)}
          />

          <BillRow
            label="Packaging Charges"
            value={money(order.packaging_charges)}
          />

          <div
            style={{
              borderTop: "1px dashed #ccc",
              marginTop: 15,
              paddingTop: 16,
            }}
          >
            <BillRow
              label="TOTAL"
              value={money(order.total)}
              strong
            />
          </div>

          <div
            style={{
              marginTop: 25,
              padding: 15,
              borderRadius: 10,
              background: "#f5faf6",
              fontSize: 13,
              textAlign: "center",
            }}
          >
            Thank you for your order.
          </div>
        </div>

        <div
          style={{
            padding: "18px 26px",
            borderTop: "1px solid #eee",
            display: "flex",
            justifyContent: "flex-end",
            gap: 10,
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: "11px 18px",
              borderRadius: 9,
              border: "1px solid #ddd",
              background: "#fff",
              cursor: "pointer",
            }}
          >
            Close
          </button>

          <button
            onClick={printBill}
            style={{
              padding: "11px 18px",
              borderRadius: 9,
              border: "none",
              background: "#12213f",
              color: "#fff",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            🖨 Print / Save PDF
          </button>
        </div>
      </div>
    </div>
  );
}


// =====================================================
// LOGIN PAGE
// =====================================================

function LoginPage({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = (e) => {
    e.preventDefault();

    if (
      email.trim().toLowerCase() === "admin@restaurant.com" &&
      password === "admin123"
    ) {
      setError("");
      onLogin();
    } else {
      setError("Invalid email or password");
    }
  };

  return (
    <div className="login-page">

      {/* Background decorations */}
      <div className="login-bg-shape login-bg-shape-1"></div>
      <div className="login-bg-shape login-bg-shape-2"></div>

      <div className="login-shell">

        {/* ================= LEFT PANEL ================= */}
        <section className="login-visual-panel">

          <div className="login-grid"></div>

          <div className="login-circle circle-one"></div>
          <div className="login-circle circle-two"></div>
          <div className="login-circle circle-three"></div>

          <div className="login-visual-content">

            {/* Logo */}
            <div className="login-logo">
              RA
            </div>

            <div className="login-copy">

              <div className="login-eyebrow">
                RESTAURANT ORDER
              </div>

              <h1>
                Turn every order
                <br />
                into an insight.
              </h1>

              <p>
                Understand your restaurants, revenue, deliveries and
                <br />
                customer orders from one powerful analytics dashboard.
              </p>

            </div>

            {/* Dashboard preview */}
            <div className="login-dashboard-preview">

              <div className="preview-topbar">
                <div className="preview-dots">
                  <span></span>
                  <span className="preview-line"></span>
                </div>

                <div className="preview-avatar">A</div>
              </div>

              <div className="preview-card">

                <div className="preview-stats">

                  <div className="preview-stat">
                    <span>Revenue</span>
                    <strong>₹17.5L</strong>
                  </div>

                  <div className="preview-stat">
                    <span>Orders</span>
                    <strong>5,192</strong>
                  </div>

                </div>

                <div className="preview-chart">

                  <div className="chart-bars">
                    <span style={{ height: "32%" }}></span>
                    <span style={{ height: "52%" }}></span>
                    <span style={{ height: "43%" }}></span>
                    <span style={{ height: "67%" }}></span>
                    <span style={{ height: "48%" }}></span>
                    <span style={{ height: "72%" }}></span>
                    <span style={{ height: "83%" }}></span>
                  </div>

                  <div className="chart-line"></div>

                </div>

              </div>
            </div>

          </div>
        </section>


        {/* ================= RIGHT PANEL ================= */}
        <section className="login-form-panel">

          <div className="login-form-inner">

            <div className="login-heading">

              <div className="login-welcome">
                WELCOME BACK
              </div>

              <h2>Sign in</h2>

              <p>
                Access your restaurant analytics dashboard
              </p>

            </div>


            <form onSubmit={handleLogin}>

              {/* Email */}
              <div className="login-field">

                <label>Email</label>

                <div className="login-input-wrap">

                  <span className="input-icon">
                    ✉
                  </span>

                  <input
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setError("");
                    }}
                    autoComplete="email"
                  />

                </div>

              </div>


              {/* Password */}
              <div className="login-field">

                <label>Password</label>

                <div className="login-input-wrap">

                  <span className="input-icon">
                    ●
                  </span>

                  <input
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setError("");
                    }}
                    autoComplete="current-password"
                  />

                </div>

              </div>


              {/* Error */}
              {error && (
                <div className="login-error">
                  {error}
                </div>
              )}


              {/* Login button */}
              <button
                type="submit"
                className="login-submit"
              >
                <span>Login</span>
                <span className="login-arrow">→</span>
              </button>

            </form>


            {/* Demo credentials */}
            <div className="login-demo-box">

              <div className="demo-title">
                DEMO CREDENTIALS
              </div>

              <div className="demo-email">
                admin@restaurant.com
              </div>

              <div className="demo-password">
                Password: <strong>admin123</strong>
              </div>

            </div>


            {/* Footer */}
            <div className="login-footer">

              <span>Restaurant Analytics</span>

              <b>•</b>

              <span>Secure Dashboard</span>

            </div>

          </div>

        </section>

      </div>
    </div>
  );
}

// =====================================================
// MAIN APP
// =====================================================

export default function App() {
  // ===================================================
  // AUTHENTICATION
  // ===================================================

  const [isAuthenticated, setIsAuthenticated] =
    useState(false);

  function handleLogout() {
    setIsAuthenticated(false);
    setSelectedRestaurant(null);
    setSelectedOrder(null);
    setShowBill(false);
  }

  // ===================================================
  // DASHBOARD STATE
  // ===================================================

  const [kpi, setKpi] = useState({});
  const [trend, setTrend] = useState([]);
  const [restaurants, setRestaurants] = useState([]);
  const [orders, setOrders] = useState([]);

  // ===================================================
  // ORDER FILTER STATE
  // ===================================================

  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);

  // ===================================================
  // LOADING / ERROR
  // ===================================================

  const [loading, setLoading] = useState(true);
  const [filterLoading, setFilterLoading] =
    useState(false);
  const [error, setError] = useState("");

  // ===================================================
  // RESTAURANT DETAIL
  // ===================================================

  const [selectedRestaurant, setSelectedRestaurant] =
    useState(null);

  const [restaurantDetails, setRestaurantDetails] =
    useState(null);

  const [restaurantAnalytics, setRestaurantAnalytics] =
    useState(null);

  const [restaurantOrders, setRestaurantOrders] =
    useState([]);

  const [restaurantOrderTotal, setRestaurantOrderTotal] =
    useState(0);

  const [restaurantOrderPage, setRestaurantOrderPage] =
    useState(1);

  const [restaurantLoading, setRestaurantLoading] =
    useState(false);

  // ===================================================
  // ORDER DETAIL
  // ===================================================

  const [selectedOrder, setSelectedOrder] =
    useState(null);

  const [orderLoading, setOrderLoading] =
    useState(false);

  // ===================================================
  // BILL
  // ===================================================

  const [showBill, setShowBill] = useState(false);
  const [restaurantMetric, setRestaurantMetric] = useState("revenue");

  // Dashboard controls
  const [overviewMode, setOverviewMode] = useState("amount");
  const [rankingView, setRankingView] = useState("top10");
  const [selectedMonth, setSelectedMonth] = useState("2026-06");

  // ===================================================
  // LOAD ORDERS
  // ===================================================

  async function loadOrders(
    selectedPage = 1,
    selectedStatus = status,
    selectedSearch = search
  ) {
    setFilterLoading(true);
    setError("");

    try {
      const response = await axios.get(
        `${API}/orders`,
        {
          params: {
            page: selectedPage,
            limit: PAGE_SIZE,

            ...(selectedStatus
              ? { status: selectedStatus }
              : {}),

            ...(selectedSearch.trim()
              ? {
                  search:
                    selectedSearch.trim(),
                }
              : {}),
          },
        }
      );

      setOrders(response.data);

      const total =
        Number(
          response.headers["x-total-count"]
        ) || 0;

      setTotalOrders(total);
      setPage(selectedPage);
    } catch (err) {
      console.error(
        "Orders loading error:",
        err
      );

      setError("Unable to load orders.");
      setOrders([]);
      setTotalOrders(0);
    } finally {
      setFilterLoading(false);
    }
  }

  // ===================================================
  // LOAD DASHBOARD
  // ===================================================

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    async function loadDashboard() {
      try {
        const [
          kpiResponse,
          trendResponse,
          restaurantResponse,
          ordersResponse,
        ] = await Promise.all([
          axios.get(`${API}/dashboard/kpis`),

          axios.get(
            `${API}/dashboard/daily-trend`
          ),

          axios.get(
            `${API}/dashboard/restaurants`
          ),

          axios.get(
            `${API}/orders?page=1&limit=${PAGE_SIZE}`
          ),
        ]);

        setKpi(kpiResponse.data);

        setTrend(
          trendResponse.data.map((item) => ({
            ...item,
            orders: Number(item.orders),
            revenue: Number(item.revenue),
          }))
        );

        setRestaurants(
          restaurantResponse.data.map(
            (item) => ({
              ...item,
              restaurant_id:
                Number(item.restaurant_id),

              revenue:
                Number(item.revenue),

              total_orders:
                Number(item.total_orders),

              delivered_orders:
                Number(
                  item.delivered_orders
                ),

              rejected_orders:
                Number(
                  item.rejected_orders
                ),
            })
          )
        );

        setOrders(ordersResponse.data);

        const total =
          Number(
            ordersResponse.headers[
              "x-total-count"
            ]
          ) || 0;

        setTotalOrders(total);
        setPage(1);
      } catch (err) {
        console.error(
          "Dashboard loading error:",
          err
        );

        setError(
          "Unable to connect to the backend. Make sure the backend is running."
        );
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, [isAuthenticated]);

  // ===================================================
  // SEARCH
  // ===================================================

  async function handleSearch(event) {
    const value = event.target.value;

    setSearch(value);

    await loadOrders(
      1,
      status,
      value
    );
  }

  // ===================================================
  // STATUS FILTER
  // ===================================================

  async function filterOrders(selectedStatus) {
    setStatus(selectedStatus);

    await loadOrders(
      1,
      selectedStatus,
      search
    );
  }

  // ===================================================
  // PAGINATION
  // ===================================================

  const totalPages = Math.max(
    1,
    Math.ceil(
      totalOrders / PAGE_SIZE
    )
  );

  const firstOrder =
    totalOrders === 0
      ? 0
      : (page - 1) *
          PAGE_SIZE +
        1;

  const lastOrder = Math.min(
    page * PAGE_SIZE,
    totalOrders
  );

  async function goToPreviousPage() {
    if (
      page <= 1 ||
      filterLoading
    )
      return;

    await loadOrders(
      page - 1,
      status,
      search
    );
  }

  async function goToNextPage() {
    if (
      page >= totalPages ||
      filterLoading
    )
      return;

    await loadOrders(
      page + 1,
      status,
      search
    );
  }

  // ===================================================
  // RESTAURANT DETAILS
  // ===================================================

  async function openRestaurant(
    restaurant
  ) {
    if (!restaurant?.restaurant_id) {
      setError(
        "Restaurant ID is missing."
      );

      return;
    }

    setSelectedRestaurant(
      restaurant
    );

    setRestaurantLoading(true);

    setRestaurantDetails(null);
    setRestaurantAnalytics(null);

    setRestaurantOrders([]);

    setRestaurantOrderPage(1);

    try {
      const [
        detailResponse,
        ordersResponse,
        analyticsResponse,
      ] = await Promise.all([
        axios.get(
          `${API}/restaurants/${restaurant.restaurant_id}`
        ),

        axios.get(
          `${API}/restaurants/${restaurant.restaurant_id}/orders`,
          {
            params: {
              page: 1,
              limit: PAGE_SIZE,
            },
          }
        ),

        axios.get(
          `${API}/restaurants/${restaurant.restaurant_id}/analytics`
        ),
      ]);

      setRestaurantDetails(
        detailResponse.data
      );

      setRestaurantAnalytics(
        analyticsResponse.data
      );

      setRestaurantOrders(
        ordersResponse.data
      );

      setRestaurantOrderTotal(
        Number(
          ordersResponse.headers[
            "x-total-count"
          ]
        ) || 0
      );
    } catch (err) {
      console.error(
        "Restaurant details error:",
        err
      );

      setError(
        "Unable to load restaurant details."
      );
    } finally {
      setRestaurantLoading(false);
    }
  }

  // ===================================================
  // RESTAURANT ORDERS
  // ===================================================

  async function loadRestaurantOrders(
    nextPage
  ) {
    if (!selectedRestaurant)
      return;

    try {
      setRestaurantLoading(true);

      const response =
        await axios.get(
          `${API}/restaurants/${selectedRestaurant.restaurant_id}/orders`,
          {
            params: {
              page: nextPage,
              limit: PAGE_SIZE,
            },
          }
        );

      setRestaurantOrders(
        response.data
      );

      setRestaurantOrderPage(
        nextPage
      );

      setRestaurantOrderTotal(
        Number(
          response.headers[
            "x-total-count"
          ]
        ) || 0
      );
    } catch (err) {
      console.error(
        "Restaurant orders error:",
        err
      );

      setError(
        "Unable to load restaurant orders."
      );
    } finally {
      setRestaurantLoading(false);
    }
  }

  // ===================================================
  // CLOSE RESTAURANT
  // ===================================================

  function closeRestaurant() {
    setSelectedRestaurant(null);
    setRestaurantDetails(null);
    setRestaurantAnalytics(null);
    setRestaurantOrders([]);
    setRestaurantOrderPage(1);
  }

  // ===================================================
  // OPEN ORDER
  // ===================================================

  async function openOrder(order) {
    if (!order?.order_id) {
      return;
    }

    setSelectedOrder(order);
    setShowBill(false);
    setOrderLoading(true);

    try {
      const response =
        await axios.get(
          `${API}/orders/${order.order_id}`
        );

      const completeOrder =
        response.data;

      // Some APIs may return an object
      // containing the order.
      if (
        completeOrder &&
        completeOrder.order
      ) {
        setSelectedOrder({
          ...order,
          ...completeOrder.order,
        });
      } else {
        setSelectedOrder({
          ...order,
          ...completeOrder,
        });
      }
    } catch (err) {
      console.warn(
        "Complete order API unavailable. Using table data.",
        err
      );

      // The restaurant orders API already
      // provides detailed fields, so the
      // clicked order can still be displayed.
      setSelectedOrder(order);
    } finally {
      setOrderLoading(false);
    }
  }

  // ===================================================
  // CLOSE ORDER
  // ===================================================

  function closeOrder() {
    setSelectedOrder(null);
    setShowBill(false);
  }

  // ===================================================
  // NAVIGATION
  // ===================================================

  function scrollToSection(id) {
    if (selectedRestaurant) {
      closeRestaurant();

      setTimeout(() => {
        document
          .getElementById(id)
          ?.scrollIntoView({
            behavior: "smooth",
          });
      }, 100);

      return;
    }

    document
      .getElementById(id)
      ?.scrollIntoView({
        behavior: "smooth",
      });
  }

  // ===================================================
  // LOGIN
  // ===================================================

  if (!isAuthenticated) {
    return <LoginPage onLogin={() => setIsAuthenticated(true)} />;
  }

  // ===================================================
  // LOADING SCREEN
  // ===================================================

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-box">
          <div className="loading-spinner"></div>

          <h2>
            Loading Analytics
          </h2>

          <p>
            Connecting to the restaurant data...
          </p>
        </div>
      </div>
    );
  }

  // ===================================================
  // RESTAURANT DETAIL VIEW
  // ===================================================

  if (selectedRestaurant) {
    const detail =
      restaurantDetails ||
      selectedRestaurant;

    const restaurantPages =
      Math.max(
        1,
        Math.ceil(
          restaurantOrderTotal /
            PAGE_SIZE
        )
      );

    const successRate =
      Number(
        detail.delivery_success_rate ||
          0
      );

    return (
      <div className="dashboard">

        {/* SIDEBAR */}
        <aside className="sidebar">
          <div className="brand">
            <div className="brand-icon">
              RA
            </div>

            <div>
              <h2>Restaurant</h2>
              <span>Analytics</span>
            </div>
          </div>

          <nav>
            <div
              className="nav-item"
              onClick={closeRestaurant}
            >
              <span>▦</span>
              Dashboard
            </div>

            <div
              className="nav-item"
              onClick={() =>
                scrollToSection(
                  "restaurant-orders"
                )
              }
            >
              <span>◉</span>
              Orders
            </div>

            <div className="nav-item active">
              <span>▥</span>
              Restaurants
            </div>

            <div
              className="nav-item"
              onClick={() =>
                scrollToSection(
                  "restaurant-performance"
                )
              }
            >
              <span>◌</span>
              Performance
            </div>
          </nav>

          <div className="sidebar-footer">
            <div className="data-status">
              <span className="online-dot"></span>

              <div>
                <strong>
                  Data Connected
                </strong>

                <small>
                  PostgreSQL
                </small>
              </div>
            </div>
          </div>
        </aside>

        {/* MAIN */}
        <main className="main-content">

          {/* HEADER */}
          <div className="top-header">
            <div>
              <div className="breadcrumb">
                Analytics / Restaurants /
                Details
              </div>

              <h1>
                {detail.restaurant_name}
              </h1>

              <p>
                Detailed restaurant
                performance and order
                operations.
              </p>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              <button
                onClick={closeRestaurant}
                style={{
                  border:
                    "1px solid #ddd",
                  background: "#fff",
                  borderRadius: 10,
                  padding:
                    "11px 16px",
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                ← Back to Dashboard
              </button>

              <button
                onClick={handleLogout}
                style={{
                  border: "none",
                  background: "#12213f",
                  color: "#fff",
                  borderRadius: 10,
                  padding: "11px 16px",
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                Logout
              </button>
            </div>
          </div>

          {restaurantLoading &&
          !restaurantDetails ? (
            <div className="loading-box">
              <h2>
                Loading restaurant...
              </h2>
            </div>
          ) : (
            <>
              {/* RESTAURANT HEADER */}
              <section
                className="panel"
                style={{
                  marginBottom: 20,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent:
                      "space-between",
                    alignItems:
                      "center",
                    gap: 20,
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    <h2
                      style={{
                        marginBottom: 8,
                      }}
                    >
                      {
                        detail.restaurant_name
                      }
                    </h2>

                    <p
                      style={{
                        margin: 0,
                        color: "#777",
                      }}
                    >
                      📍{" "}
                      {detail.city ||
                        "City not available"}

                      {detail.subzone
                        ? ` • ${detail.subzone}`
                        : ""}
                    </p>
                  </div>

                  <div
                    style={{
                      padding:
                        "10px 14px",
                      borderRadius: 10,
                      background:
                        "#f5f7fa",
                      fontSize: 13,
                    }}
                  >
                    Restaurant ID:{" "}
                    <strong>
                      {
                        detail.restaurant_id
                      }
                    </strong>
                  </div>
                </div>
              </section>

              {/* METRICS */}
              <section
                id="restaurant-performance"
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit,minmax(180px,1fr))",
                  gap: 14,
                  marginBottom: 20,
                }}
              >
                <RestaurantMetric
                  label="Revenue"
                  value={money(
                    detail.revenue
                  )}
                  note="Delivered orders"
                />

                <RestaurantMetric
                  label="Total Orders"
                  value={number(
                    detail.total_orders
                  )}
                />

                <RestaurantMetric
                  label="Delivered"
                  value={number(
                    detail.delivered_orders
                  )}
                  note={`${successRate.toFixed(
                    2
                  )}% success`}
                />

                <RestaurantMetric
                  label="Rejected"
                  value={number(
                    detail.rejected_orders
                  )}
                  note={`${Number(
                    detail.rejection_rate ||
                      0
                  ).toFixed(
                    2
                  )}% rejection`}
                />

                <RestaurantMetric
                  label="Returned"
                  value={number(
                    detail.returned_orders
                  )}
                />

                <RestaurantMetric
                  label="Timed Out"
                  value={number(
                    detail.timed_out_orders
                  )}
                />

                <RestaurantMetric
                  label="Average Order"
                  value={money(
                    detail.average_order_value
                  )}
                />

                <RestaurantMetric
                  label="Average Rating"
                  value={
                    detail.average_rating
                      ? `★ ${detail.average_rating}`
                      : "—"
                  }
                />

                <RestaurantMetric
                  label="Avg Distance"
                  value={
                    detail.average_distance_km !=
                    null
                      ? `${detail.average_distance_km} km`
                      : "—"
                  }
                />

                <RestaurantMetric
                  label="Complaints"
                  value={number(
                    detail.complaint_count
                  )}
                />

                <RestaurantMetric
                  label="Average KPT"
                  value={
                    detail.average_kpt !=
                    null
                      ? detail.average_kpt
                      : "—"
                  }
                />

                <RestaurantMetric
                  label="Rider Wait"
                  value={
                    detail.average_rider_wait !=
                    null
                      ? detail.average_rider_wait
                      : "—"
                  }
                />
              </section>

              {/* QUICK INSIGHT */}
              <section
                className="panel"
                style={{
                  marginBottom: 20,
                }}
              >
                <div className="panel-header">
                  <div>
                    <h2>
                      Restaurant Insights
                    </h2>

                    <p>
                      Quick operational
                      overview
                    </p>
                  </div>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fit,minmax(220px,1fr))",
                    gap: 14,
                  }}
                >
                  <div
                    style={{
                      padding: 18,
                      borderRadius: 12,
                      background:
                        "#f5faf6",
                    }}
                  >
                    <strong>
                      Delivery Performance
                    </strong>

                    <div
                      style={{
                        fontSize: 25,
                        fontWeight: 700,
                        marginTop: 8,
                      }}
                    >
                      {successRate.toFixed(
                        2
                      )}
                      %
                    </div>

                    <small>
                      Orders successfully
                      delivered
                    </small>
                  </div>

                  <div
                    style={{
                      padding: 18,
                      borderRadius: 12,
                      background:
                        "#fff8ed",
                    }}
                  >
                    <strong>
                      Customer Complaints
                    </strong>

                    <div
                      style={{
                        fontSize: 25,
                        fontWeight: 700,
                        marginTop: 8,
                      }}
                    >
                      {number(
                        detail.complaint_count
                      )}
                    </div>

                    <small>
                      Recorded complaints
                    </small>
                  </div>

                  <div
                    style={{
                      padding: 18,
                      borderRadius: 12,
                      background:
                        "#f5f7ff",
                    }}
                  >
                    <strong>
                      Average Order
                    </strong>

                    <div
                      style={{
                        fontSize: 25,
                        fontWeight: 700,
                        marginTop: 8,
                      }}
                    >
                      {money(
                        detail.average_order_value
                      )}
                    </div>

                    <small>
                      Average delivered
                      order value
                    </small>
                  </div>
                </div>
              </section>

              {/* RESTAURANT ANALYTICS */}
              {restaurantAnalytics && (
                <section className="restaurant-analytics-section">
                  <div className="restaurant-analytics-heading">
                    <div>
                      <span className="analytics-kicker">PERFORMANCE ANALYTICS</span>
                      <h2>Restaurant intelligence</h2>
                      <p>Daily trends, order health, ratings and customer issues from live PostgreSQL data.</p>
                    </div>
                    <div className="analytics-live-badge">● Live analytics</div>
                  </div>

                  <div className="restaurant-chart-grid restaurant-chart-grid-wide">
                    <div className="chart-card restaurant-chart-card">
                      <div className="chart-card-heading">
                        <div><h3>Daily Orders &amp; Revenue</h3><p>Order volume and delivered-order revenue</p></div>
                      </div>
                      <ResponsiveContainer width="100%" height={280}>
                        <LineChart data={(restaurantAnalytics.daily || []).map((item) => ({
                          ...item,
                          orders: Number(item.orders),
                          revenue: Number(item.revenue),
                        }))}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="order_date" tickFormatter={shortDate} tick={{ fontSize: 10 }} />
                          <YAxis yAxisId="orders" tick={{ fontSize: 10 }} />
                          <YAxis yAxisId="revenue" orientation="right" tick={{ fontSize: 10 }} />
                          <Tooltip
                            labelFormatter={(value) => shortDate(value)}
                            formatter={(value, name) => [name === "Revenue" ? money(value) : number(value), name]}
                          />
                          <Line yAxisId="orders" type="monotone" dataKey="orders" name="Orders" stroke="#e21d37" strokeWidth={3} dot={false} />
                          <Line yAxisId="revenue" type="monotone" dataKey="revenue" name="Revenue" stroke="#202020" strokeWidth={2} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="chart-card restaurant-chart-card">
                      <div className="chart-card-heading">
                        <div><h3>Order Status</h3><p>How this restaurant's orders performed</p></div>
                      </div>
                      <ResponsiveContainer width="100%" height={280}>
                        <PieChart>
                          <Pie
                            data={(restaurantAnalytics.status_breakdown || []).map((item) => ({ ...item, orders: Number(item.orders) }))}
                            dataKey="orders"
                            nameKey="status"
                            innerRadius={70}
                            outerRadius={100}
                            paddingAngle={3}
                            stroke="none"
                          >
                            {(restaurantAnalytics.status_breakdown || []).map((item, index) => (
                              <Cell key={`${item.status}-${index}`} fill={index === 0 ? "#e21d37" : index === 1 ? "#f2a5b0" : "#f0b44c"} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => [number(value), "Orders"]} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="chart-mini-legend">
                        {(restaurantAnalytics.status_breakdown || []).map((item, index) => (
                          <div key={`${item.status}-legend`}>
                            <span className="legend-swatch" style={{ background: index === 0 ? "#e21d37" : index === 1 ? "#f2a5b0" : "#f0b44c" }}></span>
                            <span>{item.status}</span>
                            <strong>{number(item.orders)}</strong>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="restaurant-chart-grid">
                    <div className="chart-card restaurant-chart-card">
                      <div className="chart-card-heading">
                        <div><h3>Rating Distribution</h3><p>Customer ratings received</p></div>
                      </div>
                      <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={(restaurantAnalytics.ratings || []).map((item) => ({ ...item, count: Number(item.count), rating: `${item.rating}★` }))}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="rating" tick={{ fontSize: 10 }} />
                          <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                          <Tooltip formatter={(value) => [number(value), "Ratings"]} />
                          <Bar dataKey="count" name="Ratings" fill="#e21d37" radius={[7, 7, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="chart-card restaurant-chart-card">
                      <div className="chart-card-heading">
                        <div><h3>Delivery Distance</h3><p>Order distribution by delivery radius</p></div>
                      </div>
                      <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={(restaurantAnalytics.distance_ranges || []).map((item) => ({ ...item, orders: Number(item.orders) }))}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="distance_range" tick={{ fontSize: 9 }} />
                          <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                          <Tooltip formatter={(value) => [number(value), "Orders"]} />
                          <Bar dataKey="orders" name="Orders" fill="#222" radius={[7, 7, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="chart-card restaurant-chart-card complaint-card">
                      <div className="chart-card-heading">
                        <div><h3>Customer Complaints</h3><p>Issues reported against this restaurant</p></div>
                      </div>
                      {(restaurantAnalytics.complaints || []).length === 0 ? (
                        <div className="chart-empty">No complaints recorded.</div>
                      ) : (
                        <div className="complaint-list">
                          {(restaurantAnalytics.complaints || []).map((item) => {
                            const count = Number(item.count);
                            const max = Math.max(...(restaurantAnalytics.complaints || []).map((x) => Number(x.count)), 1);
                            return (
                              <div className="complaint-row" key={item.complaint}>
                                <div className="complaint-label"><span>{item.complaint}</span><strong>{count}</strong></div>
                                <div className="complaint-track"><span style={{ width: `${(count / max) * 100}%` }}></span></div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </section>
              )}

              {/* RESTAURANT ORDERS */}
              <section
                id="restaurant-orders"
                className="panel orders-panel"
              >
                <div className="panel-header">
                  <div>
                    <h2>
                      Restaurant Orders
                    </h2>

                    <p>
                      Click an order to
                      view complete
                      details
                    </p>
                  </div>
                </div>

                {restaurantOrders.length ===
                0 ? (
                  <div className="empty-state">
                    No orders found.
                  </div>
                ) : (
                  <div className="table-wrapper">
                    <table>
                      <thead>
                        <tr>
                          <th>
                            Order ID
                          </th>

                          <th>
                            Date
                          </th>

                          <th>
                            Status
                          </th>

                          <th>
                            Delivery
                          </th>

                          <th>
                            Distance
                          </th>

                          <th>
                            Total
                          </th>

                          <th>
                            Rating
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {restaurantOrders.map(
                          (order) => (
                            <tr
                              key={
                                order.order_id
                              }
                              onClick={() =>
                                openOrder(
                                  order
                                )
                              }
                              style={{
                                cursor:
                                  "pointer",
                              }}
                              title="Click to view order details"
                            >
                              <td>
                                <strong
                                  style={{
                                    color:
                                      "#1769aa",
                                  }}
                                >
                                  {
                                    order.order_id
                                  }
                                </strong>
                              </td>

                              <td>
                                {dateTime(
                                  order.order_placed_at
                                )}
                              </td>

                              <td>
                                <StatusBadge
                                  status={
                                    order.order_status
                                  }
                                />
                              </td>

                              <td>
                                {order.delivery_type ||
                                  "—"}
                              </td>

                              <td>
                                {order.distance_km !=
                                null
                                  ? `${order.distance_km} km`
                                  : "—"}
                              </td>

                              <td>
                                {money(
                                  order.total
                                )}
                              </td>

                              <td>
                                {order.rating
                                  ? `★ ${order.rating}`
                                  : "—"}
                              </td>
                            </tr>
                          )
                        )}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="pagination">
                  <button
                    disabled={
                      restaurantOrderPage <=
                        1 ||
                      restaurantLoading
                    }
                    onClick={() =>
                      loadRestaurantOrders(
                        restaurantOrderPage -
                          1
                      )
                    }
                  >
                    ← Previous
                  </button>

                  <span>
                    Page{" "}
                    <strong>
                      {
                        restaurantOrderPage
                      }
                    </strong>{" "}
                    of{" "}
                    <strong>
                      {
                        restaurantPages
                      }
                    </strong>
                  </span>

                  <button
                    disabled={
                      restaurantOrderPage >=
                        restaurantPages ||
                      restaurantLoading
                    }
                    onClick={() =>
                      loadRestaurantOrders(
                        restaurantOrderPage +
                          1
                      )
                    }
                  >
                    Next →
                  </button>
                </div>
              </section>
            </>
          )}

          {/* ERROR */}
          {error && (
            <div className="empty-state">
              {error}
            </div>
          )}

          <footer>
            <span>
              Restaurant Order Analytics
            </span>

            <span>
              Data source: PostgreSQL
            </span>
          </footer>
        </main>

        {/* ORDER MODAL */}
        {selectedOrder && (
          <OrderDetailModal
            order={selectedOrder}
            onClose={closeOrder}
            loading={orderLoading}
            onBill={() =>
              setShowBill(true)
            }
          />
        )}

        {/* BILL MODAL */}
        {showBill &&
          selectedOrder && (
            <BillModal
              order={selectedOrder}
              onClose={() =>
                setShowBill(false)
              }
            />
          )}
      </div>
    );
  }

  // ===================================================
  // MAIN DASHBOARD
  // ===================================================

  const topRestaurants = restaurants.slice(0, 3);

  const rankingDataKey = restaurantMetric === "revenue" ? "revenue" : "total_orders";

  const rankedByMetric = [...restaurants]
    .sort(
      (a, b) =>
        Number(b?.[rankingDataKey] || 0) -
        Number(a?.[rankingDataKey] || 0)
    )
    .map((restaurant) => ({
      ...restaurant,
      rankingValue: Number(restaurant?.[rankingDataKey] || 0),
    }));

  const rankedRestaurants =
    rankingView === "all"
      ? rankedByMetric
      : rankedByMetric.slice(0, rankingView === "top5" ? 5 : 10);

  const rankingTitle =
    rankingView === "all"
      ? "All Restaurants"
      : rankingView === "top5"
        ? "Top 5 Restaurants"
        : "Top 10 Restaurants";

  const filteredTrend = trend.filter((item) => {
    if (!selectedMonth) return true;
    return String(item.order_date || "").slice(0, 7) === selectedMonth;
  });

  const selectedMonthLabel = selectedMonth
    ? new Date(`${selectedMonth}-01T00:00:00`).toLocaleDateString("en-IN", {
        month: "long",
        year: "numeric",
      })
    : "All months";

  const overviewCards =
    overviewMode === "amount"
      ? [
          { icon: "₹", value: money(kpi.revenue), label: "Sales Revenue", note: "↗ Delivered" },
          { icon: "₹", value: money(kpi.average_order_value), label: "Average Order Value", note: "↗ Delivered" },
          { icon: "✓", value: number(kpi.delivered_orders), label: "Delivered", note: `${Number(kpi.rejection_rate || 0).toFixed(2)}% rejected` },
          { icon: "★", value: kpi.average_rating ?? "N/A", label: "Overall Rating", note: "Customer rating" },
        ]
      : [
          { icon: "▣", value: number(kpi.total_orders), label: "Total Orders", note: "↗ All orders" },
          { icon: "✓", value: number(kpi.delivered_orders), label: "Delivered Orders", note: "↗ Successful deliveries" },
          { icon: "!", value: number(kpi.rejected_orders), label: "Rejected Orders", note: `${Number(kpi.rejection_rate || 0).toFixed(2)}% of all orders` },
          { icon: "★", value: kpi.average_rating ?? "N/A", label: "Overall Rating", note: "Customer rating" },
        ];

  const statusData = [
    { name: "Delivered", value: Number(kpi.delivered_orders || 0) },
    { name: "Rejected", value: Number(kpi.rejected_orders || 0) },
  ];

  return (
    <div className="dashboard modern-dashboard">
      {/* SIDEBAR */}
      <aside className="sidebar modern-sidebar">
        <div className="brand modern-brand">
          <div className="brand-icon">RA</div>
          <div>
            <h2>Restaurant</h2>
            <span>Analytics</span>
          </div>
        </div>

        <nav className="modern-nav">
          <div className="nav-item active" onClick={() => scrollToSection("dashboard-top")}>
            <span className="nav-icon">⌂</span>
            <span>Dashboard</span>
          </div>
          <div className="nav-item" onClick={() => scrollToSection("orders-section")}>
            <span className="nav-icon">▣</span>
            <span>Orders</span>
          </div>
          <div className="nav-item" onClick={() => scrollToSection("restaurants-section")}>
            <span className="nav-icon">▤</span>
            <span>Restaurants</span>
          </div>
          <div className="nav-item" onClick={() => scrollToSection("performance-section")}>
            <span className="nav-icon">⌁</span>
            <span>Performance</span>
          </div>
        </nav>

        <div className="sidebar-footer modern-sidebar-footer">
          <div className="data-status">
            <span className="online-dot"></span>
            <div>
              <strong>Data Connected</strong>
              <small>PostgreSQL</small>
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN */}
      <main className="main-content modern-main">
        <header id="dashboard-top" className="modern-header">
          <div>
            <div className="breadcrumb">Analytics / Dashboard</div>
            <h1>Dashboard</h1>
            <p>Restaurant performance, revenue and customer order intelligence.</p>
          </div>

          <div className="header-actions">
            <div className="city-search">
              <span>⌕</span>
              <input placeholder="Search city..." aria-label="Search city" />
              <span className="search-clear">×</span>
            </div>
            <button className="header-icon-button" title="Notifications">♧</button>
            <div className="profile-chip">
              <div className="profile-avatar">RA</div>
              <div>
                <strong>Admin</strong>
                <small>Analytics</small>
              </div>
            </div>

            <button
              onClick={handleLogout}
              title="Logout"
              style={{
                border: "1px solid #e1e5eb",
                background: "#fff",
                color: "#12213f",
                borderRadius: 10,
                padding: "10px 13px",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              Logout
            </button>
          </div>
        </header>

        {/* HERO */}
        <section className="hero-banner">
          <div className="hero-copy">
            <span className="hero-kicker">RESTAURANT ORDER INTELLIGENCE</span>
            <h2>Turn every order into an insight.</h2>
            <p>
              Track delivery performance, revenue, restaurant rankings and order operations
              from one live PostgreSQL-powered dashboard.
            </p>
            <div className="hero-pills">
              <span>● Live Data</span>
              <span>✓ {number(kpi.delivered_orders)} Delivered</span>
              <span>★ {kpi.average_rating ?? "N/A"} Rating</span>
            </div>
          </div>
          <div className="hero-visual" aria-hidden="true">
            <div className="hero-orbit orbit-one"></div>
            <div className="hero-orbit orbit-two"></div>
            <div className="hero-phone">
              <div className="phone-top"></div>
              <div className="phone-chart"><i></i><i></i><i></i><i></i></div>
              <div className="phone-line"></div>
              <div className="phone-line short"></div>
            </div>
            <div className="hero-scooter">⌁</div>
          </div>
        </section>

        {/* OVERVIEW */}
        <section className="overview-section">
          <div className="section-title-row">
            <div>
              <h2>Overview</h2>
              <p>Overall operational snapshot</p>
            </div>
            <div className="segmented-control">
              <button
                className={overviewMode === "amount" ? "active" : ""}
                onClick={() => setOverviewMode("amount")}
              >
                Amount
              </button>
              <button
                className={overviewMode === "quantity" ? "active" : ""}
                onClick={() => setOverviewMode("quantity")}
              >
                Quantity
              </button>
            </div>
          </div>

          <div className="overview-grid">
            {overviewCards.map((card) => (
              <div className="overview-kpi" key={card.label}>
                <div className="kpi-icon">{card.icon}</div>
                <div><strong>{card.value}</strong><span>{card.label}</span></div>
                <em>{card.note}</em>
              </div>
            ))}
          </div>
        </section>

        {/* TOP RESTAURANTS + TREND */}
        <section className="feature-grid">
          <div id="restaurants-section" className="design-card ranking-card">
            <div className="card-heading">
              <div><h2>{rankingTitle}</h2><p>Highest contribution by {restaurantMetric === "revenue" ? "revenue" : "order volume"}</p></div>
              <div className="metric-toggle">
                <button className={restaurantMetric === "revenue" ? "active" : ""} onClick={() => setRestaurantMetric("revenue")}>Revenue</button>
                <button className={restaurantMetric === "orders" ? "active" : ""} onClick={() => setRestaurantMetric("orders")}>Orders</button>
              </div>
            </div>

            <div className="ranking-body">
              <div className="ranking-tabs">
                <button
                  className={rankingView === "top10" ? "active" : ""}
                  onClick={() => setRankingView("top10")}
                >
                  Top 10
                </button>
                <button
                  className={rankingView === "top5" ? "active" : ""}
                  onClick={() => setRankingView("top5")}
                >
                  Top 5
                </button>
                <button
                  className={rankingView === "all" ? "active" : ""}
                  onClick={() => setRankingView("all")}
                >
                  All
                </button>
              </div>
              <div className="ranking-chart">
                <ResponsiveContainer width="100%" height={Math.max(330, rankedRestaurants.length * 42)}>
                  <BarChart data={rankedRestaurants} layout="vertical" margin={{ top: 5, right: 35, left: 5, bottom: 5 }}>
                    <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                    <XAxis type="number" hide />
                    <YAxis
                      type="category"
                      dataKey="restaurant_name"
                      width={150}
                      tick={{ fontSize: 11 }}
                    />
                    <Tooltip
                      cursor={{ fill: "rgba(226,29,55,.05)" }}
                      formatter={(value) => [
                        restaurantMetric === "revenue" ? money(value) : number(value),
                        restaurantMetric === "revenue" ? "Revenue" : "Orders",
                      ]}
                    />
                    <Bar
                      dataKey="rankingValue"
                      fill="#e21d37"
                      radius={[0, 8, 8, 0]}
                      barSize={18}
                      cursor="pointer"
                      onClick={(data) => openRestaurant(data?.payload || data)}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="design-card trend-card">
            <div className="card-heading trend-card-heading">
              <div><h2>Daily Sales Trend</h2><p>Order volume throughout {selectedMonthLabel}</p></div>
              <label className="month-picker" title="Select month">
                <span>Month</span>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(event) => setSelectedMonth(event.target.value)}
                  aria-label="Select trend month"
                />
              </label>
            </div>
            {filteredTrend.length === 0 ? (
              <div className="trend-empty">No order data available for {selectedMonthLabel}.</div>
            ) : (
            <ResponsiveContainer width="100%" height={330}>
              <LineChart data={filteredTrend} margin={{ top: 15, right: 12, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="order_date" tickFormatter={shortDate} tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  labelFormatter={(value) => shortDate(value)}
                  formatter={(value) => [number(value), "Orders"]}
                />
                <Line type="monotone" dataKey="orders" stroke="#e21d37" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
            )}
          </div>
        </section>

        {/* RESTAURANT CARDS */}
        <section className="section-block">
          <div className="section-title-row compact">
            <div><h2>Restaurant Performance</h2><p>Click a restaurant card to open its complete profile</p></div>
            <button
              className="view-all-button"
              onClick={() => {
                setRankingView("all");
                setTimeout(() => scrollToSection("restaurants-section"), 0);
              }}
            >
              View rankings →
            </button>
          </div>
          <div className="restaurant-cards-grid">
            {topRestaurants.map((restaurant, index) => (
              <button className="restaurant-showcase" key={restaurant.restaurant_id || restaurant.restaurant_name} onClick={() => openRestaurant(restaurant)}>
                <div className="restaurant-cover">
                  <div className={`food-art food-art-${index + 1}`}>{index === 0 ? "🍛" : index === 1 ? "🍲" : "🍔"}</div>
                  <span className="rank-badge">#{index + 1}</span>
                </div>
                <div className="restaurant-showcase-body">
                  <div className="restaurant-showcase-title">
                    <strong>{restaurant.restaurant_name}</strong>
                    <span>→</span>
                  </div>
                  <div className="restaurant-stats-row">
                    <div><strong>{money(restaurant.revenue)}</strong><span>Revenue</span></div>
                    <div><strong>{number(restaurant.total_orders)}</strong><span>Orders</span></div>
                    <div><strong>★ {restaurant.average_rating ?? "—"}</strong><span>Rating</span></div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* ANALYTICS ROW */}
        <section id="performance-section" className="analytics-grid">
          <div className="design-card donut-card">
            <div className="card-heading"><div><h2>Order Health</h2><p>Delivered vs rejected orders</p></div></div>
            <div className="donut-content">
              <div className="donut-chart-wrap">
                <ResponsiveContainer width="100%" height={230}>
                  <PieChart>
                    <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={65} outerRadius={90} paddingAngle={3} stroke="none">
                      <Cell fill="#e21d37" />
                      <Cell fill="#f3b6bf" />
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="donut-center"><strong>{Number(kpi.total_orders) ? ((Number(kpi.delivered_orders || 0) / Number(kpi.total_orders)) * 100).toFixed(1) : "0.0"}%</strong><span>Success</span></div>
              </div>
              <div className="donut-legend">
                <div><span className="legend-dot delivered"></span><span>Delivered</span><strong>{number(kpi.delivered_orders)}</strong></div>
                <div><span className="legend-dot rejected"></span><span>Rejected</span><strong>{number(kpi.rejected_orders)}</strong></div>
                <div><span className="legend-dot revenue"></span><span>Revenue</span><strong>{money(kpi.revenue)}</strong></div>
              </div>
            </div>
          </div>

          <div className="design-card insight-card">
            <div className="card-heading"><div><h2>Performance Insights</h2><p>Signals calculated from your order data</p></div><span className="insight-icon">✦</span></div>
            <div className="insight-list">
              <div className="insight-item positive"><span>✓</span><div><strong>{Number(kpi.delivered_orders || 0).toLocaleString("en-IN")} successful deliveries</strong><small>Delivery success rate is {Number(kpi.total_orders) ? ((Number(kpi.delivered_orders || 0) / Number(kpi.total_orders)) * 100).toFixed(2) : "0.00"}%.</small></div></div>
              <div className="insight-item warning"><span>!</span><div><strong>{number(kpi.rejected_orders)} rejected orders</strong><small>Overall rejection rate is {Number(kpi.rejection_rate || 0).toFixed(2)}%.</small></div></div>
              <div className="insight-item neutral"><span>₹</span><div><strong>{money(kpi.average_order_value)} average order</strong><small>Calculated from delivered-order revenue.</small></div></div>
              <div className="insight-item accent"><span>★</span><div><strong>{restaurants[0]?.restaurant_name || "N/A"}</strong><small>Current top revenue restaurant.</small></div></div>
            </div>
          </div>
        </section>

        {/* ORDERS */}
        <section id="orders-section" className="design-card orders-card">
          <div className="card-heading order-heading">
            <div><h2>Recent Orders</h2><p>Search, filter and click any order for complete details</p></div>
            <div className="order-controls modern-order-controls">
              <div className="search-box modern-search-box"><span>⌕</span><input type="text" placeholder="Search order, restaurant or customer..." value={search} onChange={handleSearch} /></div>
              <select value={status} onChange={(event) => filterOrders(event.target.value)}>
                <option value="">All statuses</option>
                <option value="Delivered">Delivered</option>
                <option value="Rejected">Rejected</option>
                <option value="Returned">Returned</option>
                <option value="Timed out">Timed out</option>
              </select>
            </div>
          </div>

          <div className="results-info modern-results-info">Showing {firstOrder}–{lastOrder} of {totalOrders.toLocaleString("en-IN")} orders</div>

          {filterLoading ? (
            <div className="table-loading">Loading orders...</div>
          ) : orders.length === 0 ? (
            <div className="empty-state">No orders found.</div>
          ) : (
            <div className="table-wrapper modern-table-wrapper">
              <table>
                <thead><tr><th>Order ID</th><th>Restaurant</th><th>Status</th><th>Order Value</th><th>Rating</th><th>KPT</th><th>Rider Wait</th></tr></thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.order_id} onClick={() => openOrder(order)} title="Click to view order details">
                      <td><strong className="order-id-link">#{order.order_id}</strong></td>
                      <td>{order.restaurant_name}</td>
                      <td><StatusBadge status={order.order_status} /></td>
                      <td><strong>{money(order.total)}</strong></td>
                      <td><span className="rating">{order.rating ? `★ ${order.rating}` : "—"}</span></td>
                      <td>{order.kpt_duration ?? "—"}</td>
                      <td>{order.rider_wait_time ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="pagination modern-pagination">
            <button onClick={goToPreviousPage} disabled={page === 1 || filterLoading || totalOrders === 0}>← Previous</button>
            <span>Page <strong>{page}</strong> of <strong>{totalPages}</strong></span>
            <button onClick={goToNextPage} disabled={page >= totalPages || filterLoading || totalOrders === 0}>Next →</button>
          </div>
        </section>

        {error && <div className="empty-state">{error}</div>}

        <footer><span>Restaurant Order Analytics</span><span>Data source: PostgreSQL • Live</span></footer>
      </main>

      {selectedOrder && <OrderDetailModal order={selectedOrder} onClose={closeOrder} loading={orderLoading} onBill={() => setShowBill(true)} />}
      {showBill && selectedOrder && <BillModal order={selectedOrder} onClose={() => setShowBill(false)} />}
    </div>
  );
}
