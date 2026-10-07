const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

let pool = null;

function getPool() {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      console.warn('⚠️ WARNING: DATABASE_URL environment variable is not set. Database operations will fail.');
      return null;
    }

    const isLocal = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');

    pool = new Pool({
      connectionString,
      ssl: isLocal ? false : { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });

    pool.on('error', (err) => {
      console.error('Unexpected error on idle PostgreSQL client:', err);
    });
  }
  return pool;
}

// Helper to convert SQLite style '?' placeholders to PostgreSQL style '$1, $2, ...'
function formatSql(sql) {
  let paramIndex = 1;
  return sql.replace(/\?/g, () => `$${paramIndex++}`);
}

async function query(sql, params = []) {
  const currentPool = getPool();
  if (!currentPool) {
    throw new Error('DATABASE_URL is not set. Please provide PostgreSQL connection string in environment variables.');
  }
  await ensureDB();
  const formatted = formatSql(sql);
  return currentPool.query(formatted, params);
}

async function get(sql, params = []) {
  const res = await query(sql, params);
  return res.rows[0] || null;
}

async function all(sql, params = []) {
  const res = await query(sql, params);
  return res.rows;
}

async function run(sql, params = []) {
  const res = await query(sql, params);
  return {
    rowCount: res.rowCount,
    rows: res.rows,
  };
}

let initPromise = null;

