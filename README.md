# Zomato Order Analytics Dashboard

## Purpose
A full-stack restaurant operations dashboard built from the three provided June 2026 order-history CSV files.

## Modules
1. Data preprocessing and merging
2. PostgreSQL database
3. Node.js/Express REST API
4. Dashboard KPI analytics
5. Daily order trends
6. Restaurant performance
7. Order filtering
8. Operational order table

## Business logic / algorithms
- Revenue = SUM(total) for Delivered orders.
- AOV = Delivered revenue / Delivered orders.
- Rejection rate = Rejected orders / All orders * 100.
- Restaurant ranking = aggregate delivered revenue by restaurant and sort descending.
- Daily trend = GROUP BY order date and COUNT orders.

## Setup
### PostgreSQL
Create database `zomato_analytics`, then run `backend/schema.sql`.

### Backend
1. `cd backend`
2. `npm install`
3. Copy `.env.example` to `.env` and enter your PostgreSQL password.
4. `npm run import`
5. `npm run dev`

### Frontend
1. `cd frontend`
2. `npm install`
3. `npm run dev`

The code intentionally contains section comments so each module can be located and explained during an interview.
