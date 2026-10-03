const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const dbPath = process.env.DB_PATH || path.join(__dirname, 'expense_management.sqlite');
const dbDir = path.dirname(dbPath);

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Failed to connect to SQLite database:', err.message);
  } else {
    console.log('Connected to SQLite database at:', dbPath);
  }
});

// Promisified database methods for async/await usage
db.runAsync = function (sql, params = []) {
  return new Promise((resolve, reject) => {
    this.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
};

db.getAsync = function (sql, params = []) {
  return new Promise((resolve, reject) => {
    this.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

db.allAsync = function (sql, params = []) {
  return new Promise((resolve, reject) => {
    this.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

async function initDatabase() {
  await db.runAsync('PRAGMA foreign_keys = ON;');

  // Users Table
  await db.runAsync(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Categories Table
  await db.runAsync(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      icon TEXT,
      color TEXT,
      user_id INTEGER,
      is_system INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Expenses Table
  await db.runAsync(`
    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      category_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      amount REAL NOT NULL,
      date TEXT NOT NULL,
      payment_method TEXT NOT NULL,
      description TEXT,
      receipt_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
    )
  `);

  // Income Table
  await db.runAsync(`
    CREATE TABLE IF NOT EXISTS income (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      source TEXT NOT NULL,
      amount REAL NOT NULL,
      date TEXT NOT NULL,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Budgets Table
  await db.runAsync(`
    CREATE TABLE IF NOT EXISTS budgets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      month TEXT NOT NULL,
      amount REAL NOT NULL,
      category_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
      UNIQUE(user_id, month, category_id)
    )
  `);

  await seedDatabase();
}

async function seedDatabase() {
  const userCount = await db.getAsync('SELECT COUNT(*) as count FROM users');
  if (userCount && userCount.count > 0) {
    return;
  }

  console.log('Seeding initial data...');

  const hashedAdminPassword = await bcrypt.hash('Admin@123', 10);
  const hashedUserPassword = await bcrypt.hash('User@123', 10);

  // 1. Create Admin
  const adminResult = await db.runAsync(
    `INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)`,
    ['Admin User', 'admin@expense.com', hashedAdminPassword, 'admin']
  );

  // 2. Create Demo User
  const demoResult = await db.runAsync(
    `INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)`,
    ['Rahul Sharma', 'demo@expense.com', hashedUserPassword, 'user']
  );
  const demoUserId = demoResult.lastID;

  // 3. Create System Categories
  const categoriesList = [
    { name: 'Food', icon: 'Utensils', color: '#10B981' },
    { name: 'Travel', icon: 'Plane', color: '#0EA5E9' },
    { name: 'Shopping', icon: 'ShoppingBag', color: '#8B5CF6' },
    { name: 'Education', icon: 'GraduationCap', color: '#F59E0B' },
    { name: 'Bills', icon: 'Receipt', color: '#EF4444' },
    { name: 'Healthcare', icon: 'HeartPulse', color: '#EC4899' },
    { name: 'Entertainment', icon: 'Film', color: '#6366F1' },
    { name: 'Rent', icon: 'Home', color: '#14B8A6' },
    { name: 'Other', icon: 'Package', color: '#6B7280' }
  ];

  const catMap = {};
  for (const cat of categoriesList) {
    const res = await db.runAsync(
      `INSERT INTO categories (name, icon, color, is_system) VALUES (?, ?, ?, 1)`,
      [cat.name, cat.icon, cat.color]
    );
    catMap[cat.name] = res.lastID;
  }

  // 4. Create Current and Past Dates for dynamic realism
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonthNum = now.getMonth() + 1;
  const currentMonthStr = `${currentYear}-${String(currentMonthNum).padStart(2, '0')}`;

  const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonthStr = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}`;

  const twoMonthsAgoDate = new Date(now.getFullYear(), now.getMonth() - 2, 1);
  const twoMonthsAgoStr = `${twoMonthsAgoDate.getFullYear()}-${String(twoMonthsAgoDate.getMonth() + 1).padStart(2, '0')}`;

  const formatDate = (yearMonth, day) => `${yearMonth}-${String(day).padStart(2, '0')}`;

  // 5. Seed Budgets for Demo User
  await db.runAsync(
    `INSERT INTO budgets (user_id, month, amount, category_id) VALUES (?, ?, ?, NULL)`,
    [demoUserId, currentMonthStr, 45000]
  );
  await db.runAsync(
    `INSERT INTO budgets (user_id, month, amount, category_id) VALUES (?, ?, ?, NULL)`,
    [demoUserId, prevMonthStr, 42000]
  );
  await db.runAsync(
    `INSERT INTO budgets (user_id, month, amount, category_id) VALUES (?, ?, ?, NULL)`,
    [demoUserId, twoMonthsAgoStr, 40000]
  );

  // Category specific budget targets for current month
  await db.runAsync(
    `INSERT INTO budgets (user_id, month, amount, category_id) VALUES (?, ?, ?, ?)`,
    [demoUserId, currentMonthStr, 8000, catMap['Food']]
  );
  await db.runAsync(
    `INSERT INTO budgets (user_id, month, amount, category_id) VALUES (?, ?, ?, ?)`,
    [demoUserId, currentMonthStr, 5000, catMap['Travel']]
  );
  await db.runAsync(
    `INSERT INTO budgets (user_id, month, amount, category_id) VALUES (?, ?, ?, ?)`,
    [demoUserId, currentMonthStr, 15000, catMap['Rent']]
  );

  // 6. Seed Incomes for Demo User
  const demoIncomes = [
    { source: 'Salary', amount: 65000, date: formatDate(currentMonthStr, 1), desc: 'Monthly Tech Software Engineer Salary' },
    { source: 'Freelance', amount: 18000, date: formatDate(currentMonthStr, 10), desc: 'Frontend Web Consulting Project' },
    { source: 'Investments', amount: 4500, date: formatDate(currentMonthStr, 15), desc: 'Mutual Fund & Stock Dividends' },
    
    { source: 'Salary', amount: 65000, date: formatDate(prevMonthStr, 1), desc: 'Monthly Tech Software Engineer Salary' },
    { source: 'Freelance', amount: 12000, date: formatDate(prevMonthStr, 12), desc: 'API Design consulting' },
    
    { source: 'Salary', amount: 65000, date: formatDate(twoMonthsAgoStr, 1), desc: 'Monthly Tech Software Engineer Salary' },
    { source: 'Bonus', amount: 15000, date: formatDate(twoMonthsAgoStr, 20), desc: 'Performance Quarterly Bonus' },
  ];

  for (const inc of demoIncomes) {
    await db.runAsync(
      `INSERT INTO income (user_id, source, amount, date, description) VALUES (?, ?, ?, ?, ?)`,
      [demoUserId, inc.source, inc.amount, inc.date, inc.desc]
    );
  }

  // 7. Seed Expenses for Demo User (with realistic Indian Rupee values)
  const demoExpenses = [
    // Current Month
    { title: 'Apartment Monthly Rent', category: 'Rent', amount: 15000, date: formatDate(currentMonthStr, 2), method: 'Net Banking', desc: 'Flat rent payment to landlord' },
    { title: 'Supermarket Grocery Run', category: 'Food', amount: 2500, date: formatDate(currentMonthStr, 3), method: 'UPI', desc: 'Vegetables, milk, pulses and snacks' },
    { title: 'Metro Smart Card Recharge', category: 'Travel', amount: 1800, date: formatDate(currentMonthStr, 5), method: 'UPI', desc: 'Monthly transit recharge' },
    { title: 'Online Course & Books', category: 'Education', amount: 4000, date: formatDate(currentMonthStr, 6), method: 'Credit Card', desc: 'Fullstack Systems Certification course' },
    { title: 'Weekend Dinner with Friends', category: 'Food', amount: 1850, date: formatDate(currentMonthStr, 8), method: 'Credit Card', desc: 'Barbeque Nation buffet' },
    { title: 'Electricity & Water Bill', category: 'Bills', amount: 2100, date: formatDate(currentMonthStr, 10), method: 'UPI', desc: 'State electricity board utility bill' },
    { title: 'Festival Clothes Shopping', category: 'Shopping', amount: 3200, date: formatDate(currentMonthStr, 12), method: 'Credit Card', desc: 'Myntra apparel order' },
    { title: 'Pharmacy & Health Checkup', category: 'Healthcare', amount: 1500, date: formatDate(currentMonthStr, 14), method: 'Debit Card', desc: 'Routine vitamins and diagnostics' },
    { title: 'Movie Night & Snacks', category: 'Entertainment', amount: 950, date: formatDate(currentMonthStr, 16), method: 'UPI', desc: 'PVR cinema tickets and popcorn' },
    { title: 'High-speed Fiber Broadband', category: 'Bills', amount: 1199, date: formatDate(currentMonthStr, 18), method: 'Net Banking', desc: 'Airtel Xstream 200Mbps' },
    { title: 'Weekly Cafe Work Sessions', category: 'Food', amount: 1200, date: formatDate(currentMonthStr, 20), method: 'UPI', desc: 'Third Wave Coffee' },
    { title: 'Cab to Airport & Back', category: 'Travel', amount: 1450, date: formatDate(currentMonthStr, 22), method: 'UPI', desc: 'Uber Premier ride' },
    { title: 'Ergonomic Mouse & Accessories', category: 'Shopping', amount: 2200, date: formatDate(currentMonthStr, 24), method: 'Debit Card', desc: 'Amazon electronics sale' },

    // Previous Month
    { title: 'Apartment Monthly Rent', category: 'Rent', amount: 15000, date: formatDate(prevMonthStr, 2), method: 'Net Banking', desc: 'Flat rent' },
    { title: 'Groceries & Provisions', category: 'Food', amount: 4200, date: formatDate(prevMonthStr, 4), method: 'UPI', desc: 'Monthly staples' },
    { title: 'Electricity Bill', category: 'Bills', amount: 1950, date: formatDate(prevMonthStr, 9), method: 'UPI', desc: 'Utility bill' },
    { title: 'Train Tickets for Family Visit', category: 'Travel', amount: 3100, date: formatDate(prevMonthStr, 14), method: 'Net Banking', desc: 'IRCTC booking' },
    { title: 'Books and Learning Materials', category: 'Education', amount: 2400, date: formatDate(prevMonthStr, 18), method: 'Credit Card', desc: 'System design books' },
    { title: 'Dining Out', category: 'Food', amount: 1600, date: formatDate(prevMonthStr, 22), method: 'Credit Card', desc: 'Dinner outing' },
    { title: 'Streaming Subscriptions', category: 'Entertainment', amount: 1100, date: formatDate(prevMonthStr, 26), method: 'Credit Card', desc: 'Netflix & Spotify family' },

    // Two Months Ago
    { title: 'Apartment Monthly Rent', category: 'Rent', amount: 15000, date: formatDate(twoMonthsAgoStr, 2), method: 'Net Banking', desc: 'Flat rent' },
    { title: 'Supermarket Groceries', category: 'Food', amount: 3800, date: formatDate(twoMonthsAgoStr, 5), method: 'UPI', desc: 'Household groceries' },
    { title: 'Travel & Commute', category: 'Travel', amount: 2200, date: formatDate(twoMonthsAgoStr, 11), method: 'UPI', desc: 'Fuel and cab fares' },
    { title: 'Doctor Consultation', category: 'Healthcare', amount: 1200, date: formatDate(twoMonthsAgoStr, 15), method: 'Cash', desc: 'Dental cleanup' },
    { title: 'Clothing & Footwear', category: 'Shopping', amount: 2800, date: formatDate(twoMonthsAgoStr, 20), method: 'Credit Card', desc: 'Sneakers & casuals' },
  ];

  for (const exp of demoExpenses) {
    const catId = catMap[exp.category] || catMap['Other'];
    await db.runAsync(
      `INSERT INTO expenses (user_id, category_id, title, amount, date, payment_method, description)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [demoUserId, catId, exp.title, exp.amount, exp.date, exp.method, exp.desc]
    );
  }

  console.log('Seeding completed successfully!');
}

module.exports = {
  db,
  initDatabase
};