async function runSchemaInit() {
  const currentPool = getPool();
  if (!currentPool) return;

  const client = await currentPool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        employee_id VARCHAR(50) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'employee' CHECK(role IN ('developer', 'admin', 'employee')),
        phone VARCHAR(50) DEFAULT '',
        status VARCHAR(50) DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
        previous_cl NUMERIC(5,2) DEFAULT 0.0,
        monthly_cl NUMERIC(5,2) DEFAULT 1.0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS attendance (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        date VARCHAR(10) NOT NULL,
        status VARCHAR(50) NOT NULL CHECK(status IN ('present', 'half_day', 'casual_leave', 'absent')),
        half_day_slot VARCHAR(50) CHECK(half_day_slot IN ('1st_half', '2nd_half', NULL)),
        check_in_time VARCHAR(50),
        check_out_time VARCHAR(50),
        work_mode VARCHAR(50) DEFAULT 'office' CHECK(work_mode IN ('office', 'remote')),
        notes TEXT DEFAULT '',
        marked_by VARCHAR(50) DEFAULT 'self',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, date)
      );

      CREATE TABLE IF NOT EXISTS holidays (
        id SERIAL PRIMARY KEY,
        date VARCHAR(10) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT DEFAULT ''
      );
    `);

    // Default Seed Data
    const salt = bcrypt.genSaltSync(10);
    const devPassword = bcrypt.hashSync('dev123', salt);
    const adminPassword = bcrypt.hashSync('admin123', salt);
    const userPassword = bcrypt.hashSync('user123', salt);

    // 1. Developer
    const devCheck = await client.query("SELECT id FROM users WHERE LOWER(email) = 'developer@portal.com'");
    if (devCheck.rowCount === 0) {
      await client.query(`
        INSERT INTO users (employee_id, name, email, password, role, phone, previous_cl, monthly_cl)
        VALUES ('DEV001', 'DEVELOPER LEAD', 'developer@portal.com', $1, 'developer', '+91 9998887770', 0.0, 1.0)
      `, [devPassword]);
    }

    // 2. Admin
    const adminCheck = await client.query("SELECT id FROM users WHERE LOWER(email) = 'admin@portal.com'");
    if (adminCheck.rowCount === 0) {
      await client.query(`
        INSERT INTO users (employee_id, name, email, password, role, phone, previous_cl, monthly_cl)
        VALUES ('EMP000', 'ADMIN USER', 'admin@portal.com', $1, 'admin', '+91 9876543210', 0.0, 1.0)
      `, [adminPassword]);
    }

    // 3. Demo Employee
    const empCheck = await client.query("SELECT id FROM users WHERE LOWER(email) = 'rahul@portal.com'");
    if (empCheck.rowCount === 0) {
      await client.query(`
        INSERT INTO users (employee_id, name, email, password, role, phone, previous_cl, monthly_cl)
        VALUES ('EMP001', 'RAHUL SHARMA', 'rahul@portal.com', $1, 'employee', '+91 9871122334', 0.0, 1.0)
      `, [userPassword]);
    }

    // 4. Seed Official 2026 Company Holidays
    const holidays2026 = [
      ['2026-01-01', 'New Year', 'Official Company Holiday'],
      ['2026-01-26', 'Republic Day', 'National Holiday'],
      ['2026-03-04', 'Holi', 'Festival of Colors'],
      ['2026-03-26', 'Ram Navami', 'Religious Holiday'],
      ['2026-04-03', 'Good Friday', 'Official Holiday'],
      ['2026-05-27', 'Bakra Eid', 'Eid-ul-Adha'],
      ['2026-10-02', "Mahatma Gandhi's Birthday", 'National Holiday'],
      ['2026-10-20', 'Dussehra', 'Vijayadashami'],
      ['2026-11-09', 'Diwali', 'Festival of Lights'],
      ['2026-12-25', 'Christmas Day', 'Christmas Celebration'],
    ];

    for (const [date, name, description] of holidays2026) {
      await client.query(`
        INSERT INTO holidays (date, name, description)
        VALUES ($1, $2, $3)
        ON CONFLICT (date) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description
      `, [date, name, description]);
    }

    console.log('✅ [POSTGRESQL] Schema and seed data successfully initialized.');
  } finally {
    client.release();
  }
}

function ensureDB() {
  if (!initPromise) {
    initPromise = runSchemaInit().catch((err) => {
      console.error('❌ Database initialization error:', err.message);
      initPromise = null; // Allow retry on next call
      throw err;
    });
  }
  return initPromise;
}

async function getUserClStats(userId, targetYear, targetMonth) {
  const user = await get('SELECT id, previous_cl, monthly_cl, created_at FROM users WHERE id = ?', [userId]);
  if (!user) {
    return {
      previous_cl: 0.0,
      monthly_cl: 1.0,
      total_available: 1.0,
      total_leaves_taken: 0.0,
      cl_adjusted: 0.0,
      excess_unpaid_leaves: 0.0,
      remaining_cl: 1.0,
      available_cl: 1.0,
      used_cl: 0.0,
    };
  }

  const now = new Date();
  const reqYear = targetYear ? parseInt(targetYear, 10) : now.getFullYear();
  const reqMonth = targetMonth ? parseInt(targetMonth, 10) : (now.getMonth() + 1);

  // Base starting previous_cl from user profile
  const basePreviousCl = user.previous_cl !== null && user.previous_cl !== undefined ? Number(user.previous_cl) : 0.0;
  const monthlyAllotment = user.monthly_cl !== null && user.monthly_cl !== undefined ? Number(user.monthly_cl) : 1.0;

  // Find the earliest month with attendance records or user creation
  const earliestRecord = await get('SELECT MIN(date) as min_date FROM attendance WHERE user_id = ?', [userId]);
  let startYear = reqYear;
  let startMonth = reqMonth;

  if (user.created_at) {
    const cParts = String(user.created_at).split(/[- :T]/);
    if (cParts.length >= 2) {
      const cYear = parseInt(cParts[0], 10);
      const cMonth = parseInt(cParts[1], 10);
      if (!isNaN(cYear) && !isNaN(cMonth)) {
        if (cYear < startYear || (cYear === startYear && cMonth < startMonth)) {
          startYear = cYear;
          startMonth = cMonth;
        }
      }
    }
  }

  if (earliestRecord && earliestRecord.min_date) {
    const parts = earliestRecord.min_date.split('-');
    const rYear = parseInt(parts[0], 10);
    const rMonth = parseInt(parts[1], 10);
    if (rYear < startYear || (rYear === startYear && rMonth < startMonth)) {
      startYear = rYear;
      startMonth = rMonth;
    }
  }

  // Get all leaves grouped by YYYY-MM for this user
  const monthlyLeavesRows = await all(`
    SELECT 
      SUBSTR(date, 1, 7) as year_month,
      COALESCE(SUM(CASE 
        WHEN status = 'absent' THEN 1.0 
        WHEN status = 'casual_leave' THEN 1.0 
        WHEN status = 'half_day' THEN 0.5
        ELSE 0 
      END), 0.0) as leaves_count
    FROM attendance
    WHERE user_id = ?
    GROUP BY SUBSTR(date, 1, 7)
  `, [userId]);

  const leavesByMonth = {};
  monthlyLeavesRows.forEach(row => {
    leavesByMonth[row.year_month] = Number(row.leaves_count);
  });

  // Roll forward month by month from startYear/startMonth to reqYear/reqMonth
  let runningPreviousCl = basePreviousCl;
  let curY = startYear;
  let curM = startMonth;

  let resultPreviousCl = basePreviousCl;
  let resultMonthlyCl = monthlyAllotment;
  let resultTotalAvailable = Math.round((runningPreviousCl + resultMonthlyCl) * 10) / 10;
  let resultLeavesTaken = 0.0;
  let resultClAdjusted = 0.0;
  let resultExcessUnpaid = 0.0;
  let resultRemainingCl = resultTotalAvailable;

  while (curY < reqYear || (curY === reqYear && curM <= reqMonth)) {
    const ymKey = `${curY}-${String(curM).padStart(2, '0')}`;
    const leavesInMonth = leavesByMonth[ymKey] || 0.0;
    const totalAvail = Math.round((runningPreviousCl + monthlyAllotment) * 10) / 10;
    const clAdj = Math.round(Math.min(totalAvail, leavesInMonth) * 10) / 10;
    const excessUnpaid = Math.round(Math.max(0, leavesInMonth - totalAvail) * 10) / 10;
    const remCl = Math.round(Math.max(0, totalAvail - clAdj) * 10) / 10;

    if (curY === reqYear && curM === reqMonth) {
      resultPreviousCl = Math.round(runningPreviousCl * 10) / 10;
      resultMonthlyCl = Math.round(monthlyAllotment * 10) / 10;
      resultTotalAvailable = totalAvail;
      resultLeavesTaken = Math.round(leavesInMonth * 10) / 10;
      resultClAdjusted = clAdj;
      resultExcessUnpaid = excessUnpaid;
      resultRemainingCl = remCl;
      break;
    }

    runningPreviousCl = remCl;

    curM++;
    if (curM > 12) {
      curM = 1;
      curY++;
    }
  }

  return {
    previous_cl: resultPreviousCl,
    monthly_cl: resultMonthlyCl,
    total_available: resultTotalAvailable,
    total_leaves_taken: resultLeavesTaken,
    cl_adjusted: resultClAdjusted,
    excess_unpaid_leaves: resultExcessUnpaid,
    remaining_cl: resultRemainingCl,
    available_cl: resultRemainingCl,
    used_cl: resultClAdjusted,
  };
}

module.exports = {
  getPool,
  query,
  get,
  all,
  run,
  ensureDB,
  getUserClStats,
};
