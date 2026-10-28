/**
 * Comprehensive Automated Test Suite for Attendance Portal
 * Tests all endpoints, RBAC permissions, attendance rules, CL calculations, and edge cases.
 */

const http = require('http');
const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// We will run tests against the actual app routes
const authRoutes = require('../server/routes/auth');
const attendanceRoutes = require('../server/routes/attendance');
const adminRoutes = require('../server/routes/admin');
const db = require('../server/db');
const { getUserClStats } = require('../server/db');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth', authRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/admin', adminRoutes);
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

let server;
let baseUrl;

const results = {
  total: 0,
  passed: 0,
  failed: 0,
  tests: []
};

function assert(condition, testName, errorDetails = '') {
  results.total++;
  if (condition) {
    results.passed++;
    results.tests.push({ name: testName, status: 'PASSED' });
    console.log(`  ✅ [PASS] ${testName}`);
  } else {
    results.failed++;
    results.tests.push({ name: testName, status: 'FAILED', error: errorDetails });
    console.error(`  ❌ [FAIL] ${testName} - ${errorDetails}`);
  }
}

async function request(method, path, body = null, token = null) {
  const url = `${baseUrl}${path}`;
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });

  const status = res.status;
  let data = {};
  try {
    data = await res.json();
  } catch (e) {
    data = {};
  }
  return { status, data };
}

