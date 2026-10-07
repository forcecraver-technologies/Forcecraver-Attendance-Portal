/**
 * Date and Working Days Utilities
 */

// Format a Date object to YYYY-MM-DD
function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Check if a date string (YYYY-MM-DD) is a weekend (Saturday=6 or Sunday=0)
function isWeekend(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  const dayOfWeek = date.getDay();
  return dayOfWeek === 0 || dayOfWeek === 6;
}

// Get day of week name
function getDayName(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('en-US', { weekday: 'long' });
}

// Get total working days (Mon-Fri) in a given month and year
function getMonthWorkingDays(year, month, holidays = []) {
  // month is 1-indexed (1 = Jan, 12 = Dec)
  const totalDays = new Date(year, month, 0).getDate();
  const workingDays = [];
  const holidaySet = new Set(holidays);

  for (let day = 1; day <= totalDays; day++) {
    const date = new Date(year, month - 1, day);
    const dayOfWeek = date.getDay();
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    // Mon = 1, Tue = 2, Wed = 3, Thu = 4, Fri = 5
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      const isHoliday = holidaySet.has(dateStr);
      workingDays.push({
        date: dateStr,
        dayNumber: day,
        dayName: date.toLocaleDateString('en-US', { weekday: 'short' }),
        isHoliday,
      });
    }
  }

  const holidaysCount = workingDays.filter(d => d.isHoliday).length;

  return {
    totalDaysInMonth: totalDays,
    totalWorkingDaysCount: workingDays.length, // Mon-Fri working days in month
    holidaysCount,
    workingDaysList: workingDays,
  };
}

// Calculate elapsed working days in the month up to a target date (default today)
function getElapsedWorkingDays(year, month, targetDateStr = null, holidays = []) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const currentDay = now.getDate();

  const totalDays = new Date(year, month, 0).getDate();
  let maxDay = totalDays;

  if (year === currentYear && month === currentMonth) {
    maxDay = currentDay;
  } else if (year > currentYear || (year === currentYear && month > currentMonth)) {
    maxDay = 0; // Future month
  }

  let elapsedWorkingDaysCount = 0;

  for (let day = 1; day <= maxDay; day++) {
    const date = new Date(year, month - 1, day);
    const dayOfWeek = date.getDay();

    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      elapsedWorkingDaysCount++;
    }
  }

  return elapsedWorkingDaysCount;
}

// Format current time into "hh:mm AM/PM"
function getCurrentTimeString() {
  const now = new Date();
  return now.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

// Slot timing constants
const TIMING_CONFIG = {
  full_day: {
    label: 'Full Day (Present)',
    timing: '10:00 AM - 07:00 PM',
    hours: 9,
    weight: 1.0,
  },
  '1st_half': {
    label: '1st Half Day',
    timing: '10:00 AM - 02:00 PM',
    hours: 4,
    weight: 0.5,
  },
  '2nd_half': {
    label: '2nd Half Day',
    timing: '02:00 PM - 07:00 PM',
    hours: 5,
    weight: 0.5,
  },
  absent: {
    label: 'Absent / On Leave',
    timing: 'N/A',
    hours: 0,
    weight: 0.0,
  }
};

module.exports = {
  formatDate,
  isWeekend,
  getDayName,
  getMonthWorkingDays,
  getElapsedWorkingDays,
  getCurrentTimeString,
  TIMING_CONFIG,
};
