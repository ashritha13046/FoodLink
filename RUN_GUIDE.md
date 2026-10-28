# ▶️ FoodLink – Run Guide

## 1. Install the tools (one time)
- **Node.js 18+** → https://nodejs.org (check: `node -v`)
- **MySQL 8+** → make sure the MySQL server is **running** (Windows: Services → MySQL80 → Start; Mac: `brew services start mysql`; Linux: `sudo systemctl start mysql`)

## 2. Configure the backend
```bash
cd FoodLink/backend
cp .env.example .env          # Windows CMD: copy .env.example .env
```
Open `.env` and set your own MySQL password:
```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=foodlink
JWT_SECRET=any_long_random_string
PORT=5000
```

## 3. Start the backend (Terminal 1)
```bash
cd FoodLink/backend
npm install
npm start
```
✅ Success looks like:
```
✅ Database initialized successfully
🚀 FoodLink server running on port 5000
```
Quick check: open http://localhost:5000/api/health → `{"status":"ok", ...}`

## 4. Start the frontend (Terminal 2)
```bash
cd FoodLink/frontend
npm install
npm run dev
```
Open **http://localhost:3000**

> Keep BOTH terminals running. The frontend forwards `/api` calls to the backend on port 5000.

## 5. Try it out
1. **Donor:** Sign up → choose *Food Donor* → fill city, state, pincode → log in → **Add Food** (expiry must be in the future) → check **My Listings**.
2. **NGO:** open an incognito window → Sign up → choose *NGO* (use the **same city / state / pincode** as the donor) → **Browse Food** → **Request Food**.
3. Back as donor: **My Listings → Requests** to see the NGO's request. Both can view **Transactions**.

## 6. Stop / restart
- Stop a server: `Ctrl + C` in its terminal.
- After editing backend code: stop and run `npm start` again (or use `npm run dev` for auto-restart).
- Reset all data: in MySQL run `DROP DATABASE foodlink;` then restart the backend (tables are recreated).

---

## 🛠️ Troubleshooting

| Problem | Cause / Fix |
|---------|-------------|
| `Failed to init DB: ER_ACCESS_DENIED_ERROR` | Wrong `DB_USER` / `DB_PASSWORD` in `backend/.env`. |
| `ECONNREFUSED 127.0.0.1:3306` | MySQL isn't running. Start the MySQL service. |
| `Server error during login/signup` | Look at the **backend terminal** — the real error is printed there. (Old cause "No database selected" is fixed in `db/database.js`.) |
| Can't log in with an account made before the update | Emails are now stored lowercase. Re-create the account or `DELETE FROM Users;`. |
| Listing created but not visible to NGO | (a) expiry is in the past, (b) old listings saved with wrong timezone — create a new one, (c) NGO has **Near me** on but that only re-orders, so also check the **Veg/Non-Veg** filter and search box are cleared, (d) press **Refresh**. |
| Donor can't see NGO pages (or vice-versa) | Expected — pages are role-restricted. |
| Frontend shows network error / 404 on `/api` | Backend isn't running on port 5000, or you changed `PORT` without updating `frontend/vite.config.js`. |
| `Port 3000/5000 already in use` | Close the other app, or change the port (`PORT` in `.env`; `server.port` in `vite.config.js`). |
| `npm install` fails | Check Node version (`node -v` ≥ 18); delete `node_modules` + `package-lock.json` and retry. |
| Stuck/odd login state | Browser DevTools → Application → Local Storage → delete `fl_token` and `fl_user`, then reload. |

## Useful MySQL checks
```sql
USE foodlink;
SELECT user_id, name, email, role, city_id FROM Users;
SELECT food_id, food_name, status, expiry_time, NOW() AS db_now FROM Food_Listings;
```
(`expiry_time` must be later than `db_now` for a listing to show up for NGOs.)
