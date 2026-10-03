# 💰 FinTrack Pro — Expense Management System

A full-stack, production-style **Expense & Budget Management System** built with React, Node.js, Express, and SQLite.

![Tech Stack](https://img.shields.io/badge/React-18-61DAFB?logo=react) ![Node.js](https://img.shields.io/badge/Node.js-Express-339933?logo=node.js) ![SQLite](https://img.shields.io/badge/Database-SQLite-003B57?logo=sqlite) ![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3-06B6D4?logo=tailwindcss)

---

## ✨ Features

### User Features
- 🔐 Secure JWT Authentication (Register / Login / Logout)
- 📊 Interactive Dashboard with KPI cards & Charts
- 💸 Full Expense CRUD (Add, Edit, Delete, Search, Filter)
- 💰 Income Management
- 📅 Monthly Budget Tracking with alerts (80% warning / 100% overspend)
- 📈 Financial Reports (Daily / Weekly / Monthly / Custom)
- 📤 Export Reports as **PDF** and **CSV**
- 🏷️ Category Management with custom colors
- 🧾 Receipt Upload & Preview
- 🌑 Black + Teal modern dark theme

### Admin Features
- 🛡️ Admin Dashboard with platform-wide statistics
- 👥 User Directory with cascade delete
- 🔍 System-wide Expense Audit
- 📊 Analytics & Category Management

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, Tailwind CSS, Recharts |
| Backend | Node.js, Express.js |
| Database | SQLite (via better-sqlite3) |
| Auth | JWT + bcrypt |
| PDF Export | jsPDF + autoTable |
| Icons | Lucide React |

---

## 🚀 Getting Started

### Prerequisites
- Node.js v18+
- npm v9+

### 1. Clone the repository
```bash
git clone https://github.com/YOUR_USERNAME/fintrack-pro.git
cd fintrack-pro
```

### 2. Setup Backend
```bash
cd backend
npm install
cp .env.example .env       # Edit .env with your settings
npm run dev                # Starts on http://localhost:5000
```

### 3. Setup Frontend
```bash
cd frontend
npm install
npm run dev                # Starts on http://localhost:5173
```

### 4. Open in Browser
Visit **http://localhost:5173**

---

## 🔑 Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| **User** | `demo@expense.com` | `User@123` |
| **Admin** | `admin@expense.com` | `Admin@123` |

> Use the **1-Click Demo Login** buttons on the login page.

---

## ⚙️ Environment Variables

Copy `.env.example` to `.env` in the `backend/` folder:

```env
PORT=5000
JWT_SECRET=your_super_secret_jwt_key_here
DB_PATH=./src/db/expense_management.sqlite
NODE_ENV=development
```

Frontend `.env` (optional):
```env
VITE_API_URL=http://localhost:5000/api
```

---

## 📁 Project Structure

```
fintrack-pro/
├── backend/
│   ├── src/
│   │   ├── db/           # SQLite database & schema
│   │   ├── middleware/   # JWT auth middleware
│   │   ├── routes/       # API route handlers
│   │   └── server.js     # Express entry point
│   ├── .env.example
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/   # Reusable UI components
│   │   ├── context/      # Auth, Theme, Toast contexts
│   │   ├── pages/        # Page components
│   │   └── services/     # API client
│   ├── index.html
│   └── package.json
├── .gitignore
└── README.md
```

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register user |
| POST | `/api/auth/login` | Login |
| GET | `/api/expenses` | Get expenses |
| POST | `/api/expenses` | Add expense |
| PUT | `/api/expenses/:id` | Edit expense |
| DELETE | `/api/expenses/:id` | Delete expense |
| GET | `/api/income` | Get income |
| POST | `/api/income` | Add income |
| GET | `/api/budget` | Get budget |
| POST | `/api/budget` | Set budget |
| GET | `/api/reports/summary` | Get report |
| GET | `/api/admin/users` | Admin: all users |
| GET | `/api/admin/statistics` | Admin: platform stats |

---

## 📸 Screenshots

> Login → Dashboard → Expenses → Budget → Reports

---

## 📄 License

MIT License — free to use for educational and personal projects.
