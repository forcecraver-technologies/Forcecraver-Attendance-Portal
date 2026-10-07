const express = require('express');
const router = express.Router();
const db = require('../db');
const { getUserClStats } = require('../db');
const { authenticateToken } = require('../middleware/auth');
const {
  formatDate,
  isWeekend,
  getDayName,
  getMonthWorkingDays,
  getElapsedWorkingDays,
  getCurrentTimeString,
  TIMING_CONFIG,
} = require('../utils/dateUtils');

// GET /api/attendance/today - Get today's attendance status & validation info for current user
router.get('/today', authenticateToken, async (req, res) => {
  try {
    const today = new Date();
    const todayStr = formatDate(today);
    const dayName = getDayName(todayStr);
    const weekend = isWeekend(todayStr);

    // Check if company holiday
    const holiday = await db.get('SELECT * FROM holidays WHERE date = ?', [todayStr]);
    const record = await db.get('SELECT * FROM attendance WHERE user_id = ? AND date = ?', [req.user.id, todayStr]);
    const clSummary = await getUserClStats(req.user.id, today.getFullYear(), today.getMonth() + 1);

    const canMark = !weekend && !holiday;
    let restrictionReason = null;
    let attendanceData = record || null;

    if (holiday && !weekend && !record) {
      attendanceData = {
        id: `holiday-${holiday.id}`,
        user_id: req.user.id,
        date: todayStr,
        status: 'present',
        work_mode: 'office',
        check_in_time: '10:00 AM',
        check_out_time: '07:00 PM',
        notes: `Official Holiday: ${holiday.name} (Auto-Present)`,
        is_holiday: true,
      };
    }

    if (weekend) {
      restrictionReason = `Today is ${dayName} (Weekend). Attendance portal only accepts attendance Monday to Friday.`;
    } else if (holiday) {
      restrictionReason = `Today is an Official Forcecraver Holiday: ${holiday.name}. All employees are automatically marked Present (Paid Working Day).`;
    }

    res.json({
      date: todayStr,
      dayName,
      isWeekend: weekend,
      isHoliday: !!holiday,
      holidayInfo: holiday || null,
      canMark,
      restrictionReason,
      attendance: attendanceData,
      clSummary,
      timingConfig: TIMING_CONFIG,
    });
  } catch (err) {
    console.error('Error fetching today attendance:', err);
    res.status(500).json({ error: 'Failed to fetch today attendance' });
  }
});

