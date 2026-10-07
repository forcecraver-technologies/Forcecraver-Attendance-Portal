import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import confetti from 'canvas-confetti';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  ChevronLeft, 
  ChevronRight, 
  TrendingUp, 
  Coffee,
  Palmtree,
  RotateCcw,
  CalendarCheck2,
  History,
  FileText,
  ArrowRight,
  ArrowLeft
} from 'lucide-react';
import { StatsCard } from '../components/StatsCard';

export function EmployeeDashboard({ activeTab = 'emp-dashboard', setActiveTab }) {
  const { user } = useAuth();

  // Local tab state fallback if setActiveTab is not passed
  const [internalTab, setInternalTab] = useState(activeTab);

  useEffect(() => {
    setInternalTab(activeTab);
  }, [activeTab]);

  const currentTab = activeTab || internalTab;

  const handleTabChange = (tabId) => {
    setInternalTab(tabId);
    if (setActiveTab) {
      setActiveTab(tabId);
    }
  };

  const [todayInfo, setTodayInfo] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState('present'); // 'present', 'half_day_1', 'half_day_2', 'absent'
  const [selectedWorkMode, setSelectedWorkMode] = useState('office'); // 'office', 'remote'
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [actionMessage, setActionMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [monthlyStats, setMonthlyStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);

  const fetchTodayStatus = async () => {
    try {
      const data = await api.getTodayAttendance();
      setTodayInfo(data);
      if (data.attendance) {
        if (data.attendance.status === 'half_day') {
          setSelectedStatus(data.attendance.half_day_slot === '2nd_half' ? 'half_day_2' : 'half_day_1');
        } else {
          setSelectedStatus(data.attendance.status || 'present');
        }
        setSelectedWorkMode(data.attendance.work_mode || 'office');
        setNotes(data.attendance.notes || '');
      } else {
        setSelectedStatus('present');
        setNotes('');
      }
    } catch (err) {
      console.error('Failed to load today attendance:', err);
    }
  };

  const fetchMonthlyData = async (year, month) => {
    setLoadingStats(true);
    try {
      const data = await api.getMyStats(year, month);
      setMonthlyStats(data);
    } catch (err) {
      console.error('Failed to load monthly stats:', err);
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    fetchTodayStatus();
  }, []);

  useEffect(() => {
    fetchMonthlyData(selectedYear, selectedMonth);
  }, [selectedYear, selectedMonth]);

  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
  };

  const handleResetToCurrentMonth = () => {
    const cur = new Date();
    setSelectedYear(cur.getFullYear());
    setSelectedMonth(cur.getMonth() + 1);
  };

  const handleSubmitAttendance = async (e) => {
    e.preventDefault();
    if (!todayInfo?.canMark) return;

    setSubmitting(true);
    setActionMessage(null);
    setErrorMessage(null);

    try {
      let finalStatus = selectedStatus;
      let finalSlot = null;

      if (selectedStatus === 'half_day_1') {
        finalStatus = 'half_day';
        finalSlot = '1st_half';
      } else if (selectedStatus === 'half_day_2') {
        finalStatus = 'half_day';
        finalSlot = '2nd_half';
      }

      const payload = {
        status: finalStatus,
        half_day_slot: finalSlot,
        work_mode: selectedWorkMode,
        notes: finalStatus === 'present' ? '' : notes.trim(),
      };

      const res = await api.markAttendance(payload);
      setActionMessage(res.message);

      try {
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
      } catch (err) {}

      await fetchTodayStatus();
      await fetchMonthlyData(selectedYear, selectedMonth);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to update attendance');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetToUnmarked = async () => {
    if (!window.confirm("Are you sure you want to reset today's attendance back to Unmarked?")) {
      return;
    }

    setSubmitting(true);
    setActionMessage(null);
    setErrorMessage(null);

    try {
      const res = await api.markAttendance({ status: 'unmarked' });
      setActionMessage(res.message || 'Attendance reset to Unmarked');
      setSelectedStatus('present');
      setNotes('');
      await fetchTodayStatus();
      await fetchMonthlyData(selectedYear, selectedMonth);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to reset attendance');
    } finally {
      setSubmitting(false);
    }
  };

  const isAlreadyMarkedToday = !!todayInfo?.attendance;
  const clStats = todayInfo?.clSummary || monthlyStats?.clSummary;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      
      {/* Light Clean Header with Casual Leave Balance Summary */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Welcome, {user?.name}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {user?.employee_id} • Employee Portal
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* CL Balance Pill */}
          <div className="flex items-center gap-2.5 bg-sky-50 border border-sky-200 text-sky-900 px-3.5 py-2 rounded-xl text-xs shadow-xs">
            <Palmtree className="w-4 h-4 text-sky-600 shrink-0" />
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-bold">Casual Leave Balance:</span>
                <strong className="text-sky-700 bg-sky-100/70 px-1.5 py-0.5 rounded text-[11px]">
                  {clStats?.remaining_cl ?? 0} Days Left
                </strong>
                {clStats?.excess_unpaid_leaves > 0 && (
                  <span className="text-[10px] bg-rose-100 text-rose-800 font-bold px-1.5 py-0.5 rounded">
                    ⚠️ {clStats?.excess_unpaid_leaves} Unpaid Leave(s)
                  </span>
                )}
                {clStats?.total_leaves_taken === 0 && (
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded">
                    +1.0 CL added to balance
                  </span>
                )}
              </div>
              <span className="text-[10px] text-sky-700 block mt-0.5">
                Previous ({clStats?.previous_cl ?? 0}) + Monthly (+{clStats?.monthly_cl ?? 1}) - Leaves Taken ({clStats?.cl_adjusted ?? 0}) = <strong>{clStats?.remaining_cl ?? 0} CL Remaining</strong>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-600 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200">
            <Clock className="w-3.5 h-3.5 text-blue-600" />
            <span>Shift: <strong>Mon - Fri, 10 AM - 7 PM</strong></span>
          </div>
        </div>
      </div>

      {/* Main View Switcher Tabs (Today Attendance vs Monthly History) */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => handleTabChange('emp-dashboard')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            currentTab === 'emp-dashboard'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Today's Attendance</span>
          {isAlreadyMarkedToday && (
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1 ${
              todayInfo.attendance.status === 'present'
                ? (currentTab === 'emp-dashboard' ? 'bg-emerald-500 text-white' : 'bg-emerald-100 text-emerald-800 border border-emerald-300')
                : todayInfo.attendance.status === 'half_day'
                ? (currentTab === 'emp-dashboard' ? 'bg-amber-500 text-white' : 'bg-amber-100 text-amber-800 border border-amber-300')
                : (currentTab === 'emp-dashboard' ? 'bg-rose-500 text-white' : 'bg-rose-100 text-rose-800 border border-rose-300')
            }`}>
              ✓ Marked
            </span>
          )}
        </button>

        <button
          onClick={() => handleTabChange('emp-calendar')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            currentTab === 'emp-calendar'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <CalendarCheck2 className="w-3.5 h-3.5" />
          <span>Monthly History & Calendar</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold ${
            currentTab === 'emp-calendar' ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-600'
          }`}>
            {monthlyStats?.monthName || 'Month'}
          </span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: TODAY'S ATTENDANCE VIEW                                            */}
      {/* ========================================================================= */}
      {currentTab === 'emp-dashboard' && (
        <div className="space-y-6">
          
          {/* TODAY'S ATTENDANCE CARD - Persistently Colored Container */}
          <div className={`rounded-2xl border transition-all p-6 space-y-5 ${
            isAlreadyMarkedToday && todayInfo.attendance.status === 'present'
              ? 'bg-gradient-to-b from-emerald-50/70 via-emerald-50/30 to-white border-emerald-300 ring-2 ring-emerald-500/20 shadow-md'
              : isAlreadyMarkedToday && todayInfo.attendance.status === 'half_day'
              ? 'bg-gradient-to-b from-amber-50/70 via-amber-50/30 to-white border-amber-300 ring-2 ring-amber-500/20 shadow-md'
              : isAlreadyMarkedToday && todayInfo.attendance.status === 'absent'
              ? 'bg-gradient-to-b from-rose-50/70 via-rose-50/30 to-white border-rose-300 ring-2 ring-rose-500/20 shadow-md'
              : 'bg-white border-slate-200 shadow-xs'
          }`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200/80">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-slate-900">
                    Today's Attendance Marking
                  </h2>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                    isAlreadyMarkedToday && todayInfo.attendance.status === 'present'
                      ? 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                      : isAlreadyMarkedToday && todayInfo.attendance.status === 'half_day'
                      ? 'bg-amber-100 text-amber-900 border border-amber-200'
                      : isAlreadyMarkedToday && todayInfo.attendance.status === 'absent'
                      ? 'bg-rose-100 text-rose-900 border border-rose-200'
                      : 'bg-slate-100 text-slate-700'
                  }`}>
                    {isAlreadyMarkedToday ? 'Attendance Recorded' : 'Daily Schedule'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {todayInfo?.dayName}, {todayInfo?.date}
                </p>
              </div>

              {/* Today's Status Pill */}
              <div>
                {todayInfo?.isWeekend ? (
                  <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 shadow-2xs">
                    <Coffee className="w-4 h-4 text-amber-600" /> Weekend Rest Day
                  </span>
                ) : todayInfo?.isHoliday ? (
                  <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-purple-50 text-purple-800 border border-purple-200 shadow-2xs">
                    <Palmtree className="w-4 h-4 text-purple-600" /> Holiday: {todayInfo?.holidayInfo?.name || 'Official Holiday'}
                  </span>
                ) : isAlreadyMarkedToday ? (
                  <span className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold shadow-xs ring-2 ${
                    todayInfo.attendance.status === 'present' 
                      ? 'bg-emerald-600 text-white ring-emerald-300 shadow-emerald-600/30' 
                      : todayInfo.attendance.status === 'half_day' 
                        ? 'bg-amber-500 text-white ring-amber-300 shadow-amber-500/30'
                        : 'bg-rose-600 text-white ring-rose-300 shadow-rose-600/30'
                  }`}>
                    <CheckCircle2 className="w-4 h-4" />
                    Marked: {todayInfo.attendance.status === 'present' 
                      ? 'Full Day Present (10 AM - 7 PM)' 
                      : todayInfo.attendance.status === 'half_day' 
                        ? `Half Day (${todayInfo.attendance.half_day_slot === '1st_half' ? '1st Half: 10-2 PM' : '2nd Half: 2-7 PM'})`
                        : 'Absent / Full Day Leave'}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 shadow-2xs">
                    <AlertCircle className="w-4 h-4 text-amber-600" /> Pending (Not Marked Yet)
                  </span>
                )}
              </div>
            </div>

            {/* Weekend or Holiday Restriction Notice */}
            {todayInfo?.isWeekend && (
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 flex items-center gap-2">
                <Coffee className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Today is <strong>{todayInfo.dayName}</strong>. Attendance is strictly scheduled Monday to Friday. Enjoy your weekend!</span>
              </div>
            )}

            {todayInfo?.isHoliday && (
              <div className="p-4 bg-purple-50 rounded-xl border border-purple-200 text-xs text-purple-800 flex items-center gap-2">
                <Palmtree className="w-4 h-4 text-purple-600 shrink-0" />
                <span>Today is a Forcecraver Holiday: <strong>{todayInfo?.holidayInfo?.name}</strong>. Included in the working days schedule. Attendance marking is not required.</span>
              </div>
            )}

            {/* Working Day Form */}
            {todayInfo?.canMark && (
              <form onSubmit={handleSubmitAttendance} className="space-y-5">
                {actionMessage && (
                  <div className="p-3.5 bg-emerald-100/80 border border-emerald-300 rounded-xl text-xs font-bold text-emerald-900 flex items-center gap-2 animate-in fade-in duration-150">
                    <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                    <span>{actionMessage}</span>
                  </div>
                )}

                {errorMessage && (
                  <div className="p-3.5 bg-rose-100/80 border border-rose-300 rounded-xl text-xs font-bold text-rose-900 flex items-center gap-2 animate-in fade-in duration-150">
                    <AlertCircle className="w-4 h-4 text-rose-700 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                {/* Persistent Active Status Summary Pill */}
                {isAlreadyMarkedToday && !actionMessage && (
                  <div className={`p-3.5 rounded-xl border flex items-center justify-between gap-2 text-xs font-medium ${
                    todayInfo.attendance.status === 'present'
                      ? 'bg-emerald-100/60 border-emerald-300 text-emerald-950'
                      : todayInfo.attendance.status === 'half_day'
                      ? 'bg-amber-100/60 border-amber-300 text-amber-950'
                      : 'bg-rose-100/60 border-rose-300 text-rose-950'
                  }`}>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className={`w-4 h-4 shrink-0 ${
                        todayInfo.attendance.status === 'present' ? 'text-emerald-700' : todayInfo.attendance.status === 'half_day' ? 'text-amber-700' : 'text-rose-700'
                      }`} />
                      <span>
                        Status for today: <strong>{
                          todayInfo.attendance.status === 'present'
                            ? 'Full Day (10:00 AM - 07:00 PM)'
                            : todayInfo.attendance.status === 'half_day'
                            ? `Half Day (${todayInfo.attendance.half_day_slot === '1st_half' ? '1st Half: 10 AM - 2 PM' : '2nd Half: 2 PM - 7 PM'})`
                            : 'Full Day Leave / Absent'
                        }</strong> ({todayInfo.attendance.work_mode === 'remote' ? '🏠 Remote' : '🏢 Office'})
                      </span>
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-white/80 border border-slate-200/60 shadow-2xs shrink-0">
                      Saved in System
                    </span>
                  </div>
                )}

                {/* Attendance Options - 4 Distinctly Colored Cards */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                    Choose Attendance Option for Today:
                  </label>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    
                    {/* 1. Full Day */}
                    <div
                      onClick={() => setSelectedStatus('present')}
                      className={`p-4 rounded-xl border cursor-pointer transition-all ${
                        selectedStatus === 'present'
                          ? 'border-emerald-500 bg-emerald-100/70 ring-2 ring-emerald-500 text-emerald-950 shadow-xs'
                          : 'border-slate-200 hover:border-emerald-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-slate-900">🟢 Full Day</span>
                        {selectedStatus === 'present' ? (
                          <span className="text-[10px] bg-emerald-700 text-white font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5">
                            ✓ Selected
                          </span>
                        ) : (
                          <span className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-medium">1.0 Day</span>
                        )}
                      </div>
                      <p className="text-xs text-emerald-800 font-bold mt-1.5">10:00 AM - 07:00 PM</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">Regular 9 hr working shift</p>
                    </div>

                    {/* 2. 1st Half */}
                    <div
                      onClick={() => setSelectedStatus('half_day_1')}
                      className={`p-4 rounded-xl border cursor-pointer transition-all ${
                        selectedStatus === 'half_day_1'
                          ? 'border-amber-500 bg-amber-100/70 ring-2 ring-amber-500 text-amber-950 shadow-xs'
                          : 'border-slate-200 hover:border-amber-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-slate-900">🟡 1st Half</span>
                        {selectedStatus === 'half_day_1' ? (
                          <span className="text-[10px] bg-amber-700 text-white font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5">
                            ✓ Selected
                          </span>
                        ) : (
                          <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-medium">0.5 Day</span>
                        )}
                      </div>
                      <p className="text-xs text-amber-900 font-bold mt-1.5">10:00 AM - 02:00 PM</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">Morning 4 hr shift</p>
                    </div>

                    {/* 3. 2nd Half */}
                    <div
                      onClick={() => setSelectedStatus('half_day_2')}
                      className={`p-4 rounded-xl border cursor-pointer transition-all ${
                        selectedStatus === 'half_day_2'
                          ? 'border-orange-500 bg-orange-100/70 ring-2 ring-orange-500 text-orange-950 shadow-xs'
                          : 'border-slate-200 hover:border-orange-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-slate-900">🟠 2nd Half</span>
                        {selectedStatus === 'half_day_2' ? (
                          <span className="text-[10px] bg-orange-700 text-white font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5">
                            ✓ Selected
                          </span>
                        ) : (
                          <span className="text-[10px] bg-orange-100 text-orange-800 px-1.5 py-0.5 rounded font-medium">0.5 Day</span>
                        )}
                      </div>
                      <p className="text-xs text-orange-900 font-bold mt-1.5">02:00 PM - 07:00 PM</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">Evening 5 hr shift</p>
                    </div>

                    {/* 4. Absent */}
                    <div
                      onClick={() => setSelectedStatus('absent')}
                      className={`p-4 rounded-xl border cursor-pointer transition-all ${
                        selectedStatus === 'absent'
                          ? 'border-rose-500 bg-rose-100/70 ring-2 ring-rose-500 text-rose-950 shadow-xs'
                          : 'border-slate-200 hover:border-rose-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-slate-900">🔴 Absent</span>
                        {selectedStatus === 'absent' ? (
                          <span className="text-[10px] bg-rose-700 text-white font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5">
                            ✓ Selected
                          </span>
                        ) : (
                          <span className="text-[10px] bg-rose-100 text-rose-800 px-1.5 py-0.5 rounded font-medium">0.0 Day</span>
                        )}
                      </div>
                      <p className="text-xs text-rose-800 font-bold mt-1.5">Full Day Leave</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">Adjusted from CL quota</p>
                    </div>

                  </div>
                </div>

                {/* 1. Full Day: Only Work Location (No Work Notes needed) */}
                {selectedStatus === 'present' && (
                  <div className="pt-1 max-w-xs">
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                      Work Location
                    </label>
                    <div className="flex rounded-lg bg-slate-100 p-1 border border-slate-200">
                      <button
                        type="button"
                        onClick={() => setSelectedWorkMode('office')}
                        className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                          selectedWorkMode === 'office'
                            ? 'bg-white text-slate-900 shadow-xs font-bold'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        🏢 Office
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedWorkMode('remote')}
                        className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                          selectedWorkMode === 'remote'
                            ? 'bg-white text-slate-900 shadow-xs font-bold'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        🏠 Remote (WFH)
                      </button>
                    </div>
                  </div>
                )}

                {/* 2. Half Day: Work Location + Half Day Reason / Work Notes */}
                {(selectedStatus === 'half_day_1' || selectedStatus === 'half_day_2') && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                        Work Location
                      </label>
                      <div className="flex rounded-lg bg-slate-100 p-1 border border-slate-200">
                        <button
                          type="button"
                          onClick={() => setSelectedWorkMode('office')}
                          className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                            selectedWorkMode === 'office'
                              ? 'bg-white text-slate-900 shadow-xs font-bold'
                              : 'text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          🏢 Office
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedWorkMode('remote')}
                          className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                            selectedWorkMode === 'remote'
                              ? 'bg-white text-slate-900 shadow-xs font-bold'
                              : 'text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          🏠 Remote (WFH)
                        </button>
                      </div>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                        Half Day Reason / Work Notes <span className="text-[10px] text-slate-400 font-normal">(Optional)</span>
                      </label>
                      <input
                        type="text"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="e.g. Doctor appointment, personal work, sprint updates..."
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:border-blue-500"
                      />
                    </div>
                  </div>
                )}

                {/* 3. Absent / Leave: Reason for Absence Required */}
                {selectedStatus === 'absent' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Reason for Absence / Leave <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="e.g. Sick leave, personal emergency, family function..."
                      required
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:border-blue-500"
                    />
                  </div>
                )}

                {/* Action Buttons */}
                <div className="pt-2 flex items-center justify-between flex-wrap gap-3 border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    {isAlreadyMarkedToday && (
                      <button
                        type="button"
                        onClick={handleResetToUnmarked}
                        disabled={submitting}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 text-slate-600 hover:text-rose-700 bg-slate-100 hover:bg-rose-50 border border-slate-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                        title="Clear and reset today's record back to Unmarked"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Reset to Unmarked</span>
                      </button>
                    )}
                    <span className="text-[11px] text-slate-400">
                      You can update this record anytime before shift ends.
                    </span>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className={`px-6 py-2.5 text-white text-xs font-bold rounded-xl transition-all cursor-pointer disabled:opacity-50 shadow-md flex items-center gap-2 ${
                      selectedStatus === 'present'
                        ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/30'
                        : selectedStatus === 'absent'
                        ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/30'
                        : 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/30'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>
                      {submitting 
                        ? 'Saving...' 
                        : isAlreadyMarkedToday 
                          ? 'Update Attendance' 
                          : 'Mark Attendance'}
                    </span>
                  </button>
                </div>

              </form>
            )}
          </div>

          {/* QUICK MONTHLY PROGRESS SNAPSHOT BANNER */}
          <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-white rounded-xl border border-blue-100 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  {monthlyStats?.monthName} {selectedYear} Overview
                </h3>
              </div>
              <p className="text-xs text-slate-600">
                Effective Working Days: <strong>{monthlyStats?.stats?.effectivePresentDays || 0} / {monthlyStats?.totalWorkingDaysCount || 0} days</strong> • Rate: <strong>{monthlyStats?.stats?.attendancePercentage || 0}%</strong> • Remaining CL: <strong>{monthlyStats?.stats?.remainingCl ?? (clStats?.remaining_cl ?? 0)}</strong>
              </p>
            </div>

            <button
              onClick={() => handleTabChange('emp-calendar')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer shrink-0 shadow-xs"
            >
              <span>View Full Monthly History & Calendar</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: MONTHLY HISTORY & CALENDAR VIEW                                    */}
      {/* ========================================================================= */}
      {currentTab === 'emp-calendar' && (
        <div className="space-y-6">
          
          {/* MONTH NAVIGATOR HEADER */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleTabChange('emp-dashboard')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer mr-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Today</span>
              </button>

              <div className="h-4 w-px bg-slate-200" />

              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Monthly Attendance History
                </h2>
                <p className="text-xs text-slate-500">
                  Viewing full record & working calendar for {monthlyStats?.monthName} {selectedYear}
                </p>
              </div>
            </div>

            {/* Month Switcher Controls */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg p-0.5 text-xs">
                <button
                  onClick={handlePrevMonth}
                  className="p-1.5 hover:bg-slate-200 text-slate-700 rounded cursor-pointer"
                  title="Previous Month"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-3 font-bold text-slate-900 text-xs min-w-[110px] text-center">
                  {monthlyStats?.monthName} {selectedYear}
                </span>
                <button
                  onClick={handleNextMonth}
                  className="p-1.5 hover:bg-slate-200 text-slate-700 rounded cursor-pointer"
                  title="Next Month"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <button
                onClick={handleResetToCurrentMonth}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                Current Month
              </button>
            </div>
          </div>

          {/* MONTHLY SUMMARY STATS CARDS */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <StatsCard
              title="Monthly Working Days"
              value={`${monthlyStats?.totalWorkingDaysCount || 0}`}
              subtitle="Mon-Fri scheduled"
              icon={CalendarIcon}
            />
            <StatsCard
              title="Elapsed Days"
              value={`${monthlyStats?.elapsedWorkingDays || 0}`}
              subtitle="Till today"
              icon={Clock}
            />
            <StatsCard
              title="Effective Working Days"
              value={`${monthlyStats?.stats?.effectivePresentDays || 0}`}
              subtitle={`Full: ${monthlyStats?.stats?.presentCount || 0} | Half: ${monthlyStats?.stats?.totalHalfDays || 0} | CL: ${monthlyStats?.stats?.clAdjusted || 0}`}
              icon={CheckCircle2}
            />
            <StatsCard
              title="CL Balance (Remaining)"
              value={`${monthlyStats?.stats?.remainingCl ?? (clStats?.remaining_cl ?? 0)}`}
              subtitle={`Used: ${monthlyStats?.stats?.clAdjusted || 0} | Excess Unpaid: ${monthlyStats?.stats?.excessUnpaidLeaves || 0}`}
              icon={Palmtree}
            />
            <StatsCard
              title="Attendance Rate"
              value={`${monthlyStats?.stats?.attendancePercentage || 0}%`}
              subtitle={`${monthlyStats?.stats?.absentCount || 0} Absent / Leaves`}
              icon={TrendingUp}
            />
          </div>

          {/* MONTHLY CALENDAR GRID */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 text-xs flex-wrap gap-2">
              <span className="font-bold text-slate-900">Monthly Attendance Calendar</span>
              <div className="flex items-center gap-3 text-slate-500 text-[11px] font-medium flex-wrap">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Present (10-7)</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" /> 1st Half (10-2)</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-500" /> 2nd Half (2-7)</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-sky-500" /> Casual Leave (CL)</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-500" /> Absent</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-300" /> Weekend / Holiday</span>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1.5">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                <div key={d} className="text-center text-[11px] font-bold text-slate-400 py-1 uppercase">
                  {d}
                </div>
              ))}

              {/* Month start empty placeholders */}
              {monthlyStats?.calendarDays?.length > 0 && (
                Array.from({ length: monthlyStats.calendarDays[0].dayOfWeek }).map((_, i) => (
                  <div key={`empty-${i}`} className="min-h-[56px] bg-transparent" />
                ))
              )}

              {/* Day cells */}
              {monthlyStats?.calendarDays?.map(day => {
                const att = day.attendance;
                let badge = null;
                let cellStyle = 'bg-white border-slate-200 text-slate-700';

                if (day.isWeekend) {
                  cellStyle = 'bg-slate-50/70 border-slate-100 text-slate-400';
                  badge = 'Weekend';
                } else if (day.isHoliday) {
                  cellStyle = 'bg-purple-50 border-purple-200 text-purple-800 font-medium';
                  badge = day.holidayName || 'Holiday';
                } else if (att) {
                  if (att.status === 'present') {
                    cellStyle = 'bg-emerald-50 border-emerald-200 text-emerald-900';
                    badge = 'Present (10-7)';
                  } else if (att.status === 'half_day') {
                    if (att.half_day_slot === '1st_half') {
                      cellStyle = 'bg-amber-50 border-amber-200 text-amber-900';
                      badge = '1st Half (10-2)';
                    } else {
                      cellStyle = 'bg-orange-50 border-orange-200 text-orange-900';
                      badge = '2nd Half (2-7)';
                    }
                  } else if (att.status === 'casual_leave') {
                    cellStyle = 'bg-sky-50 border-sky-200 text-sky-900 font-bold';
                    badge = 'Casual Leave';
                  } else if (att.status === 'absent') {
                    cellStyle = 'bg-rose-50 border-rose-200 text-rose-900';
                    badge = 'Absent';
                  }
                } else {
                  const isPast = new Date(day.date) <= new Date();
                  if (isPast) {
                    cellStyle = 'bg-slate-50/80 border-dashed border-slate-200 text-slate-400';
                    badge = 'Unmarked';
                  }
                }

                return (
                  <div
                    key={day.date}
                    className={`min-h-[60px] p-1.5 rounded-lg border flex flex-col justify-between ${cellStyle}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold">{day.dayNumber}</span>
                      <span className="text-[9px] text-slate-400">{day.dayName}</span>
                    </div>
                    {badge && (
                      <span className="text-[10px] font-semibold truncate text-center block py-0.5 rounded bg-white/60">
                        {badge}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* DETAILED DAILY LOG TABLE FOR THE MONTH */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Daily Attendance Log — {monthlyStats?.monthName} {selectedYear}
                </h3>
              </div>
              <span className="text-xs text-slate-500">
                Total Records: <strong>{monthlyStats?.records?.length || 0}</strong>
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
                    <th className="pb-2.5 text-right pr-2">Impact on CL</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(!monthlyStats?.calendarDays || monthlyStats.calendarDays.filter(d => !d.isWeekend).length === 0) ? (
                    <tr>
                      <td colSpan={7} className="py-6 text-center text-slate-400">
                        No working days in this period.
                      </td>
                    </tr>
                  ) : (
                    monthlyStats.calendarDays.filter(d => !d.isWeekend).map((day) => {
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
                          <td className="py-2.5 text-slate-500 max-w-[180px] truncate" title={att?.notes}>
                            {att?.notes || '-'}
                          </td>
                          <td className="py-2.5 text-right pr-2 font-mono text-[11px]">
                            {att?.status === 'absent' || att?.status === 'casual_leave' ? (
                              <span className="text-rose-600 font-bold">-1.0 CL</span>
                            ) : att?.status === 'half_day' ? (
                              <span className="text-amber-600 font-bold">-0.5 CL</span>
                            ) : (
                              <span className="text-slate-400">0.0</span>
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

        </div>
      )}

    </div>
  );
}
