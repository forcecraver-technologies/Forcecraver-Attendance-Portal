const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../db');
const { getUserClStats } = require('../db');
const { authenticateToken, requireAdminOrDev, requireDeveloper } = require('../middleware/auth');
const {
  formatDate,
  isWeekend,
  getDayName,
  getMonthWorkingDays,
  getElapsedWorkingDays,
  TIMING_CONFIG,
} = require('../utils/dateUtils');

// Apply auth + view permission (Admin & Developer can view)
router.use(authenticateToken);
router.use(requireAdminOrDev);

// GET /api/admin/today-overview - Live attendance stats & who marked vs not marked
router.get('/today-overview', async (req, res) => {
  try {
    const today = new Date();
    const dateStr = req.query.date || formatDate(today);
    const dayName = getDayName(dateStr);
    const weekend = isWeekend(dateStr);

    // Get all active employees
    const employees = await db.all(`
      SELECT id, employee_id, name, email, phone, status, previous_cl, monthly_cl
      FROM users
      WHERE role = 'employee' AND status = 'active'
      ORDER BY name ASC
    `);

    // Get attendance records for this date
    const attendanceRecords = await db.all(`
      SELECT a.*, u.name, u.employee_id, u.email
      FROM attendance a
      JOIN users u ON a.user_id = u.id
      WHERE a.date = ?
    `, [dateStr]);

    const recordMap = {};
    attendanceRecords.forEach(r => {
      recordMap[r.user_id] = r;
    });

    const [dYear, dMonth] = dateStr.split('-').map(Number);
    const targetYear = dYear || today.getFullYear();
    const targetMonth = dMonth || (today.getMonth() + 1);

    const marked = [];
    const notMarked = [];

    let presentCount = 0;
    let halfDay1stCount = 0;
    let halfDay2ndCount = 0;
    let absentCount = 0;

    // Check holiday info
    const holiday = await db.get('SELECT * FROM holidays WHERE date = ?', [dateStr]);
    const isWeekdayHoliday = !weekend && !!holiday;

    const allEmployeesWithStatus = await Promise.all(
      employees.map(async emp => {
        let att = recordMap[emp.id] || null;
        const clStats = await getUserClStats(emp.id, targetYear, targetMonth);

        // If today is a weekday holiday and no manual override, status is 'holiday'!
        if (isWeekdayHoliday && !att) {
          att = {
            id: `holiday-${holiday.id}-${emp.id}`,
            user_id: emp.id,
            date: dateStr,
            status: 'holiday',
            holiday_name: holiday.name,
            notes: `Official Holiday: ${holiday.name}`,
            is_holiday: true,
          };
        }

        if (att) {
          if (att.status === 'present') presentCount++;
          else if (att.status === 'half_day') {
            if (att.half_day_slot === '1st_half') halfDay1stCount++;
            else halfDay2ndCount++;
          } else if (att.status === 'absent' || att.status === 'casual_leave') {
            absentCount++;
          }

          marked.push({
            ...emp,
            attendance: att,
            clStats,
          });
        } else {
          notMarked.push({
            ...emp,
            attendance: null,
            clStats,
          });
        }

        return {
          ...emp,
          attendance: att,
          clStats,
        };
      })
    );

    const totalEmployees = employees.length;
    const totalMarked = marked.length;
    const totalHalfDays = halfDay1stCount + halfDay2ndCount;

    res.json({
      date: dateStr,
      dayName,
      isWeekend: weekend,
      isHoliday: !!holiday,
      holidayInfo: holiday || null,
      stats: {
        totalEmployees,
        totalMarked,
        notMarkedCount: notMarked.length,
        presentCount,
        halfDay1stCount,
        halfDay2ndCount,
        totalHalfDays,
        absentCount,
        completionRate: totalEmployees > 0 ? Math.round((totalMarked / totalEmployees) * 100) : 0,
      },
      marked,
      notMarked,
      allEmployeesWithStatus,
      timingConfig: TIMING_CONFIG,
      isDeveloper: req.user.role === 'developer',
      userRole: req.user.role,
    });
  } catch (err) {
    console.error('Error fetching today overview:', err);
    res.status(500).json({ error: 'Failed to fetch attendance overview' });
  }
});

