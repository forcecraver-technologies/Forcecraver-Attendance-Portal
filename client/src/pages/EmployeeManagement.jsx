import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { 
  Users, 
  UserPlus, 
  Search, 
  Edit2, 
  Trash2, 
  CheckCircle2, 
  XCircle, 
  Shield, 
  Code2,
  Mail, 
  Phone, 
  Building2,
  X,
  AlertCircle,
  Eye,
  Palmtree,
  Plus,
  Minus,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  TrendingUp,
  Coffee,
  FileText,
  ArrowLeft,
  ArrowRight,
  UserCheck,
  Edit3,
  CalendarCheck2
} from 'lucide-react';
import { StatsCard } from '../components/StatsCard';
import { AttendanceModal } from '../components/AttendanceModal';
import { ClAdjustModal } from '../components/ClAdjustModal';

export function EmployeeManagement() {
  const { isDeveloper } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Calendar Banner State
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [selectedEmpId, setSelectedEmpId] = useState(null);

  // Calendar Month/Year State
  const now = new Date();
  const [calendarYear, setCalendarYear] = useState(now.getFullYear());
  const [calendarMonth, setCalendarMonth] = useState(now.getMonth() + 1);
  const [calendarData, setCalendarData] = useState(null);
  const [loadingCalendar, setLoadingCalendar] = useState(false);

  // Candidate Add / Edit Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedId, setSelectedId] = useState(null);

  // Quick CL Modal state
  const [clModalOpen, setClModalOpen] = useState(false);
  const [clTargetEmp, setClTargetEmp] = useState(null);

  // Attendance Override Modal state (for Developer editing records from calendar/table)
  const [attendanceModalOpen, setAttendanceModalOpen] = useState(false);
  const [overrideEmp, setOverrideEmp] = useState(null);
  const [overrideDate, setOverrideDate] = useState(null);
  const [overrideRecord, setOverrideRecord] = useState(null);

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('employee');
  const [status, setStatus] = useState('active');
  const [previousCl, setPreviousCl] = useState(0.0);
  const [monthlyCl, setMonthlyCl] = useState(1.0);

  const [formError, setFormError] = useState(null);
  const [formLoading, setFormLoading] = useState(false);

  // Fetch employees list (Filtered to actual employees only)
  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const res = await api.getEmployees();
      const emps = res.employees || [];
      setEmployees(emps);
      
      // If an employee is not selected yet, prepare default
      if (emps.length > 0 && !selectedEmpId) {
        setSelectedEmpId(emps[0].id);
      }
    } catch (err) {
      console.error('Failed to fetch employees:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  // Fetch calendar data for selected employee when banner is open
  const fetchEmployeeCalendar = async (empId, year, month) => {
    if (!empId) return;
    setLoadingCalendar(true);
    try {
      const data = await api.getEmployeeCalendar(empId, year, month);
      setCalendarData(data);
    } catch (err) {
      console.error('Failed to fetch employee calendar:', err);
    } finally {
      setLoadingCalendar(false);
    }
  };

  useEffect(() => {
    if (isCalendarOpen && selectedEmpId) {
      fetchEmployeeCalendar(selectedEmpId, calendarYear, calendarMonth);
    }
  }, [isCalendarOpen, selectedEmpId, calendarYear, calendarMonth]);

  const handlePrevMonth = () => {
    if (calendarMonth === 1) {
      setCalendarMonth(12);
      setCalendarYear(calendarYear - 1);
    } else {
      setCalendarMonth(calendarMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (calendarMonth === 12) {
      setCalendarMonth(1);
      setCalendarYear(calendarYear + 1);
    } else {
      setCalendarMonth(calendarMonth + 1);
    }
  };

  const handleResetToCurrentMonth = () => {
    const cur = new Date();
    setCalendarYear(cur.getFullYear());
    setCalendarMonth(cur.getMonth() + 1);
  };

  const handleOpenCalendarForEmp = (emp) => {
    setSelectedEmpId(emp.id);
    setIsCalendarOpen(true);
    // Smooth scroll up to calendar banner
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCloseCalendar = () => {
    setIsCalendarOpen(false);
  };

  const handleQuickAdjustCl = async (emp, delta) => {
    if (!isDeveloper) return;
    try {
      await api.adjustEmployeeCl(emp.id, { delta });
      await fetchEmployees();
      if (selectedEmpId === emp.id && isCalendarOpen) {
        await fetchEmployeeCalendar(emp.id, calendarYear, calendarMonth);
      }
    } catch (err) {
      alert(err.message || 'Failed to adjust CL');
    }
  };

  const handleOpenAdd = () => {
    if (!isDeveloper) {
      alert('Only Developer can add new candidates');
      return;
    }
    setIsEditing(false);
    setSelectedId(null);
    setName('');
    setEmail('');
    setPassword('');
    setPhone('');
    setRole('employee');
    setStatus('active');
    setPreviousCl(0.0);
    setMonthlyCl(1.0);
    setFormError(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (emp) => {
    if (!isDeveloper) {
      alert('Only Developer can edit candidates');
      return;
    }
    setIsEditing(true);
    setSelectedId(emp.id);
    setName(emp.name);
    setEmail(emp.email);
    setPassword('');
    setPhone(emp.phone || '');
    setRole(emp.role);
    setStatus(emp.status);
    setPreviousCl(emp.previous_cl !== undefined ? emp.previous_cl : 0.0);
    setMonthlyCl(emp.monthly_cl !== undefined ? emp.monthly_cl : 1.0);
    setFormError(null);
    setModalOpen(true);
  };

  const handleDelete = async (id, name) => {
    if (!isDeveloper) {
      alert('Only Developer can delete candidate accounts');
      return;
    }
    if (!window.confirm(`Are you sure you want to remove candidate ${name}? All attendance records will be deleted.`)) return;

    try {
      await api.deleteEmployee(id);
      await fetchEmployees();
      if (selectedEmpId === id) {
        setIsCalendarOpen(false);
        setSelectedEmpId(null);
      }
    } catch (err) {
      alert(err.message || 'Failed to delete employee');
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError(null);

    try {
      if (isEditing) {
        await api.updateEmployee(selectedId, {
          name,
          phone,
          status,
          role,
          previous_cl: parseFloat(previousCl) || 0.0,
          monthly_cl: parseFloat(monthlyCl) !== undefined ? parseFloat(monthlyCl) : 1.0,
          password: password.trim() ? password : undefined,
        });
      } else {
        await api.createEmployee({
          name,
          email,
          password,
          phone,
          role,
          previous_cl: parseFloat(previousCl) || 0.0,
          monthly_cl: parseFloat(monthlyCl) !== undefined ? parseFloat(monthlyCl) : 1.0,
        });
      }

      setModalOpen(false);
      await fetchEmployees();
    } catch (err) {
      setFormError(err.message || 'Failed to save employee');
    } finally {
      setFormLoading(false);
    }
  };

  // Open developer override modal for a day in calendar
  const handleCalendarDayClick = (day) => {
    if (!isDeveloper || day.isWeekend) return;
    const currentEmp = employees.find(e => e.id === selectedEmpId) || calendarData?.user;
    if (!currentEmp) return;

    setOverrideEmp(currentEmp);
    setOverrideDate(day.date);
    setOverrideRecord(day.attendance);
    setAttendanceModalOpen(true);
  };

  // Filter only actual employees (admin & developer excluded)
  const filteredEmployees = employees.filter(emp => {
    if (emp.role === 'admin' || emp.role === 'developer') return false;
    const q = searchQuery.toLowerCase();
    return emp.name.toLowerCase().includes(q) ||
           emp.email.toLowerCase().includes(q) ||
           emp.employee_id.toLowerCase().includes(q);
  });

  const selectedEmployeeObj = employees.find(e => e.id === selectedEmpId) || calendarData?.user;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-800 text-xs font-bold uppercase tracking-wider">
              Employee Management
            </span>
            <span className={`text-xs px-2.5 py-0.5 rounded-md font-bold ${
              isDeveloper ? 'bg-violet-50 text-violet-800 border border-violet-200' : 'bg-slate-100 text-slate-600'
            }`}>
              {isDeveloper ? 'Developer Edit Mode' : 'Admin View Only'}
            </span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight mt-1">
            Candidate & Employee Records
          </h1>
          <p className="text-xs text-slate-500">
            Total active employees: <strong>{employees.filter(e => e.status === 'active' && e.role === 'employee').length}</strong> members • Click "View Calendar" on any employee to open their monthly attendance chart
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Add Candidate Button (Developer Only) */}
          {isDeveloper && (
            <button
              onClick={handleOpenAdd}
              className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Add New Candidate</span>
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* EXPANDABLE CALENDAR BANNER (WITH CLOSE CROSS BUTTON)                      */}
      {/* ========================================================================= */}
      {isCalendarOpen && (
        <div className="bg-white rounded-3xl border-2 border-blue-400 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 space-y-6 p-6 relative">
          
          {/* BANNER HEADER TOOLBAR */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            
            {/* Employee Selector Dropdown inside Banner */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white font-extrabold text-sm flex items-center justify-center shrink-0 shadow-sm">
                <CalendarIcon className="w-5 h-5" />
              </div>

              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Attendance Calendar:
                  </span>
                  
                  {/* EMPLOYEE DROPDOWN SELECTOR */}
                  <select
                    value={selectedEmpId || ''}
                    onChange={(e) => setSelectedEmpId(Number(e.target.value))}
                    className="px-3 py-1.5 bg-blue-50 border border-blue-300 rounded-xl text-xs font-bold text-blue-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  >
                    {filteredEmployees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} ({emp.employee_id})
                      </option>
                    ))}
                  </select>
                </div>

                {selectedEmployeeObj && (
                  <p className="text-[11px] text-slate-500 mt-0.5 font-mono">
                    {selectedEmployeeObj.employee_id} • {selectedEmployeeObj.email}
                  </p>
                )}
              </div>
            </div>

            {/* Right: Month Controls & Prominent [X] CLOSE BUTTON */}
            <div className="flex items-center gap-3 flex-wrap">
              {/* Month Navigator */}
              <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl p-0.5 text-xs">
                <button
                  onClick={handlePrevMonth}
                  className="p-1.5 hover:bg-slate-200 text-slate-700 rounded-lg cursor-pointer transition-colors"
                  title="Previous Month"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-3 font-bold text-slate-900 text-xs min-w-[120px] text-center">
                  {calendarData?.monthName || new Date(calendarYear, calendarMonth - 1).toLocaleDateString('en-US', { month: 'long' })} {calendarYear}
                </span>
                <button
                  onClick={handleNextMonth}
                  className="p-1.5 hover:bg-slate-200 text-slate-700 rounded-lg cursor-pointer transition-colors"
                  title="Next Month"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <button
                onClick={handleResetToCurrentMonth}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                Current Month
              </button>

              <div className="h-6 w-px bg-slate-200 hidden sm:block" />

              {/* ❌ PROMINENT CROSS CLOSE BUTTON */}
              <button
                onClick={handleCloseCalendar}
                className="flex items-center gap-1 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-xs"
                title="Close Calendar Banner"
              >
                <X className="w-4 h-4" />
                <span>Close</span>
              </button>
            </div>
          </div>

          {/* MONTHLY SUMMARY STATS CARDS */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <StatsCard
              title="Monthly Working Days"
              value={`${calendarData?.totalWorkingDaysCount || 0}`}
              subtitle="Mon - Fri Scheduled"
              icon={CalendarIcon}
            />
            <StatsCard
              title="Elapsed Days"
              value={`${calendarData?.elapsedWorkingDays || 0}`}
              subtitle="Till today"
              icon={Clock}
            />
            <StatsCard
              title="Effective Working Days"
              value={`${calendarData?.stats?.effectivePresentDays || 0}`}
              subtitle={`Full: ${calendarData?.stats?.presentCount || 0} | Half: ${calendarData?.stats?.totalHalfDays || 0} | CL: ${calendarData?.stats?.clAdjusted || 0}`}
              icon={CheckCircle2}
            />
            <StatsCard
              title="CL Balance (Remaining)"
              value={`${calendarData?.clSummary?.remaining_cl ?? 0}`}
              subtitle={`Used: ${calendarData?.stats?.clAdjusted || 0} | Excess Unpaid: ${calendarData?.stats?.excessUnpaidLeaves || 0}`}
              icon={Palmtree}
            />
            <StatsCard
              title="Attendance Rate"
              value={`${calendarData?.stats?.attendancePercentage || 0}%`}
              subtitle={`${calendarData?.stats?.absentCount || 0} Absent / Leaves`}
              icon={TrendingUp}
            />
          </div>

          {/* MONTHLY CALENDAR GRID CHART */}
          <div className="bg-slate-50/60 rounded-2xl border border-slate-200 p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 text-xs flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-blue-600" />
                <span className="font-bold text-slate-900">
                  Monthly Attendance Grid — {calendarData?.monthName} {calendarYear}
                </span>
                {isDeveloper && (
                  <span className="text-[10px] bg-violet-100 text-violet-800 px-2 py-0.5 rounded font-bold">
                    💡 Click any day cell to override attendance
                  </span>
                )}
              </div>

              {/* Color Legend */}
              <div className="flex items-center gap-3 text-slate-500 text-[11px] font-medium flex-wrap">
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Present (10-7)</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> 1st Half (10-2)</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-orange-500" /> 2nd Half (2-7)</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-sky-500" /> Casual Leave</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Absent</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-purple-400" /> Holiday</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-slate-300" /> Weekend</span>
              </div>
            </div>

            {loadingCalendar ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                Loading calendar chart...
              </div>
            ) : (
              <div className="grid grid-cols-7 gap-1.5">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                  <div key={d} className="text-center text-[11px] font-bold text-slate-400 py-1 uppercase">
                    {d}
                  </div>
                ))}

                {/* Empty placeholders for month start offset */}
                {calendarData?.calendarDays?.length > 0 && (
                  Array.from({ length: calendarData.calendarDays[0].dayOfWeek }).map((_, i) => (
                    <div key={`empty-${i}`} className="min-h-[58px] bg-transparent" />
                  ))
                )}

                {/* Day Cells */}
                {calendarData?.calendarDays?.map(day => {
                  const att = day.attendance;
                  let badge = null;
                  let cellStyle = 'bg-white border-slate-200 text-slate-700';

                  if (day.isWeekend) {
                    cellStyle = 'bg-slate-100/60 border-slate-200 text-slate-400';
                    badge = 'Weekend';
                  } else if (day.isHoliday) {
                    cellStyle = 'bg-purple-50 border-purple-200 text-purple-800';
                    badge = day.holidayName || 'Holiday';
                  } else if (att) {
                    if (att.status === 'present') {
                      cellStyle = 'bg-emerald-50 border-emerald-300 text-emerald-900 shadow-2xs';
                      badge = 'Present (10-7)';
                    } else if (att.status === 'half_day') {
                      if (att.half_day_slot === '1st_half') {
                        cellStyle = 'bg-amber-50 border-amber-300 text-amber-900 shadow-2xs';
                        badge = '1st Half (10-2)';
                      } else {
                        cellStyle = 'bg-orange-50 border-orange-300 text-orange-900 shadow-2xs';
                        badge = '2nd Half (2-7)';
                      }
                    } else if (att.status === 'casual_leave') {
                      cellStyle = 'bg-sky-50 border-sky-300 text-sky-900 font-bold shadow-2xs';
                      badge = 'Casual Leave';
                    } else if (att.status === 'absent') {
                      cellStyle = 'bg-rose-50 border-rose-300 text-rose-900 shadow-2xs';
                      badge = 'Absent';
                    }
                  } else {
                    const isPast = new Date(day.date) <= new Date();
                    if (isPast) {
                      cellStyle = 'bg-slate-100/80 border-dashed border-slate-300 text-slate-400';
                      badge = 'Unmarked';
                    }
                  }

                  return (
                    <div
                      key={day.date}
                      onClick={() => handleCalendarDayClick(day)}
                      className={`min-h-[62px] p-2 rounded-xl border flex flex-col justify-between transition-all ${cellStyle} ${
                        isDeveloper && !day.isWeekend ? 'hover:shadow-md hover:border-violet-400 cursor-pointer' : ''
                      }`}
                      title={isDeveloper && !day.isWeekend ? `Click to edit attendance for ${day.date}` : day.date}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold">{day.dayNumber}</span>
                        <span className="text-[9px] text-slate-400">{day.dayName}</span>
                      </div>
                      {badge && (
                        <span className="text-[10px] font-semibold truncate text-center block py-0.5 rounded bg-white/80 border border-slate-200/60 shadow-2xs">
                          {badge}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* DETAILED DAILY ATTENDANCE LOG TABLE FOR SELECTED EMPLOYEE */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Daily Attendance Log — {calendarData?.monthName} {calendarYear}
                </h3>
              </div>
              <span className="text-xs text-slate-500">
                Working Days: <strong>{calendarData?.calendarDays?.filter(d => !d.isWeekend).length || 0}</strong>
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
                    <th className="pb-2.5 pl-2">Date</th>
                    <th className="pb-2.5">Day</th>
                    <th className="pb-2.5">Status</th>
                    <th className="pb-2.5">Shift Timing</th>
                    <th className="pb-2.5">Work Mode</th>
                    <th className="pb-2.5">Notes / Remarks</th>
                    {isDeveloper && <th className="pb-2.5 text-right pr-2">Action (Developer)</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(!calendarData?.calendarDays || calendarData.calendarDays.filter(d => !d.isWeekend).length === 0) ? (
                    <tr>
                      <td colSpan={isDeveloper ? 7 : 6} className="py-6 text-center text-slate-400">
                        No working days in this month.
                      </td>
                    </tr>
                  ) : (
                    calendarData.calendarDays.filter(d => !d.isWeekend).map((day) => {
                      const att = day.attendance;
                      return (
                        <tr key={day.date} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-2.5 pl-2 font-mono text-[11px] font-medium text-slate-900">
                            {day.date}
                          </td>
                          <td className="py-2.5 text-slate-600 font-medium">
                            {day.dayName}
                          </td>
                          <td className="py-2.5">
                            {day.isHoliday ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-800 border border-purple-200">
                                🌴 {day.holidayName || 'Holiday'}
                              </span>
                            ) : att ? (
                              att.status === 'present' ? (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                  🟢 Full Day
                                </span>
                              ) : att.status === 'half_day' ? (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                  🟡 {att.half_day_slot === '1st_half' ? '1st Half (10-2)' : '2nd Half (2-7)'}
                                </span>
                              ) : att.status === 'casual_leave' ? (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-50 text-sky-800 border border-sky-200">
                                  🏖️ Casual Leave
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-800 border border-rose-200">
                                  🔴 Absent
                                </span>
                              )
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-400">
                                Unmarked
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 text-slate-600">
                            {att ? (
                              att.status === 'present' ? '10:00 AM - 07:00 PM' :
                              att.status === 'half_day' ? (att.half_day_slot === '1st_half' ? '10:00 AM - 02:00 PM' : '02:00 PM - 07:00 PM') :
                              att.status === 'casual_leave' ? 'Full Day Leave' :
                              '-'
                            ) : '-'}
                          </td>
                          <td className="py-2.5">
                            {att?.work_mode ? (
                              <span className="capitalize text-slate-700 font-medium">
                                {att.work_mode === 'remote' ? '🏠 Remote' : '🏢 Office'}
                              </span>
                            ) : '-'}
                          </td>
                          <td className="py-2.5 text-slate-500 italic max-w-xs truncate">
                            {att?.notes || day.holidayName || '-'}
                          </td>
                          {isDeveloper && (
                            <td className="py-2.5 text-right pr-2">
                              <button
                                onClick={() => handleCalendarDayClick(day)}
                                className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 hover:bg-violet-50 hover:text-violet-700 text-slate-600 rounded-md text-[11px] font-semibold transition-colors cursor-pointer"
                                title="Override Attendance"
                              >
                                <Edit3 className="w-3 h-3" />
                                <span>Override</span>
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Bottom Banner Close Bar */}
          <div className="flex justify-end pt-2">
            <button
              onClick={handleCloseCalendar}
              className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
              <span>Close Calendar Banner</span>
            </button>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* STAFF DIRECTORY TABLE                                                     */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 sm:p-6 space-y-5">
        
        {/* Search Bar & Quick Calendar Selector Dropdown */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="relative w-full max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search candidate name, employee ID, or email..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:border-indigo-500"
            />
          </div>

          {/* Quick Dropdown in table header */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-slate-500 whitespace-nowrap">
              View Calendar:
            </label>
            <select
              value={isCalendarOpen ? (selectedEmpId || '') : ''}
              onChange={(e) => {
                if (e.target.value) {
                  setSelectedEmpId(Number(e.target.value));
                  setIsCalendarOpen(true);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }
              }}
              className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-hidden focus:border-blue-500 cursor-pointer"
            >
              <option value="">Select Employee...</option>
              {filteredEmployees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} ({emp.employee_id})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 uppercase text-[10px] font-bold tracking-wider">
                <th className="pb-3 pl-2">Employee / Member</th>
                <th className="pb-3">Role</th>
                <th className="pb-3">Previous CL</th>
                <th className="pb-3">Monthly CL</th>
                <th className="pb-3">Remaining CL</th>
                <th className="pb-3">Status</th>
                <th className="pb-3 text-center">Calendar Chart</th>
                <th className="pb-3 text-right pr-2">{isDeveloper ? 'Actions (Developer)' : 'Permission'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No employees found matching your search.
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp) => {
                  const cl = emp.clStats;
                  const isCurrentlyOpen = isCalendarOpen && selectedEmpId === emp.id;

                  return (
                    <tr 
                      key={emp.id} 
                      className={`transition-colors ${
                        isCurrentlyOpen ? 'bg-blue-50/50' : 'hover:bg-slate-50/80'
                      }`}
                    >
                      <td className="py-3.5 pl-2">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-xl font-bold text-xs flex items-center justify-center shrink-0 ${
                            isCurrentlyOpen ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-700'
                          }`}>
                            {emp.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 text-xs">{emp.name}</p>
                            <p className="text-[11px] text-slate-400 font-mono">{emp.employee_id} • {emp.email}</p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 text-slate-700">
                          <span className="capitalize">{emp.role}</span>
                        </span>
                      </td>

                      {/* Previous CL with quick + / - Stepper for Developer */}
                      <td className="py-3.5">
                        {isDeveloper ? (
                          <div className="inline-flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg p-0.5">
                            <button
                              type="button"
                              onClick={() => handleQuickAdjustCl(emp, -0.5)}
                              className="p-1 hover:bg-slate-200 text-slate-700 rounded active:scale-95 transition-all cursor-pointer"
                              title="Minus 0.5 CL"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            
                            <button
                              type="button"
                              onClick={() => {
                                setClTargetEmp(emp);
                                setClModalOpen(true);
                              }}
                              className="px-1.5 font-bold text-xs text-slate-900 hover:text-violet-700 hover:underline cursor-pointer"
                              title="Click to edit exact Previous CL"
                            >
                              {emp.previous_cl ?? 0.0}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleQuickAdjustCl(emp, 0.5)}
                              className="p-1 hover:bg-slate-200 text-slate-700 rounded active:scale-95 transition-all cursor-pointer"
                              title="Add 0.5 CL"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs font-semibold text-slate-700">
                            {emp.previous_cl ?? 0.0} Days
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 text-xs font-semibold text-slate-700">
                        +{emp.monthly_cl ?? 1.0} / mo
                      </td>

                      <td className="py-3.5">
                        <span className="inline-flex items-center gap-1 text-sky-800 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded-md text-xs font-bold">
                          <Palmtree className="w-3 h-3 text-sky-600" />
                          {cl?.remaining_cl ?? cl?.available_cl ?? 0} CL Left
                        </span>
                      </td>

                      <td className="py-3.5">
                        {emp.status === 'active' ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md text-[11px] font-bold">
                            <CheckCircle2 className="w-3 h-3" /> Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md text-[11px] font-bold">
                            <XCircle className="w-3 h-3" /> Inactive
                          </span>
                        )}
                      </td>

                      {/* Direct Calendar View Button */}
                      <td className="py-3.5 text-center">
                        <button
                          onClick={() => handleOpenCalendarForEmp(emp)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            isCurrentlyOpen
                              ? 'bg-blue-600 text-white shadow-xs'
                              : 'bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200'
                          }`}
                          title="Open monthly attendance chart banner for this employee"
                        >
                          <CalendarIcon className="w-3.5 h-3.5" />
                          <span>{isCurrentlyOpen ? 'Viewing Calendar' : 'View Calendar'}</span>
                        </button>
                      </td>

                      <td className="py-3.5 text-right pr-2">
                        {isDeveloper ? (
                          <div className="inline-flex items-center gap-2">
                            <button
                              onClick={() => handleOpenEdit(emp)}
                              className="p-1.5 bg-slate-100 hover:bg-violet-50 hover:text-violet-700 text-slate-600 rounded-lg transition-colors cursor-pointer"
                              title="Edit Candidate Details (Developer)"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(emp.id, emp.name)}
                              className="p-1.5 bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-600 rounded-lg transition-colors cursor-pointer"
                              title="Delete Candidate Account (Developer)"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic px-2 py-1 bg-slate-50 rounded-lg">
                            View Only
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Candidate Modal (Developer only) */}
      {modalOpen && isDeveloper && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            <div className="bg-gradient-to-r from-violet-900 to-slate-900 text-white px-6 py-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-violet-600 flex items-center justify-center">
                  <Code2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base">{isEditing ? 'Developer: Edit Candidate' : 'Developer: Add New Candidate'}</h3>
                  <p className="text-xs text-slate-300">Set role, credentials, and Casual Leave quota</p>
                </div>
              </div>
              <button onClick={() => setModalOpen(false)} className="p-1.5 rounded-lg text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs text-rose-800 font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:border-violet-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isEditing}
                    placeholder="emp@portal.com"
                    required
                    className={`w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:border-violet-500 ${
                      isEditing ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'bg-slate-50'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    {isEditing ? 'Password (Leave blank to keep)' : 'Password'}
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={isEditing ? '••••••••' : 'Min 6 chars'}
                    required={!isEditing}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:border-violet-500"
                  />
                </div>
              </div>

              {/* Casual Leave Quota Settings */}
              <div className="p-3.5 bg-sky-50/60 rounded-2xl border border-sky-200/80 space-y-2.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-sky-900">
                  <Palmtree className="w-3.5 h-3.5 text-sky-700" />
                  <span>Casual Leave (CL) Quota Configuration</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Previous / Carried CL
                    </label>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setPreviousCl(prev => Math.max(0, Math.round(((parseFloat(prev) || 0) - 0.5) * 10) / 10))}
                        className="p-1.5 bg-white border border-sky-200 hover:bg-sky-100 rounded-lg text-slate-700 cursor-pointer"
                        title="Minus 0.5"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        value={previousCl}
                        onChange={(e) => setPreviousCl(e.target.value)}
                        placeholder="0.0"
                        className="w-full text-center px-2 py-1.5 bg-white border border-sky-200 rounded-lg text-sm font-bold focus:outline-hidden focus:border-sky-500"
                      />
                      <button
                        type="button"
                        onClick={() => setPreviousCl(prev => Math.round(((parseFloat(prev) || 0) + 0.5) * 10) / 10)}
                        className="p-1.5 bg-white border border-sky-200 hover:bg-sky-100 rounded-lg text-slate-700 cursor-pointer"
                        title="Add 0.5"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Monthly Allotted CL
                    </label>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setMonthlyCl(prev => Math.max(0, Math.round(((parseFloat(prev) || 0) - 0.5) * 10) / 10))}
                        className="p-1.5 bg-white border border-sky-200 hover:bg-sky-100 rounded-lg text-slate-700 cursor-pointer"
                        title="Minus 0.5"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        value={monthlyCl}
                        onChange={(e) => setMonthlyCl(e.target.value)}
                        placeholder="1.0"
                        className="w-full text-center px-2 py-1.5 bg-white border border-sky-200 rounded-lg text-sm font-bold focus:outline-hidden focus:border-sky-500"
                      />
                      <button
                        type="button"
                        onClick={() => setMonthlyCl(prev => Math.round(((parseFloat(prev) || 0) + 0.5) * 10) / 10)}
                        className="p-1.5 bg-white border border-sky-200 hover:bg-sky-100 rounded-lg text-slate-700 cursor-pointer"
                        title="Add 0.5"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
                <p className="text-[10px] text-sky-700">
                  Total Available = {Math.round(((parseFloat(previousCl) || 0) + (parseFloat(monthlyCl) || 0)) * 10) / 10} CL
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 9876543210"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:border-violet-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Role</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:border-violet-500"
                  >
                    <option value="employee">Employee / Candidate</option>
                  </select>
                </div>
              </div>

              {isEditing && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Account Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:border-violet-500"
                  >
                    <option value="active">Active (Can Login & Mark Attendance)</option>
                    <option value="inactive">Inactive / Suspended</option>
                  </select>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-5 py-2 text-sm font-semibold text-white bg-violet-600 hover:bg-violet-700 rounded-xl shadow-md shadow-violet-600/20 cursor-pointer"
                >
                  {formLoading ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Candidate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick CL Adjuster Modal */}
      {clTargetEmp && isDeveloper && (
        <ClAdjustModal
          isOpen={clModalOpen}
          onClose={() => {
            setClModalOpen(false);
            setClTargetEmp(null);
          }}
          employee={clTargetEmp}
          onSaved={async () => {
            await fetchEmployees();
            if (selectedEmpId && isCalendarOpen) {
              await fetchEmployeeCalendar(selectedEmpId, calendarYear, calendarMonth);
            }
          }}
        />
      )}

      {/* Developer Attendance Override Modal */}
      {attendanceModalOpen && isDeveloper && overrideEmp && (
        <AttendanceModal
          isOpen={attendanceModalOpen}
          onClose={() => {
            setAttendanceModalOpen(false);
            setOverrideEmp(null);
            setOverrideDate(null);
            setOverrideRecord(null);
          }}
          employee={overrideEmp}
          date={overrideDate}
          initialRecord={overrideRecord}
          onSaved={async () => {
            await fetchEmployees();
            if (selectedEmpId && isCalendarOpen) {
              await fetchEmployeeCalendar(selectedEmpId, calendarYear, calendarMonth);
            }
          }}
        />
      )}

    </div>
  );
}
