import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { 
  Download, 
  Printer, 
  ChevronLeft, 
  ChevronRight, 
  Search,
  Palmtree,
  Edit3,
  Code2,
  Plus,
  Minus,
  CheckCircle2,
  Calendar
} from 'lucide-react';
import { AttendanceModal } from '../components/AttendanceModal';
import { ClAdjustModal } from '../components/ClAdjustModal';

export function MonthlyReport() {
  const { isDeveloper } = useAuth();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Attendance Override Modal State
  const [attendanceModalOpen, setAttendanceModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedRecord, setSelectedRecord] = useState(null);

  // CL Adjuster Modal State
  const [clModalOpen, setClModalOpen] = useState(false);
  const [clTargetEmployee, setClTargetEmployee] = useState(null);

  const fetchMatrix = async (y, m) => {
    setLoading(true);
    try {
      const res = await api.getMonthlyMatrix(y, m);
      setData(res);
    } catch (err) {
      console.error('Failed to load monthly matrix:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMatrix(year, month);
  }, [year, month]);

  const handlePrevMonth = () => {
    if (month === 1) {
      setMonth(12);
      setYear(year - 1);
    } else {
      setMonth(month - 1);
    }
  };

  const handleNextMonth = () => {
    if (month === 12) {
      setMonth(1);
      setYear(year + 1);
    } else {
      setMonth(month + 1);
    }
  };

  // Open Attendance Modal for a specific day cell
  const handleCellClick = (emp, dateStr, dInfo) => {
    if (!isDeveloper) return;
    setSelectedEmployee(emp);
    setSelectedDate(dateStr);
    setSelectedRecord(dInfo);
    setAttendanceModalOpen(true);
  };

  // Open CL Adjuster Modal
  const handleOpenClAdjust = (emp) => {
    if (!isDeveloper) return;
    setClTargetEmployee(emp);
    setClModalOpen(true);
  };

  const handleExportCSV = () => {
    if (!data || !data.matrix) return;

    const workingDays = data.workingDaysList || [];
    
    const headers = [
      'Employee ID',
      'Name',
      ...workingDays.map(d => `${d.dayNumber}-${d.dayName}`),
      'Absent (A)',
      'Present (P)',
      '1st Half (10-2)',
      '2nd Half (2-7)',
      'CL Previous',
      'CL Current',
      'Total CL Available',
      'CL Left (Remaining)',
      'Effective Working Days',
      'Monthly Working Days'
    ];

    const rows = data.matrix.map(row => {
      const emp = row.employee;
      const stats = row.stats;
      const cl = row.clStats;
      const dayValues = workingDays.map(wDay => {
        if (wDay.isHoliday) {
          return `"HOL (${wDay.holidayName || 'Holiday'})"`;
        }
        const dInfo = row.days[wDay.date];
        if (!dInfo) return '-';
        if (dInfo.status === 'holiday') return `"HOL (${dInfo.holidayName || 'Holiday'})"`;
        if (dInfo.status === 'present') return 'P';
        if (dInfo.status === 'half_day') return dInfo.half_day_slot === '1st_half' ? 'H1(10-2)' : 'H2(2-7)';
        if (dInfo.status === 'absent' || dInfo.status === 'casual_leave') return 'A';
        return '-';
      });

      return [
        emp.employee_id,
        `"${emp.name}"`,
        ...dayValues,
        stats.absentCount,
        stats.presentCount,
        stats.halfDay1stCount,
        stats.halfDay2ndCount,
        cl?.previous_cl ?? 0,
        cl?.monthly_cl ?? 1,
        cl?.total_available ?? ((cl?.previous_cl ?? 0) + (cl?.monthly_cl ?? 1)),
        cl?.remaining_cl ?? 0,
        stats.effectivePresent,
        data.totalWorkingDaysCount
      ];
    });

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Forcecraver_Attendance_Report_${data.monthName}_${year}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredMatrix = data?.matrix?.filter(row => {
    const name = row.employee.name.toLowerCase();
    const id = row.employee.employee_id.toLowerCase();
    const q = searchQuery.toLowerCase();
    return name.includes(q) || id.includes(q);
  }) || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      
      {/* Header & Controls */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Monthly Attendance Matrix
            </h1>
            <span className={`text-[11px] font-medium px-2 py-0.5 rounded-md ${
              isDeveloper 
                ? 'bg-violet-50 text-violet-700 border border-violet-200' 
                : 'bg-purple-50 text-purple-700 border border-purple-200'
            }`}>
              {isDeveloper ? 'Developer (Click Any Day to Edit)' : 'Admin (View Only)'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {data?.monthName} {year} • Total Working Days: <strong>{data?.totalWorkingDaysCount || 0}</strong> (Mon-Fri)
            {isDeveloper && <span className="text-violet-600 font-medium ml-1.5">⚡ Tip: Click any attendance cell or CL balance to edit</span>}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Month Switcher */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg p-0.5 text-xs">
              <button
                onClick={handlePrevMonth}
                className="p-1 hover:bg-slate-200 text-slate-600 rounded cursor-pointer"
                title="Previous Month"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="px-2 font-semibold text-slate-800">
                {data?.monthName} {year}
              </span>
              <button
                onClick={handleNextMonth}
                className="p-1 hover:bg-slate-200 text-slate-600 rounded cursor-pointer"
                title="Next Month"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <button
              onClick={() => {
                const cur = new Date();
                setYear(cur.getFullYear());
                setMonth(cur.getMonth() + 1);
              }}
              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
            >
              Current Month
            </button>
          </div>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print</span>
          </button>
        </div>
      </div>

      {/* MATRIX TABLE CONTAINER */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
        
        {/* Search & Legend */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 no-print">
          <div className="relative min-w-[220px]">
            <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
              <Search className="w-3.5 h-3.5" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter candidate name or ID..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:border-blue-500"
            />
          </div>

          <div className="flex items-center gap-2 text-[11px] text-slate-600 font-medium flex-wrap">
            <span className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-800 border border-rose-200"><strong>A</strong> Absent / Leave</span>
            <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200"><strong>P</strong> Present (Full Day)</span>
            <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200"><strong>H1</strong> 1st Half (10-2)</span>
            <span className="px-1.5 py-0.5 rounded bg-orange-50 text-orange-800 border border-orange-200"><strong>H2</strong> 2nd Half (2-7)</span>
            <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300"><strong>HOL</strong> Holiday (Paid Present)</span>
            <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-500"><strong>-</strong> Unmarked</span>
          </div>
        </div>

        {/* Matrix Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-200">
                <th className="py-2.5 px-2.5 sticky left-0 bg-slate-50 z-20 min-w-[140px]">
                  Candidate
                </th>

                {data?.workingDaysList?.map((wDay) => (
                  <th 
                    key={wDay.date} 
                    className={`py-2 px-1 text-center min-w-[28px] ${
                      wDay.isHoliday ? 'bg-amber-100/60 border-b-2 border-b-amber-400' : ''
                    }`}
                    title={wDay.isHoliday ? `Company Holiday: ${wDay.holidayName || 'Holiday'} (Paid)` : `${wDay.dayNumber} ${wDay.dayName}`}
                  >
                    <span className={`block font-bold ${wDay.isHoliday ? 'text-amber-900' : 'text-slate-700'}`}>{wDay.dayNumber}</span>
                    <span className={`block text-[8px] ${wDay.isHoliday ? 'text-amber-700 font-bold' : 'text-slate-400'}`}>
                      {wDay.isHoliday ? 'HOL' : wDay.dayName}
                    </span>
                  </th>
                ))}

                <th className="py-2.5 px-2 text-center text-rose-700 font-bold bg-rose-50/50">Absent (A)</th>
                <th className="py-2.5 px-2 text-center text-slate-700 font-bold bg-slate-100/50">Present (P)</th>
                <th className="py-2.5 px-2 text-center text-slate-700 font-bold bg-slate-100/50">H1</th>
                <th className="py-2.5 px-2 text-center text-slate-700 font-bold bg-slate-100/50">H2</th>
                <th className="py-2.5 px-2 text-center text-sky-800 font-bold bg-sky-50/50">CL Prev</th>
                <th className="py-2.5 px-2 text-center text-sky-800 font-bold bg-sky-50/50">CL Curr</th>
                <th className="py-2.5 px-2 text-center text-sky-900 font-bold bg-sky-100/60">Total CL</th>
                <th className="py-2.5 px-2 text-center text-emerald-900 font-bold bg-emerald-50/60">CL Left</th>
                <th className="py-2.5 px-2 text-center text-slate-900 font-bold bg-slate-100 whitespace-nowrap">Effective Working Days</th>
                <th className="py-2.5 px-2 text-center text-slate-700 font-bold bg-slate-100/50 whitespace-nowrap">Monthly Working Days</th>
                {isDeveloper && <th className="py-2.5 px-2 text-center text-violet-800 font-bold bg-violet-50">Dev Action</th>}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {filteredMatrix.length === 0 ? (
                <tr>
                  <td colSpan={12 + (data?.workingDaysList?.length || 0)} className="py-6 text-center text-slate-400 text-xs">
                    No records found for this period.
                  </td>
                </tr>
              ) : (
                filteredMatrix.map((row) => {
                  const emp = row.employee;
                  const stats = row.stats;
                  const cl = row.clStats;

                  return (
                    <tr key={emp.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2.5 px-2.5 sticky left-0 bg-white hover:bg-slate-50 z-10">
                        <div className="font-semibold text-slate-900 truncate max-w-[130px]">{emp.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{emp.employee_id}</div>
                      </td>

                      {/* Daily Attendance Cells */}
                      {data?.workingDaysList?.map((wDay) => {
                        const dInfo = row.days[wDay.date];
                        const isHolidayCell = wDay.isHoliday || dInfo?.status === 'holiday';
                        let cellContent = '-';
                        let cellClass = 'text-slate-300 bg-slate-50/30';

                        if (isHolidayCell) {
                          cellContent = 'HOL';
                          cellClass = 'bg-amber-100 text-amber-900 font-bold border border-amber-300';
                        } else if (dInfo) {
                          if (dInfo.status === 'present') {
                            cellContent = 'P';
                            cellClass = 'bg-emerald-50 text-emerald-800 font-semibold border border-emerald-200';
                          } else if (dInfo.status === 'half_day') {
                            if (dInfo.half_day_slot === '1st_half') {
                              cellContent = 'H1';
                              cellClass = 'bg-amber-50 text-amber-800 font-semibold border border-amber-200';
                            } else {
                              cellContent = 'H2';
                              cellClass = 'bg-orange-50 text-orange-800 font-semibold border border-orange-200';
                            }
                          } else if (dInfo.status === 'absent' || dInfo.status === 'casual_leave') {
                            cellContent = 'A';
                            cellClass = 'bg-rose-50 text-rose-800 font-semibold border border-rose-200';
                          }
                        }

                        return (
                          <td key={wDay.date} className={`py-1 px-0.5 text-center ${isHolidayCell ? 'bg-amber-50/30' : ''}`}>
                            <button
                              type="button"
                              onClick={() => !isHolidayCell && handleCellClick(emp, wDay.date, dInfo)}
                              disabled={!isDeveloper || isHolidayCell}
                              title={
                                isHolidayCell
                                  ? `🎉 Forcecraver Holiday: ${wDay.holidayName || dInfo?.holidayName || 'Official Holiday'} (Paid Working Day - Counted as Present)`
                                  : isDeveloper 
                                    ? `Click to Edit Attendance for ${emp.name} on ${wDay.dayNumber} ${wDay.dayName} (${dInfo ? dInfo.status : 'Unmarked'})` 
                                    : `${wDay.dayNumber} ${wDay.dayName}: ${dInfo ? dInfo.status : 'Unmarked'}`
                              }
                              className={`w-5 h-5 leading-5 rounded text-[9px] transition-transform ${cellClass} ${
                                isDeveloper && !isHolidayCell ? 'cursor-pointer hover:scale-110 hover:ring-2 hover:ring-violet-400 active:scale-95' : 'cursor-default'
                              }`}
                            >
                              {cellContent}
                            </button>
                          </td>
                        );
                      })}

                      {/* Absent (A) */}
                      <td className="py-2.5 px-2 text-center text-rose-700 font-bold bg-rose-50/20">
                        {stats.absentCount}
                      </td>

                      {/* Present (P) */}
                      <td className="py-2.5 px-2 text-center text-slate-700 font-medium">{stats.presentCount}</td>
                      <td className="py-2.5 px-2 text-center text-slate-700 font-medium">{stats.halfDay1stCount}</td>
                      <td className="py-2.5 px-2 text-center text-slate-700 font-medium">{stats.halfDay2ndCount}</td>

                      {/* CL Previous */}
                      <td className="py-2.5 px-2 text-center text-sky-800 font-semibold bg-sky-50/20">
                        {cl?.previous_cl ?? 0}
                      </td>

                      {/* CL Current */}
                      <td className="py-2.5 px-2 text-center text-sky-800 font-semibold bg-sky-50/20">
                        +{cl?.monthly_cl ?? 1}
                      </td>

                      {/* Total CL Available */}
                      <td className="py-2.5 px-2 text-center text-sky-900 font-bold bg-sky-100/30">
                        {cl?.total_available ?? ((cl?.previous_cl ?? 0) + (cl?.monthly_cl ?? 1))}
                      </td>

                      {/* Remaining CL Left (with quick edit for Developer) */}
                      <td className="py-2.5 px-2 text-center font-bold text-emerald-900 bg-emerald-50/40">
                        <div className="flex items-center justify-center gap-1">
                          <span>{cl?.remaining_cl ?? 0}</span>
                          {isDeveloper && (
                            <button
                              type="button"
                              onClick={() => handleOpenClAdjust(emp)}
                              className="p-0.5 hover:bg-emerald-200 text-emerald-700 rounded transition-colors cursor-pointer"
                              title={`Adjust Previous CL for ${emp.name}`}
                            >
                              <Edit3 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Effective Days */}
                      <td className="py-2.5 px-2 text-center font-bold text-slate-900 bg-slate-50/50">
                        {stats.effectivePresent}
                      </td>

                      {/* Total Working Days */}
                      <td className="py-2.5 px-2 text-center font-semibold text-slate-700 bg-slate-50/30">
                        {data?.totalWorkingDaysCount || 0}
                      </td>

                      {/* Dev Action */}
                      {isDeveloper && (
                        <td className="py-2.5 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleOpenClAdjust(emp)}
                            className="px-2 py-0.5 bg-violet-100 hover:bg-violet-200 text-violet-800 text-[10px] font-bold rounded cursor-pointer transition-colors"
                          >
                            +/- CL
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

      {/* Developer Attendance Override Modal */}
      {selectedEmployee && isDeveloper && (
        <AttendanceModal
          isOpen={attendanceModalOpen}
          onClose={() => {
            setAttendanceModalOpen(false);
            setSelectedEmployee(null);
            setSelectedDate(null);
            setSelectedRecord(null);
          }}
          employee={selectedEmployee}
          date={selectedDate}
          initialRecord={selectedRecord}
          onSaved={() => fetchMatrix(year, month)}
        />
      )}

      {/* Developer CL Adjuster Modal */}
      {clTargetEmployee && isDeveloper && (
        <ClAdjustModal
          isOpen={clModalOpen}
          onClose={() => {
            setClModalOpen(false);
            setClTargetEmployee(null);
          }}
          employee={clTargetEmployee}
          onSaved={() => fetchMatrix(year, month)}
        />
      )}

    </div>
  );
}