// POST /api/attendance/mark - Self attendance marking (Monday to Friday only)
router.post('/mark', authenticateToken, async (req, res) => {
  const { status, half_day_slot, work_mode = 'office', notes = '', customDate } = req.body;

  try {
    const today = new Date();
    const targetDateStr = customDate || formatDate(today);
    const dayName = getDayName(targetDateStr);

    // 1. Mon - Fri Rule Check
    if (isWeekend(targetDateStr)) {
      return res.status(400).json({
        error: `Cannot mark attendance on weekends (${dayName}). Attendance is strictly enabled Monday to Friday only.`,
      });
    }

    // Check if company holiday
    const holiday = await db.get('SELECT * FROM holidays WHERE date = ?', [targetDateStr]);
    if (holiday) {
      return res.status(400).json({
        error: `Cannot mark attendance today. It is an official Company Holiday: ${holiday.name} (Paid Holiday).`,
      });
    }

    // 2. Validate status
    if (!['present', 'half_day', 'absent', 'unmarked'].includes(status)) {
      return res.status(400).json({
        error: 'Invalid attendance status. Must be "present", "half_day", "absent", or "unmarked".',
      });
    }

    // Handle Unmarked (Reset attendance)
    if (status === 'unmarked') {
      await db.run('DELETE FROM attendance WHERE user_id = ? AND date = ?', [req.user.id, targetDateStr]);
      const clSummary = await getUserClStats(req.user.id, today.getFullYear(), today.getMonth() + 1);
      return res.json({
        message: 'Attendance reset to Unmarked successfully.',
        attendance: null,
        clSummary,
      });
    }

    // 3. Validate half day slot if half_day
    let finalSlot = null;
    let checkIn = null;
    let checkOut = null;

    const currentTime = getCurrentTimeString();
    const cleanWorkMode = work_mode === 'remote' ? 'remote' : 'office';

    if (status === 'half_day') {
      if (!half_day_slot || !['1st_half', '2nd_half'].includes(half_day_slot)) {
        return res.status(400).json({
          error: 'Please select half day slot: 1st Half (10 AM - 2 PM) or 2nd Half (2 PM - 7 PM)',
        });
      }
      finalSlot = half_day_slot;
      if (finalSlot === '1st_half') {
        checkIn = currentTime || '10:00 AM';
        checkOut = '02:00 PM';
      } else {
        checkIn = currentTime || '02:00 PM';
        checkOut = '07:00 PM';
      }
    } else if (status === 'present') {
      checkIn = currentTime || '10:00 AM';
      checkOut = '07:00 PM';
    } else if (status === 'absent') {
      checkIn = null;
      checkOut = null;
    }

    // 4. Insert or Update (Upsert)
    const existing = await db.get('SELECT id FROM attendance WHERE user_id = ? AND date = ?', [req.user.id, targetDateStr]);

    if (existing) {
      await db.run(`
        UPDATE attendance
        SET status = ?,
            half_day_slot = ?,
            check_in_time = ?,
            check_out_time = ?,
            work_mode = ?,
            notes = ?,
            marked_by = 'self',
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [status, finalSlot, checkIn, checkOut, cleanWorkMode, notes, existing.id]);
    } else {
      await db.run(`
        INSERT INTO attendance (user_id, date, status, half_day_slot, check_in_time, check_out_time, work_mode, notes, marked_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'self')
      `, [req.user.id, targetDateStr, status, finalSlot, checkIn, checkOut, cleanWorkMode, notes]);
    }

    const savedRecord = await db.get('SELECT * FROM attendance WHERE user_id = ? AND date = ?', [req.user.id, targetDateStr]);
    const updatedClSummary = await getUserClStats(req.user.id, today.getFullYear(), today.getMonth() + 1);

    let successMsg = `Attendance marked successfully as ${status === 'absent' ? 'ABSENT' : status.toUpperCase()}!`;
    if (status === 'half_day') {
      successMsg = `Half Day marked (${finalSlot === '1st_half' ? '1st Half: 10 AM - 2 PM' : '2nd Half: 2 PM - 7 PM'})!`;
    }

    res.json({
      message: successMsg,
      attendance: savedRecord,
      clSummary: updatedClSummary,
    });
  } catch (err) {
    console.error('Error marking attendance:', err);
    res.status(500).json({ error: 'Failed to record attendance' });
  }
});

// GET /api/attendance/my-stats - Monthly attendance history and stats for current employee
router.get('/my-stats', authenticateToken, async (req, res) => {
  try {
    const now = new Date();
    const year = parseInt(req.query.year, 10) || now.getFullYear();
    const month = parseInt(req.query.month, 10) || (now.getMonth() + 1);

    // Get holidays using universal SUBSTR
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
    `, [req.user.id, monthPattern]);

    // Build map for quick lookup
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

    // Weekday holidays count as present working days by default
    const totalPresentDays = presentCount + holidaysCount;
    const totalHalfDays = halfDay1stCount + halfDay2ndCount;
    const clSummary = await getUserClStats(req.user.id, year, month);

    // Effective present days: Total Present (including weekday holidays) + Half Present (0.5) + Casual Leave Adjusted (Paid Leave)
    const effectivePresentDays = Math.round((totalPresentDays + (totalHalfDays * 0.5) + clSummary.cl_adjusted) * 10) / 10;

    // Attendance percentage based on elapsed working days
    const attendancePercentage = elapsedWorkingDays > 0
      ? Math.min(100, Math.round((effectivePresentDays / elapsedWorkingDays) * 100))
      : 0;

    // Monthly day-by-day complete calendar dataset
    const calendarDays = [];
    for (let d = 1; d <= totalDaysInMonth; d++) {
      const dayDate = new Date(year, month - 1, d);
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayOfWeek = dayDate.getDay();
      const isWeekendDay = dayOfWeek === 0 || dayOfWeek === 6;
      const isHolidayDay = holidayDates.includes(dateStr);
      const holidayObj = holidaysRows.find(h => h.date === dateStr);
      let att = recordMap[dateStr] || null;

      // If holiday falls on a weekday and no manual override, default to present!
      if (!isWeekendDay && isHolidayDay && !att) {
        att = {
          status: 'present',
          work_mode: 'office',
          check_in_time: '10:00 AM',
          check_out_time: '07:00 PM',
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
        isWorkingDay: !isWeekendDay,
        isHoliday: isHolidayDay,
        holidayName: holidayObj ? holidayObj.name : null,
        attendance: att,
      });
    }

    res.json({
      year,
      month,
      monthName: new Date(year, month - 1, 1).toLocaleDateString('en-US', { month: 'long' }),
      totalDaysInMonth,
      totalWorkingDaysCount,
      elapsedWorkingDays,
      clSummary,
      stats: {
        presentCount: totalPresentDays,
        workedPresentCount: presentCount,
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
        unmarkedCount: Math.max(0, elapsedWorkingDays - (presentCount + totalHalfDays + absentCount)),
        attendancePercentage,
      },
      records,
      calendarDays,
    });
  } catch (err) {
    console.error('Error calculating attendance stats:', err);
    res.status(500).json({ error: 'Failed to calculate attendance statistics' });
  }
});

module.exports = router;