// GET /api/admin/monthly-matrix - Complete grid for all employees for a month
router.get('/monthly-matrix', async (req, res) => {
  try {
    const now = new Date();
    const year = parseInt(req.query.year, 10) || now.getFullYear();
    const month = parseInt(req.query.month, 10) || (now.getMonth() + 1);

    // Holidays
    const holidaysRows = await db.all(
      "SELECT date, name FROM holidays WHERE SUBSTR(date, 1, 4) = ? AND SUBSTR(date, 6, 2) = ?",
      [String(year), String(month).padStart(2, '0')]
    );
    const holidayMap = {};
    holidaysRows.forEach(h => {
      holidayMap[h.date] = h.name;
    });
    const holidayDates = holidaysRows.map(h => h.date);

    // Working days list
    const { totalDaysInMonth, totalWorkingDaysCount, holidaysCount, workingDaysList } = getMonthWorkingDays(year, month, holidayDates);
    const elapsedWorkingDays = getElapsedWorkingDays(year, month, null, holidayDates);

    // Attach holiday names to workingDaysList
    workingDaysList.forEach(wDay => {
      wDay.holidayName = holidayMap[wDay.date] || null;
      wDay.isHoliday = !!holidayMap[wDay.date];
    });

    // Get active employees
    const employees = await db.all(`
      SELECT id, employee_id, name, email, previous_cl, monthly_cl
      FROM users
      WHERE role = 'employee' AND status = 'active'
      ORDER BY name ASC
    `);

    // Get all attendance records for this month
    const monthPattern = `${year}-${String(month).padStart(2, '0')}-%`;
    const records = await db.all(`
      SELECT user_id, date, status, half_day_slot, check_in_time, check_out_time, work_mode, notes
      FROM attendance
      WHERE date LIKE ?
    `, [monthPattern]);

    // Map by user_id -> date -> record
    const userAttendanceMap = {};
    records.forEach(r => {
      if (!userAttendanceMap[r.user_id]) {
        userAttendanceMap[r.user_id] = {};
      }
      userAttendanceMap[r.user_id][r.date] = r;
    });

    // Compute matrix rows
    const matrix = await Promise.all(
      employees.map(async emp => {
        const userRecords = userAttendanceMap[emp.id] || {};
        let presentCount = 0;
        let halfDay1stCount = 0;
        let halfDay2ndCount = 0;
        let absentCount = 0;
        let paidHolidayDays = 0;

        const daysData = {};
        workingDaysList.forEach(wDay => {
          const att = userRecords[wDay.date];
          if (wDay.isHoliday) {
            paidHolidayDays++;
            daysData[wDay.date] = {
              status: 'holiday',
              holidayName: wDay.holidayName || 'Holiday',
              notes: wDay.holidayName || 'Company Holiday',
            };
          } else if (att) {
            if (att.status === 'present') presentCount++;
            else if (att.status === 'half_day') {
              if (att.half_day_slot === '1st_half') halfDay1stCount++;
              else halfDay2ndCount++;
            } else if (att.status === 'absent' || att.status === 'casual_leave') absentCount++;

            daysData[wDay.date] = {
              status: att.status,
              half_day_slot: att.half_day_slot,
              check_in: att.check_in_time,
              check_out: att.check_out_time,
              notes: att.notes,
            };
          } else {
            daysData[wDay.date] = null; // Unmarked
          }
        });

        const clStats = await getUserClStats(emp.id, year, month);
        const totalHalfDays = halfDay1stCount + halfDay2ndCount;
        const effectivePresent = Math.round((presentCount + (totalHalfDays * 0.5) + clStats.cl_adjusted + paidHolidayDays) * 10) / 10;
        const percentage = elapsedWorkingDays > 0
          ? Math.min(100, Math.round((effectivePresent / elapsedWorkingDays) * 100))
          : 0;

        return {
          employee: emp,
          days: daysData,
          clStats,
          stats: {
            presentCount,
            halfDay1stCount,
            halfDay2ndCount,
            totalHalfDays,
            totalLeavesTaken: clStats.total_leaves_taken,
            clAdjusted: clStats.cl_adjusted,
            excessUnpaidLeaves: clStats.excess_unpaid_leaves,
            remainingCl: clStats.remaining_cl,
            effectivePresent,
            absentCount,
            paidHolidayDays,
            unmarkedCount: Math.max(0, elapsedWorkingDays - (presentCount + totalHalfDays + absentCount + paidHolidayDays)),
            percentage,
          },
        };
      })
    );

    res.json({
      year,
      month,
      monthName: new Date(year, month - 1, 1).toLocaleDateString('en-US', { month: 'long' }),
      totalDaysInMonth,
      totalWorkingDaysCount,
      holidaysCount,
      elapsedWorkingDays,
      workingDaysList,
      matrix,
      isDeveloper: req.user.role === 'developer',
      userRole: req.user.role,
    });
  } catch (err) {
    console.error('Error generating monthly matrix:', err);
    res.status(500).json({ error: 'Failed to generate monthly matrix' });
  }
});

