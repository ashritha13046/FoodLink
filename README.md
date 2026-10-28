# 🌿 FoodLink – Food Redistribution System

A full-stack web app that connects **food donors** with **NGOs** to reduce food waste.
Built with **React (Vite) + Tailwind CSS**, **Node.js / Express**, and **MySQL** (3NF schema, row-level locking, JWT auth, role-based access).

> New here? Read **[RUN_GUIDE.md](RUN_GUIDE.md)** for the step-by-step run instructions and troubleshooting.

---

## Features
- Donor and NGO signup / login (JWT, bcrypt-hashed passwords)
- **Donors:** add food listings, see their listings and the NGO requests on each
- **NGOs:** browse listings sorted by priority, request a quantity, cancel requests
- **Priority ranking:** expiring within 5 hours → same pincode → same city → same state
- **Concurrency safe:** `SELECT … FOR UPDATE` inside a transaction prevents double allocation
- **Partial allocation:** if an NGO asks for more than what is left, it receives the remainder
- Dashboards with statistics and a full transaction history

---

## Project Structure

```
FoodLink/
├── backend/
│   ├── db/database.js          # MySQL pool + auto-creates DB and tables
│   ├── middleware/auth.js      # JWT authenticate + requireRole
│   ├── routes/
│   │   ├── auth.js             # /api/auth      signup, login
│   │   ├── food.js             # /api/food      listings
│   │   ├── requests.js         # /api/requests  NGO requests (with locking)
│   │   ├── transactions.js     # /api/transactions  history + stats
│   │   └── cities.js           # /api/cities
│   ├── server.js               # Express entry point
│   ├── .env.example            # copy to .env
│   └── package.json
└── frontend/
    ├── src/
    │   ├── context/AuthContext.jsx   # auth state + axios instance
    │   ├── components/               # Navbar, FoodCard, RequestModal, StatCard
    │   ├── pages/                    # Login, Signup, Dashboard, AddFood,
    │   │                             # MyListings, BrowseFood, MyRequests, Transactions
    │   └── utils/helpers.js
    ├── vite.config.js                # dev server :3000, proxies /api → :5000
    └── package.json
```

---

## Quick Start

**Prerequisites:** Node.js 18+, MySQL 8+, npm 9+

```bash
# 1) Backend
cd backend
cp .env.example .env        # Windows: copy .env.example .env
# edit .env → set DB_PASSWORD to your MySQL root password
npm install
npm start                   # http://localhost:5000

# 2) Frontend (new terminal)
cd frontend
npm install
npm run dev                 # http://localhost:3000
```

The backend creates the `foodlink` database and all tables automatically on first start — no manual SQL needed.
Open **http://localhost:3000** and sign up.

---

## Environment Variables (`backend/.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `DB_HOST` | `localhost` | MySQL host |
| `DB_USER` | `root` | MySQL user |
| `DB_PASSWORD` | *(empty)* | MySQL password |
| `DB_NAME` | `foodlink` | Database name (created automatically) |
| `JWT_SECRET` | *(dev default)* | Secret used to sign login tokens — **change it** |
| `PORT` | `5000` | Backend port |

⚠️ Never commit your real `.env`. Rename `.gitignore.txt` to `.gitignore` so `.env` and `node_modules/` are ignored.

---

## Database Schema (3NF)

```sql
Cities(city_id PK, city_name UNIQUE)

Users(user_id PK, name, email UNIQUE, password, role ENUM('donor','ngo'),
      city_id FK→Cities, state, pincode, contact, created_at)

Food_Listings(food_id PK, donor_id FK→Users, food_name, food_type, is_veg,
              total_quantity, remaining_quantity, unit, expiry_time,
              city_id FK→Cities, state, pincode,
              status ENUM('available','partially_allocated','fully_allocated','expired'),
              description, created_at)

Requests(request_id PK, food_id FK→Food_Listings, ngo_id FK→Users,
         requested_quantity, allocated_quantity,
         status ENUM('pending','approved','partially_approved','rejected','cancelled'),
         request_time, updated_at)

Transactions(transaction_id PK, food_id FK, donor_id FK, ngo_id FK,
             allocated_quantity, completed_at)
```

**Time handling:** all DATETIME values are stored and compared in **UTC**. The frontend sends expiry as an ISO (UTC) timestamp and displays it in the viewer's local time.

---

## Priority Algorithm (NGO Browse)

| Score | Condition | Label |
|-------|-----------|-------|
| 4 | Expires within 5 hours | 🔴 Expiring Soon |
| 3 | Same pincode as NGO | 📍 Near You |
| 2 | Same city | 🏙️ Same City |
| 1 | Same state | 🗺️ Same State |
| 0 | Anything else | — |

Only listings that are `available` / `partially_allocated` **and not yet expired** are shown.
Turn off the **"Near me"** toggle on the Browse page to ignore location scoring.

---

## Concurrency Control

`POST /api/requests` runs in a transaction and locks the listing row with `SELECT … FOR UPDATE`, so two NGOs can never allocate the same quantity. Status moves `available → partially_allocated → fully_allocated`.

---

## API Reference

| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| POST | `/api/auth/signup` | – | – | Register |
| POST | `/api/auth/login` | – | – | Login |
| GET | `/api/health` | – | – | Health check |
| GET | `/api/cities` | – | – | City list |
| GET | `/api/food` | ✓ | any | Available listings (priority sorted) |
| POST | `/api/food` | ✓ | donor | Create listing |
| GET | `/api/food/my` | ✓ | donor | My listings |
| GET | `/api/food/:id` | ✓ | any | Single listing |
| PATCH | `/api/food/:id/status` | ✓ | donor | Update listing status |
| POST | `/api/requests` | ✓ | ngo | Request food (locked, atomic) |
| GET | `/api/requests/my` | ✓ | ngo | My requests |
| GET | `/api/requests/food/:id` | ✓ | donor | Requests on one listing |
| GET | `/api/requests/donor-requests` | ✓ | donor | All requests on my listings |
| PATCH | `/api/requests/:id/cancel` | ✓ | ngo | Cancel a request |
| GET | `/api/transactions` | ✓ | any | Transaction history |
| GET | `/api/transactions/stats` | ✓ | any | Dashboard stats |

---

## Production Notes
1. Set a strong `JWT_SECRET`.
2. `cd frontend && npm run build`, then serve `frontend/dist/` with nginx or Express static.
3. Run the backend with PM2 (or similar).
4. Use a dedicated MySQL user instead of `root`, and enable SSL.