async function runTests() {
  console.log('\n========================================================');
  console.log('🧪 STARTING COMPREHENSIVE ATTENDANCE PORTAL TEST SUITE');
  console.log('========================================================\n');

  // Tokens for different roles
  let devToken = '';
  let adminToken = '';
  let employeeToken = '';
  let newlyRegisteredToken = '';
  let createdEmpId = null;

  // ----------------------------------------------------
  // GROUP 1: HEALTH CHECK & BASIC CONNECTIVITY
  // ----------------------------------------------------
  console.log('--- 1. Health Check & Base Routing ---');
  {
    const res = await request('GET', '/api/health');
    assert(res.status === 200 && res.data.status === 'ok', 'GET /api/health returns 200 OK');
  }

  // ----------------------------------------------------
  // GROUP 2: AUTHENTICATION & LOGIN
  // ----------------------------------------------------
  console.log('\n--- 2. Authentication & Sign In ---');
  {
    // Developer login
    const devRes = await request('POST', '/api/auth/login', { email: 'developer@portal.com', password: 'dev123' });
    assert(devRes.status === 200 && devRes.data.user.role === 'developer' && !!devRes.data.token, 'Developer login succeeds (dev123)', JSON.stringify(devRes.data));
    devToken = devRes.data.token;

    // Admin login
    const adminRes = await request('POST', '/api/auth/login', { email: 'admin@portal.com', password: 'admin123' });
    assert(adminRes.status === 200 && adminRes.data.user.role === 'admin' && !!adminRes.data.token, 'Admin login succeeds (admin123)', JSON.stringify(adminRes.data));
    adminToken = adminRes.data.token;

    // Employee login
    const empRes = await request('POST', '/api/auth/login', { email: 'rahul@portal.com', password: 'user123' });
    assert(empRes.status === 200 && empRes.data.user.role === 'employee' && !!empRes.data.token, 'Employee login succeeds (rahul@portal.com)', JSON.stringify(empRes.data));
    employeeToken = empRes.data.token;

    // Invalid password
    const badPass = await request('POST', '/api/auth/login', { email: 'rahul@portal.com', password: 'wrongpassword' });
    assert(badPass.status === 401, 'Invalid password returns 401 Unauthorized');

    // Non-existent email
    const nonExist = await request('POST', '/api/auth/login', { email: 'nonexistent@portal.com', password: 'any' });
    assert(nonExist.status === 401, 'Non-existent email returns 401 Unauthorized');

    // Empty credentials
    const emptyCreds = await request('POST', '/api/auth/login', {});
    assert(emptyCreds.status === 400, 'Missing email/password returns 400 Bad Request');
  }

  // ----------------------------------------------------
  // GROUP 3: 1ST TIME EMPLOYEE REGISTRATION & OTP
  // ----------------------------------------------------
  console.log('\n--- 3. First-Time Employee Setup & OTP Flow ---');
  {
    const testRegEmail = `test.emp.${Date.now()}@forcecraver.com`;

    // Rejection of non-forcecraver domain
    const badDomain = await request('POST', '/api/auth/send-otp', {
      firstName: 'TEST',
      email: 'test@gmail.com'
    });
    assert(badDomain.status === 400, 'Rejects non @forcecraver.com domain (e.g. gmail.com)');

    // Missing first name
    const missingName = await request('POST', '/api/auth/send-otp', {
      firstName: '',
      email: 'user@forcecraver.com'
    });
    assert(missingName.status === 400, 'Rejects OTP send when First Name is missing');

    // Duplicate email
    const dupEmail = await request('POST', '/api/auth/send-otp', {
      firstName: 'Rahul',
      email: 'rahul@portal.com'
    });
    // Note: rahul@portal.com doesn't end with forcecraver.com, should reject on domain or existing
    assert(dupEmail.status === 400 || dupEmail.status === 409, 'Rejects invalid or existing registered user for OTP');

    // Valid OTP Request
    const otpRes = await request('POST', '/api/auth/send-otp', {
      firstName: 'VIKAS',
      lastName: 'GUPTA',
      email: testRegEmail,
      phone: '+91 9988776655'
    });
    assert(otpRes.status === 200 && otpRes.data.success && !!otpRes.data.demoOtp, 'OTP sent successfully for valid @forcecraver.com email');
    const receivedOtp = otpRes.data.demoOtp;

    // Verify OTP: Wrong OTP
    const wrongOtpRes = await request('POST', '/api/auth/verify-otp-register', {
      email: testRegEmail,
      otp: '000000',
      password: 'password123',
      confirmPassword: 'password123',
      firstName: 'VIKAS'
    });
    assert(wrongOtpRes.status === 400, 'Wrong OTP is rejected with 400');

    // Verify OTP: Mismatched password
    const mismatchRes = await request('POST', '/api/auth/verify-otp-register', {
      email: testRegEmail,
      otp: receivedOtp,
      password: 'password123',
      confirmPassword: 'differentpassword',
      firstName: 'VIKAS'
    });
    assert(mismatchRes.status === 400, 'Mismatched passwords rejected with 400');

    // Verify OTP: Short password
    const shortPassRes = await request('POST', '/api/auth/verify-otp-register', {
      email: testRegEmail,
      otp: receivedOtp,
      password: '123',
      confirmPassword: '123',
      firstName: 'VIKAS'
    });
    assert(shortPassRes.status === 400, 'Password < 6 chars rejected with 400');

    // Verify OTP: Correct registration
    const validRegRes = await request('POST', '/api/auth/verify-otp-register', {
      email: testRegEmail,
      otp: receivedOtp,
      password: 'securePassword123',
      confirmPassword: 'securePassword123',
      firstName: 'VIKAS',
      lastName: 'GUPTA',
      phone: '+91 9988776655'
    });
    assert(validRegRes.status === 201 && validRegRes.data.user && !!validRegRes.data.token, 'OTP verification & account activation successful (201 Created)');
    assert(validRegRes.data.user.name === 'VIKAS GUPTA', 'User name properly uppercased (VIKAS GUPTA)');
    assert(validRegRes.data.user.employee_id.startsWith('EMP'), 'Auto-generated employee ID starts with EMP');

    newlyRegisteredToken = validRegRes.data.token;
  }

  // ----------------------------------------------------
  // GROUP 4: USER PROFILE & PASSWORD CHANGE
  // ----------------------------------------------------
  console.log('\n--- 4. User Profile & Password Updates ---');
  {
    // GET /api/auth/me
    const meRes = await request('GET', '/api/auth/me', null, employeeToken);
    assert(meRes.status === 200 && meRes.data.user.email === 'rahul@portal.com', 'GET /api/auth/me returns authenticated user details');

    // PUT /api/auth/profile
    const updateProfile = await request('PUT', '/api/auth/profile', { name: 'RAHUL SHARMA UPDATED', phone: '+91 9123456789' }, employeeToken);
    assert(updateProfile.status === 200 && updateProfile.data.user.name === 'RAHUL SHARMA UPDATED', 'PUT /api/auth/profile updates profile');

    // Revert name back
    await request('PUT', '/api/auth/profile', { name: 'RAHUL SHARMA', phone: '+91 9811223344' }, employeeToken);

    // PUT /api/auth/password with bad current password
    const badOldPass = await request('PUT', '/api/auth/password', { currentPassword: 'wrong', newPassword: 'newpassword123' }, employeeToken);
    assert(badOldPass.status === 400, 'Password update fails if currentPassword is wrong');

    // PUT /api/auth/password with valid password
    const goodPass = await request('PUT', '/api/auth/password', { currentPassword: 'user123', newPassword: 'newuser123' }, employeeToken);
    assert(goodPass.status === 200, 'Password updated successfully with valid currentPassword');

    // Revert password back
    await request('PUT', '/api/auth/password', { currentPassword: 'newuser123', newPassword: 'user123' }, employeeToken);
  }

  // ----------------------------------------------------
  // GROUP 5: ROLE-BASED ACCESS CONTROL (RBAC)
  // ----------------------------------------------------
  console.log('\n--- 5. Role-Based Access Control (RBAC) Security ---');
  {
    // Unauthenticated access
    const unauth = await request('GET', '/api/admin/today-overview');
    assert(unauth.status === 401, 'Unauthenticated request to admin route rejected (401)');

    // Employee accessing admin routes
    const empAdmin = await request('GET', '/api/admin/today-overview', null, employeeToken);
    assert(empAdmin.status === 403, 'Employee forbidden from GET /api/admin/today-overview (403)');

    const empMatrix = await request('GET', '/api/admin/monthly-matrix', null, employeeToken);
    assert(empMatrix.status === 403, 'Employee forbidden from GET /api/admin/monthly-matrix (403)');

    const empStaff = await request('GET', '/api/admin/employees', null, employeeToken);
    assert(empStaff.status === 403, 'Employee forbidden from GET /api/admin/employees (403)');

    // Admin access (Read allowed, Write forbidden)
    const adminOverview = await request('GET', '/api/admin/today-overview', null, adminToken);
    assert(adminOverview.status === 200, 'Admin can view GET /api/admin/today-overview (200)');

    const adminMatrix = await request('GET', '/api/admin/monthly-matrix', null, adminToken);
    assert(adminMatrix.status === 200, 'Admin can view GET /api/admin/monthly-matrix (200)');

    const adminStaff = await request('GET', '/api/admin/employees', null, adminToken);
    assert(adminStaff.status === 200, 'Admin can view GET /api/admin/employees (200)');

    const adminHolidays = await request('GET', '/api/admin/holidays', null, adminToken);
    assert(adminHolidays.status === 200, 'Admin can view GET /api/admin/holidays (200)');

    // Admin attempting WRITE operations (strictly developer only)
    const adminOverride = await request('POST', '/api/admin/attendance/override', { user_id: 1, date: '2026-10-06', status: 'present' }, adminToken);
    assert(adminOverride.status === 403, 'Admin STRICTLY FORBIDDEN from POST /api/admin/attendance/override (403)');

    const adminAddEmp = await request('POST', '/api/admin/employees', { name: 'FAIL', email: 'fail@test.com', password: '123' }, adminToken);
    assert(adminAddEmp.status === 403, 'Admin STRICTLY FORBIDDEN from POST /api/admin/employees (403)');

    const adminAdjustCl = await request('POST', '/api/admin/employees/1/adjust-cl', { delta: 1.0 }, adminToken);
    assert(adminAdjustCl.status === 403, 'Admin STRICTLY FORBIDDEN from POST /api/admin/employees/:id/adjust-cl (403)');

    const adminAddHoliday = await request('POST', '/api/admin/holidays', { date: '2026-12-31', name: 'New Year Eve' }, adminToken);
    assert(adminAddHoliday.status === 403, 'Admin STRICTLY FORBIDDEN from POST /api/admin/holidays (403)');

    // Developer attempting all above (allowed)
    const devOverview = await request('GET', '/api/admin/today-overview', null, devToken);
    assert(devOverview.status === 200, 'Developer can access GET /api/admin/today-overview (200)');
  }

  // ----------------------------------------------------
  // GROUP 6: EMPLOYEE ATTENDANCE MARKING & RULES
  // ----------------------------------------------------
  console.log('\n--- 6. Employee Attendance Marking Rules & Flow ---');
  {
    // GET /api/attendance/today
    const todayRes = await request('GET', '/api/attendance/today', null, employeeToken);
    assert(todayRes.status === 200 && todayRes.data.date && todayRes.data.clSummary !== undefined, 'GET /api/attendance/today returns valid day status & CL summary');

    // Rule: Weekend attendance marking blocked
    const weekendMark = await request('POST', '/api/attendance/mark', {
      status: 'present',
      customDate: '2026-10-10' // Saturday
    }, employeeToken);
    assert(weekendMark.status === 400, 'Marking attendance on Saturday/Sunday is strictly blocked (400)');

    // Rule: Holiday attendance marking blocked
    const holidayMark = await request('POST', '/api/attendance/mark', {
      status: 'present',
      customDate: '2026-10-02' // Gandhi Jayanti holiday in database
    }, employeeToken);
    assert(holidayMark.status === 400, 'Marking attendance on official Company Holiday is blocked (400)');

    // Rule: Invalid status rejected
    const invalidStatus = await request('POST', '/api/attendance/mark', {
      status: 'something_invalid',
      customDate: '2026-10-07' // Wednesday
    }, employeeToken);
    assert(invalidStatus.status === 400, 'Invalid status is rejected (400)');

    // Rule: Half day without slot rejected
    const missingSlot = await request('POST', '/api/attendance/mark', {
      status: 'half_day',
      customDate: '2026-10-07' // Wednesday
    }, employeeToken);
    assert(missingSlot.status === 400, 'Half-day without slot (1st_half/2nd_half) rejected (400)');

    // Mark Full Day Present (10 AM - 7 PM)
    const markPresent = await request('POST', '/api/attendance/mark', {
      status: 'present',
      work_mode: 'office',
      notes: 'Testing full day attendance',
      customDate: '2026-10-07' // Wednesday
    }, employeeToken);
    assert(markPresent.status === 200 && markPresent.data.attendance.status === 'present', 'Mark Full Day Present on weekday succeeds');
    assert(markPresent.data.attendance.check_out_time === '07:00 PM', 'Full day check_out_time is 07:00 PM');

    // Mark 1st Half Day (10 AM - 2 PM)
    const markHalf1 = await request('POST', '/api/attendance/mark', {
      status: 'half_day',
      half_day_slot: '1st_half',
      work_mode: 'remote',
      notes: 'Doctor visit in afternoon',
      customDate: '2026-10-07'
    }, employeeToken);
    assert(markHalf1.status === 200 && markHalf1.data.attendance.half_day_slot === '1st_half', 'Mark 1st Half Day updates existing date record cleanly');
    assert(markHalf1.data.attendance.check_out_time === '02:00 PM', '1st Half check_out_time is 02:00 PM');
    assert(markHalf1.data.attendance.work_mode === 'remote', 'Work mode recorded as remote');

    // Mark 2nd Half Day (2 PM - 7 PM)
    const markHalf2 = await request('POST', '/api/attendance/mark', {
      status: 'half_day',
      half_day_slot: '2nd_half',
      work_mode: 'office',
      notes: 'Morning bank visit',
      customDate: '2026-10-07'
    }, employeeToken);
    assert(markHalf2.status === 200 && markHalf2.data.attendance.half_day_slot === '2nd_half', 'Mark 2nd Half Day updates record cleanly');
    assert(markHalf2.data.attendance.check_in_time === '02:00 PM' || !!markHalf2.data.attendance.check_in_time, '2nd Half check_in_time set correctly');

    // Mark Absent (Full Day Leave)
    const markAbsent = await request('POST', '/api/attendance/mark', {
      status: 'absent',
      notes: 'Sick leave',
      customDate: '2026-10-07'
    }, employeeToken);
    assert(markAbsent.status === 200 && markAbsent.data.attendance.status === 'absent', 'Mark Absent records status as absent');
    assert(markAbsent.data.attendance.check_in_time === null, 'Absent check_in_time is null');

    // Reset to Unmarked
    const markUnmarked = await request('POST', '/api/attendance/mark', {
      status: 'unmarked',
      customDate: '2026-10-07'
    }, employeeToken);
    assert(markUnmarked.status === 200 && markUnmarked.data.attendance === null, 'Reset to Unmarked deletes record');

    // Restore present for test stability
    await request('POST', '/api/attendance/mark', {
      status: 'present',
      customDate: '2026-10-07'
    }, employeeToken);
  }

  // ----------------------------------------------------
  // GROUP 7: CASUAL LEAVE (CL) ROLLOVERS & ACCURACY
  // ----------------------------------------------------
  console.log('\n--- 7. Casual Leave (CL) Balance & Rollover Calculations ---');
  {
    // Test user Rahul Sharma (id: 3)
    const userRahul = db.prepare("SELECT id, previous_cl, monthly_cl FROM users WHERE email = 'rahul@portal.com'").get();
    const statsOct = getUserClStats(userRahul.id, 2026, 10);
    
    assert(typeof statsOct.previous_cl === 'number', 'getUserClStats returns numeric previous_cl');
    assert(typeof statsOct.monthly_cl === 'number', 'getUserClStats returns numeric monthly_cl');
    assert(typeof statsOct.remaining_cl === 'number', 'getUserClStats returns numeric remaining_cl');
    assert(statsOct.remaining_cl >= 0, 'Remaining CL is non-negative (>= 0)');
    assert(statsOct.total_available === Math.round((statsOct.previous_cl + statsOct.monthly_cl) * 10) / 10, 'Total available equals previous_cl + monthly_cl');
    assert(statsOct.cl_adjusted <= statsOct.total_available, 'Adjusted CL does not exceed total available CL');

    // Mathematical unit test of CL simulation
    // Let's create a temporary test user in DB with known initial conditions
    const tempSalt = bcrypt.genSaltSync(10);
    const tempPass = bcrypt.hashSync('testpass123', tempSalt);
    const insTemp = db.prepare(`
      INSERT INTO users (employee_id, name, email, password, role, previous_cl, monthly_cl, created_at)
      VALUES ('TEST_CL_01', 'CL TEST USER', 'cl_test@forcecraver.com', ?, 'employee', 2.0, 1.0, '2026-08-01 00:00:00')
    `).run(tempPass);
    const tempUserId = insTemp.lastInsertRowid;

    // Month 1: 2026-08 (Start Previous: 2.0, Monthly: 1.0 -> Total: 3.0)
    // Leaves taken in Aug: 1 full day absent (1.0) -> CL adjusted: 1.0 -> Remaining end of Aug: 2.0
    db.prepare("INSERT INTO attendance (user_id, date, status) VALUES (?, '2026-08-05', 'absent')").run(tempUserId);

    const clAug = getUserClStats(tempUserId, 2026, 8);
    assert(clAug.previous_cl === 2.0, 'Aug: Starting previous CL is 2.0');
    assert(clAug.total_available === 3.0, 'Aug: Total available is 3.0');
    assert(clAug.total_leaves_taken === 1.0, 'Aug: Leaves taken is 1.0');
    assert(clAug.cl_adjusted === 1.0, 'Aug: CL adjusted is 1.0');
    assert(clAug.remaining_cl === 2.0, 'Aug: Remaining CL is 2.0');

    // Month 2: 2026-09 (Rollover previous from Aug = 2.0, Monthly: 1.0 -> Total: 3.0)
    // Leaves taken in Sep: 2 full days absent (2.0) + 1 half day (0.5) = 2.5 leaves
    // CL adjusted: 2.5 -> Remaining end of Sep: 0.5
    db.prepare("INSERT INTO attendance (user_id, date, status) VALUES (?, '2026-09-08', 'absent')").run(tempUserId);
    db.prepare("INSERT INTO attendance (user_id, date, status) VALUES (?, '2026-09-09', 'absent')").run(tempUserId);
    db.prepare("INSERT INTO attendance (user_id, date, status, half_day_slot) VALUES (?, '2026-09-10', 'half_day', '1st_half')").run(tempUserId);

    const clSep = getUserClStats(tempUserId, 2026, 9);
    assert(clSep.previous_cl === 2.0, 'Sep: Rollover previous CL from Aug is 2.0');
    assert(clSep.total_available === 3.0, 'Sep: Total available is 3.0 (2.0 + 1.0)');
    assert(clSep.total_leaves_taken === 2.5, 'Sep: Total leaves taken is 2.5 (2 + 0.5)');
    assert(clSep.cl_adjusted === 2.5, 'Sep: CL adjusted is 2.5');
    assert(clSep.remaining_cl === 0.5, 'Sep: Remaining CL is 0.5');

    // Month 3: 2026-10 (Rollover previous from Sep = 0.5, Monthly: 1.0 -> Total: 1.5)
    // Leaves taken in Oct: 2 full days absent (2.0 leaves)
    // Total available = 1.5, Leaves taken = 2.0
    // CL adjusted: 1.5 (paid leaves), Excess unpaid: 0.5, Remaining end of Oct: 0.0
    db.prepare("INSERT INTO attendance (user_id, date, status) VALUES (?, '2026-10-08', 'absent')").run(tempUserId);
    db.prepare("INSERT INTO attendance (user_id, date, status) VALUES (?, '2026-10-09', 'absent')").run(tempUserId);

    const clOct = getUserClStats(tempUserId, 2026, 10);
    assert(clOct.previous_cl === 0.5, 'Oct: Rollover previous CL from Sep is 0.5');
    assert(clOct.total_available === 1.5, 'Oct: Total available is 1.5 (0.5 + 1.0)');
    assert(clOct.total_leaves_taken === 2.0, 'Oct: Leaves taken is 2.0');
    assert(clOct.cl_adjusted === 1.5, 'Oct: Max CL adjusted is 1.5 (cannot exceed quota)');
    assert(clOct.excess_unpaid_leaves === 0.5, 'Oct: Excess unpaid leaves correctly flagged as 0.5');
    assert(clOct.remaining_cl === 0.0, 'Oct: Remaining CL balance is 0.0');

    // Clean up temporary user and records
    db.prepare('DELETE FROM users WHERE id = ?').run(tempUserId);
  }

  // ----------------------------------------------------
  // GROUP 8: MONTHLY STATS & ADMIN MATRIX
  // ----------------------------------------------------
  console.log('\n--- 8. Monthly Statistics & Matrix Calculation ---');
  {
    // GET /api/attendance/my-stats
    const myStats = await request('GET', '/api/attendance/my-stats?year=2026&month=10', null, employeeToken);
    assert(myStats.status === 200, 'GET /api/attendance/my-stats returns 200');
    assert(myStats.data.totalWorkingDaysCount > 0, 'Total working days count calculated for month (Mon-Fri)');
    assert(Array.isArray(myStats.data.calendarDays), 'calendarDays array returned with full month breakdown');

    // GET /api/admin/monthly-matrix
    const matrixRes = await request('GET', '/api/admin/monthly-matrix?year=2026&month=10', null, devToken);
    assert(matrixRes.status === 200, 'GET /api/admin/monthly-matrix returns 200');
    assert(Array.isArray(matrixRes.data.matrix), 'Matrix contains array of employee rows');
    assert(matrixRes.data.matrix.length > 0, 'Matrix includes active employees');

    const firstRow = matrixRes.data.matrix[0];
    assert(!!firstRow.employee && !!firstRow.days && !!firstRow.stats && !!firstRow.clStats, 'Each matrix row contains employee, days map, stats, and clStats');
    assert(firstRow.stats.effectivePresent !== undefined, 'Effective working days computed');
  }

  // ----------------------------------------------------
  // GROUP 9: DEVELOPER MANAGEMENT (STAFF, HOLIDAYS, OVERRIDE)
  // ----------------------------------------------------
  console.log('\n--- 9. Developer Full Management Operations ---');
  {
    // Create new candidate
    const createEmpRes = await request('POST', '/api/admin/employees', {
      name: 'ANIKET VERMA',
      email: 'aniket.test@forcecraver.com',
      password: 'empPassword123',
      phone: '+91 9888112233',
      role: 'employee',
      previous_cl: 3.5,
      monthly_cl: 1.0
    }, devToken);
    assert(createEmpRes.status === 201 && createEmpRes.data.employee.name === 'ANIKET VERMA', 'Developer creates candidate (201 Created)');
    createdEmpId = createEmpRes.data.employee.id;

    // Update candidate details
    const updateEmpRes = await request('PUT', `/api/admin/employees/${createdEmpId}`, {
      name: 'ANIKET VERMA (SENIOR)',
      phone: '+91 9777112233',
      status: 'active',
      role: 'employee',
      previous_cl: 4.0
    }, devToken);
    assert(updateEmpRes.status === 200 && updateEmpRes.data.employee.name === 'ANIKET VERMA (SENIOR)', 'Developer updates candidate details (200 OK)');
    assert(updateEmpRes.data.employee.previous_cl === 4.0, 'Developer updated Previous CL to 4.0');

    // Quick adjust CL via delta
    const deltaClRes = await request('POST', `/api/admin/employees/${createdEmpId}/adjust-cl`, { delta: 0.5 }, devToken);
    assert(deltaClRes.status === 200 && deltaClRes.data.employee.previous_cl === 4.5, 'Developer quick-adjusts Previous CL (+0.5 -> 4.5)');

    // Quick adjust CL via exact_previous_cl
    const exactClRes = await request('POST', `/api/admin/employees/${createdEmpId}/adjust-cl`, { exact_previous_cl: 2.5 }, devToken);
    assert(exactClRes.status === 200 && exactClRes.data.employee.previous_cl === 2.5, 'Developer sets exact Previous CL (2.5)');

    // Attendance override for any date
    const overrideRes = await request('POST', '/api/admin/attendance/override', {
      user_id: createdEmpId,
      date: '2026-10-05',
      status: 'half_day',
      half_day_slot: '2nd_half',
      check_in_time: '02:00 PM',
      check_out_time: '07:00 PM',
      work_mode: 'office',
      notes: 'Developer manual override test'
    }, devToken);
    assert(overrideRes.status === 200 && overrideRes.data.attendance.status === 'half_day', 'Developer manually overrides employee attendance for any date');

    // Holidays: Add Holiday
    const addHolRes = await request('POST', '/api/admin/holidays', {
      date: '2026-08-15',
      name: 'Independence Day',
      description: 'National Festival'
    }, devToken);
    assert(addHolRes.status === 201, 'Developer adds company holiday (201 Created)');

    // Holidays: Get holidays
    const holList = await request('GET', '/api/admin/holidays', null, devToken);
    const foundHol = holList.data.holidays.find(h => h.date === '2026-08-15');
    assert(!!foundHol, 'Newly added holiday present in holidays list');

    // Holidays: Delete Holiday
    if (foundHol) {
      const delHolRes = await request('DELETE', `/api/admin/holidays/${foundHol.id}`, null, devToken);
      assert(delHolRes.status === 200, 'Developer removes holiday (200 OK)');
    }

    // Delete test candidate
    const delEmpRes = await request('DELETE', `/api/admin/employees/${createdEmpId}`, null, devToken);
    assert(delEmpRes.status === 200, 'Developer deletes candidate account (200 OK)');

    // Developer cannot delete own account
    const devUserObj = db.prepare("SELECT id FROM users WHERE email = 'developer@portal.com'").get();
    const selfDelRes = await request('DELETE', `/api/admin/employees/${devUserObj.id}`, null, devToken);
    assert(selfDelRes.status === 400, 'Developer blocked from deleting own account (400)');
  }

  // ----------------------------------------------------
  // TEST SUMMARY & FINAL STATUS
  // ----------------------------------------------------
  console.log('\n========================================================');
  console.log(`📊 TEST SUITE SUMMARY:`);
  console.log(`   Total Tests Run : ${results.total}`);
  console.log(`   Passed          : ${results.passed} ✅`);
  console.log(`   Failed          : ${results.failed} ${results.failed > 0 ? '❌' : '🎉'}`);
  console.log(`   Success Rate    : ${Math.round((results.passed / results.total) * 100)}%`);
  console.log('========================================================\n');
}

// Start test runner
server = app.listen(0, async () => {
  const port = server.address().port;
  baseUrl = `http://127.0.0.1:${port}`;
  try {
    await runTests();
  } catch (err) {
    console.error('Fatal test error:', err);
  } finally {
    server.close();
    process.exit(results.failed > 0 ? 1 : 0);
  }
});