// GET /api/admin/employees - List all actual employees with CL stats (Admin & Developer can view)
router.get('/employees', async (req, res) => {
  try {
    const employees = await db.all(`
      SELECT id, employee_id, name, email, role, phone, status, previous_cl, monthly_cl, created_at
      FROM users
      WHERE role = 'employee'
      ORDER BY name ASC
    `);

    const employeesWithCl = await Promise.all(
      employees.map(async emp => ({
        ...emp,
        clStats: await getUserClStats(emp.id),
      }))
    );

    res.json({ employees: employeesWithCl, isDeveloper: req.user.role === 'developer', userRole: req.user.role });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch employees' });
  }
});

// GET /api/admin/employees/:id/calendar - Full monthly calendar view and stats for specific employee
router.get('/employees/:id/calendar', async (req, res) => {
  try {
    const targetUserId = parseInt(req.params.id, 10);
    const user = await db.get('SELECT id, employee_id, name, email, role, previous_cl, monthly_cl FROM users WHERE id = ?', [targetUserId]);
    if (!user) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    const now = new Date();
    const year = parseInt(req.query.year, 10) || now.getFullYear();
    const month = parseInt(req.query.month, 10) || (now.getMonth() + 1);

    // Get holidays
    const holidaysRows = await db.all(
      "SELECT date, name FROM holidays WHERE SUBSTR(date, 1, 4) = ? AND SUBSTR(date, 6, 2) = ?",
      [String(year), String(month).padStart(2, '0')]
    );
    const holidayDates = holidaysRows.map(h => h.date);

    // Working days info
    const { totalDaysInMonth, totalWorkingDaysCount, holidaysCount, workingDaysList } = getMonthWorkingDays(year, month, holidayDates);
    const elapsedWorkingDays = getElapsedWorkingDays(year, month, null, holidayDates);

    // Get user's attendance records for the month
    const monthPattern = `${year}-${String(month).padStart(2, '0')}-%`;
    const records = await db.all(`
      SELECT * FROM attendance
      WHERE user_id = ? AND date LIKE ?
      ORDER BY date ASC
    `, [targetUserId, monthPattern]);

    const recordMap = {};
    records.forEach(r => {
      recordMap[r.date] = r;
    });

    let presentCount = 0;
    let halfDay1stCount = 0;
    let halfDay2ndCount = 0;
    let absentCount = 0;

    records.forEach(r => {
      if (r.status === 'present') {
        presentCount++;
      } else if (r.status === 'half_day') {
        if (r.half_day_slot === '1st_half') halfDay1stCount++;
        else halfDay2ndCount++;
      } else if (r.status === 'absent' || r.status === 'casual_leave') {
        absentCount++;
      }
    });

    const totalHalfDays = halfDay1stCount + halfDay2ndCount;
    const clSummary = await getUserClStats(targetUserId, year, month);

    const effectivePresentDays = Math.round((presentCount + (totalHalfDays * 0.5) + clSummary.cl_adjusted + holidaysCount) * 10) / 10;
    const attendancePercentage = elapsedWorkingDays > 0
      ? Math.min(100, Math.round((effectivePresentDays / elapsedWorkingDays) * 100))
      : 0;

    const calendarDays = [];
    for (let d = 1; d <= totalDaysInMonth; d++) {
      const dayDate = new Date(year, month - 1, d);
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayOfWeek = dayDate.getDay();
      const isWeekendDay = dayOfWeek === 0 || dayOfWeek === 6;
      const isHolidayDay = holidayDates.includes(dateStr);
      const holidayObj = holidaysRows.find(h => h.date === dateStr);
      let att = recordMap[dateStr] || null;

      // If holiday falls on a weekday and no manual override, status is 'holiday'
      if (!isWeekendDay && isHolidayDay && !att) {
        att = {
          status: 'holiday',
          holiday_name: holidayObj?.name || 'Holiday',
          notes: holidayObj?.name ? `Official Holiday: ${holidayObj.name}` : 'Official Holiday',
          is_holiday: true,
        };
      }

      calendarDays.push({
        date: dateStr,
        dayNumber: d,
        dayOfWeek,
        dayName: dayDate.toLocaleDateString('en-US', { weekday: 'short' }),
        isWeekend: isWeekendDay,
        isWorkingDay: !isWeekendDay, // Monday to Friday is a working day (includes weekday holidays)
        isHoliday: isHolidayDay,
        holidayName: holidayObj ? holidayObj.name : null,
        attendance: att,
      });
    }

    res.json({
      user,
      year,
      month,
      monthName: new Date(year, month - 1, 1).toLocaleDateString('en-US', { month: 'long' }),
      totalDaysInMonth,
      totalWorkingDaysCount,
      elapsedWorkingDays,
      clSummary,
      stats: {
        presentCount,
        paidHolidayDays: holidaysCount,
        halfDay1stCount,
        halfDay2ndCount,
        totalHalfDays,
        totalLeavesTaken: clSummary.total_leaves_taken,
        clAdjusted: clSummary.cl_adjusted,
        excessUnpaidLeaves: clSummary.excess_unpaid_leaves,
        remainingCl: clSummary.remaining_cl,
        effectivePresentDays,
        absentCount,
        unmarkedCount: Math.max(0, elapsedWorkingDays - (presentCount + totalHalfDays + absentCount + holidaysCount)),
        attendancePercentage,
      },
      records,
      calendarDays,
    });
  } catch (err) {
    console.error('Error fetching employee calendar stats:', err);
    res.status(500).json({ error: 'Failed to fetch employee calendar statistics' });
  }
});

// POST /api/admin/attendance/override - Manual attendance update (DEVELOPER ONLY)
router.post('/attendance/override', requireDeveloper, async (req, res) => {
  const { user_id, date, status, half_day_slot, check_in_time, check_out_time, work_mode = 'office', notes = '' } = req.body;

  if (!user_id || !date || !status) {
    return res.status(400).json({ error: 'User ID, date, and status are required' });
  }

  try {
    // If status is 'unmarked', delete the record
    if (status === 'unmarked') {
      await db.run('DELETE FROM attendance WHERE user_id = ? AND date = ?', [user_id, date]);
      return res.json({ message: 'Attendance reset to Unmarked successfully by Developer', attendance: null });
    }

    let finalSlot = null;
    let checkIn = check_in_time;
    let checkOut = check_out_time;
    const cleanWorkMode = work_mode === 'remote' ? 'remote' : 'office';

    if (status === 'half_day') {
      if (!half_day_slot || !['1st_half', '2nd_half'].includes(half_day_slot)) {
        return res.status(400).json({ error: 'Please select 1st_half (10 AM - 2 PM) or 2nd_half (2 PM - 7 PM)' });
      }
      finalSlot = half_day_slot;
      if (!checkIn) checkIn = finalSlot === '1st_half' ? '10:00 AM' : '02:00 PM';
      if (!checkOut) checkOut = finalSlot === '1st_half' ? '02:00 PM' : '07:00 PM';
    } else if (status === 'present') {
      if (!checkIn) checkIn = '10:00 AM';
      if (!checkOut) checkOut = '07:00 PM';
    } else if (status === 'casual_leave' || status === 'absent') {
      checkIn = null;
      checkOut = null;
      finalSlot = null;
    }

    const existing = await db.get('SELECT id FROM attendance WHERE user_id = ? AND date = ?', [user_id, date]);

    if (existing) {
      await db.run(`
        UPDATE attendance
        SET status = ?,
            half_day_slot = ?,
            check_in_time = ?,
            check_out_time = ?,
            work_mode = ?,
            notes = ?,
            marked_by = 'developer',
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [status, finalSlot, checkIn, checkOut, cleanWorkMode, notes, existing.id]);
    } else {
      await db.run(`
        INSERT INTO attendance (user_id, date, status, half_day_slot, check_in_time, check_out_time, work_mode, notes, marked_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'developer')
      `, [user_id, date, status, finalSlot, checkIn, checkOut, cleanWorkMode, notes]);
    }

    const updated = await db.get('SELECT * FROM attendance WHERE user_id = ? AND date = ?', [user_id, date]);
    const clStats = await getUserClStats(user_id);
    res.json({ message: 'Attendance updated successfully by Developer', attendance: updated, clStats });
  } catch (err) {
    console.error('Error overriding attendance:', err);
    res.status(500).json({ error: 'Failed to update attendance' });
  }
});

// POST /api/admin/employees - Create new employee (DEVELOPER ONLY)
router.post('/employees', requireDeveloper, async (req, res) => {
  const { name, email, password, phone, role = 'employee', previous_cl = 0.0, monthly_cl = 1.0 } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required' });
  }

  try {
    const cleanEmail = email.trim().toLowerCase();
    const existing = await db.get('SELECT id FROM users WHERE LOWER(email) = LOWER(?)', [cleanEmail]);
    if (existing) {
      return res.status(409).json({ error: 'User with this email already exists' });
    }

    const countRow = await db.get('SELECT COUNT(*) as count FROM users');
    const totalUsers = parseInt(countRow.count, 10) || 0;
    const nextEmpNum = String(totalUsers + 1).padStart(3, '0');
    const employee_id = `EMP${nextEmpNum}`;

    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(password, salt);
    const formattedName = name.trim().toUpperCase();

    const insertRes = await db.query(`
      INSERT INTO users (employee_id, name, email, password, role, phone, previous_cl, monthly_cl, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active')
      RETURNING id, employee_id, name, email, role, phone, status, previous_cl, monthly_cl, created_at
    `, [
      employee_id,
      formattedName,
      cleanEmail,
      hashedPassword,
      role,
      phone || '',
      parseFloat(previous_cl) || 0.0,
      parseFloat(monthly_cl) !== undefined ? parseFloat(monthly_cl) : 1.0,
    ]);

    const newEmp = insertRes.rows[0];
    const clStats = await getUserClStats(newEmp.id);

    res.status(201).json({
      message: 'Employee created successfully',
      employee: {
        ...newEmp,
        clStats,
      },
    });
  } catch (err) {
    console.error('Create employee error:', err);
    res.status(500).json({ error: 'Failed to create employee' });
  }
});

// PUT /api/admin/employees/:id - Update employee (DEVELOPER ONLY)
router.put('/employees/:id', requireDeveloper, async (req, res) => {
  const { name, phone, status, role, password, previous_cl, monthly_cl } = req.body;
  const targetId = req.params.id;

  try {
    const user = await db.get('SELECT id FROM users WHERE id = ?', [targetId]);
    if (!user) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    const fields = [];
    const params = [];

    if (name && name.trim()) {
      fields.push('name = ?');
      params.push(name.trim().toUpperCase());
    }
    if (phone !== undefined) {
      fields.push('phone = ?');
      params.push(phone);
    }
    if (status !== undefined) {
      fields.push('status = ?');
      params.push(status);
    }
    if (role !== undefined) {
      fields.push('role = ?');
      params.push(role);
    }
    if (previous_cl !== undefined && previous_cl !== null) {
      fields.push('previous_cl = ?');
      params.push(parseFloat(previous_cl));
    }
    if (monthly_cl !== undefined && monthly_cl !== null) {
      fields.push('monthly_cl = ?');
      params.push(parseFloat(monthly_cl));
    }
    if (password && password.trim().length >= 6) {
      const salt = bcrypt.genSaltSync(10);
      const hashedPassword = bcrypt.hashSync(password, salt);
      fields.push('password = ?');
      params.push(hashedPassword);
    }

    if (fields.length > 0) {
      params.push(targetId);
      await db.run(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, params);
    }

    const updated = await db.get('SELECT id, employee_id, name, email, role, phone, status, previous_cl, monthly_cl, created_at FROM users WHERE id = ?', [targetId]);
    const clStats = await getUserClStats(targetId);

    res.json({
      message: 'Employee updated successfully',
      employee: {
        ...updated,
        clStats,
      },
    });
  } catch (err) {
    console.error('Update employee error:', err);
    res.status(500).json({ error: 'Failed to update employee' });
  }
});

// POST /api/admin/employees/:id/adjust-cl - Quick + / - adjustment on previous_cl (DEVELOPER ONLY)
router.post('/employees/:id/adjust-cl', requireDeveloper, async (req, res) => {
  const targetId = req.params.id;
  const { delta, exact_previous_cl } = req.body;

  try {
    const emp = await db.get('SELECT id, name, previous_cl, monthly_cl FROM users WHERE id = ?', [targetId]);
    if (!emp) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    let newPreviousCl = emp.previous_cl || 0.0;
    if (exact_previous_cl !== undefined && !isNaN(parseFloat(exact_previous_cl))) {
      newPreviousCl = Math.max(0, parseFloat(exact_previous_cl));
    } else if (delta !== undefined && !isNaN(parseFloat(delta))) {
      newPreviousCl = Math.max(0, (emp.previous_cl || 0.0) + parseFloat(delta));
    }

    // Round to 1 decimal place to prevent JS float quirks
    newPreviousCl = Math.round(newPreviousCl * 10) / 10;

    await db.run('UPDATE users SET previous_cl = ? WHERE id = ?', [newPreviousCl, targetId]);

    const updated = await db.get('SELECT id, employee_id, name, email, role, phone, status, previous_cl, monthly_cl, created_at FROM users WHERE id = ?', [targetId]);
    const clStats = await getUserClStats(targetId);

    res.json({
      message: `Previous CL updated to ${newPreviousCl} for ${emp.name}`,
      employee: updated,
      clStats,
    });
  } catch (err) {
    console.error('Error adjusting CL:', err);
    res.status(500).json({ error: 'Failed to adjust CL balance' });
  }
});

// DELETE /api/admin/employees/:id - Delete employee (DEVELOPER ONLY)
router.delete('/employees/:id', requireDeveloper, async (req, res) => {
  const targetId = req.params.id;

  if (parseInt(targetId, 10) === req.user.id) {
    return res.status(400).json({ error: 'Cannot delete your own developer account' });
  }

  try {
    await db.run('DELETE FROM users WHERE id = ?', [targetId]);
    res.json({ message: 'Employee deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete employee' });
  }
});

// GET /api/admin/holidays - List holidays (Admin & Developer can view)
router.get('/holidays', async (req, res) => {
  try {
    const holidays = await db.all('SELECT * FROM holidays ORDER BY date ASC');
    res.json({ holidays, isDeveloper: req.user.role === 'developer', userRole: req.user.role });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch holidays' });
  }
});

// POST /api/admin/holidays - Add holiday (DEVELOPER ONLY)
router.post('/holidays', requireDeveloper, async (req, res) => {
  const { date, name, description = '' } = req.body;
  if (!date || !name) {
    return res.status(400).json({ error: 'Date and holiday name are required' });
  }

  try {
    await db.run(`
      INSERT INTO holidays (date, name, description)
      VALUES (?, ?, ?)
      ON CONFLICT(date) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description
    `, [date, name.trim(), description || '']);
    res.status(201).json({ message: 'Holiday added successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add holiday' });
  }
});

// DELETE /api/admin/holidays/:id - Delete holiday (DEVELOPER ONLY)
router.delete('/holidays/:id', requireDeveloper, async (req, res) => {
  try {
    await db.run('DELETE FROM holidays WHERE id = ?', [req.params.id]);
    res.json({ message: 'Holiday removed successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to remove holiday' });
  }
});

module.exports = router;
