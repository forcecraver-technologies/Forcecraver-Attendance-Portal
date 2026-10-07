import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { 
  Users, 
  CheckCircle2, 
  Clock, 
  Search, 
  Calendar, 
  Edit3, 
  UserCheck,
  UserX,
  Eye,
  Palmtree
} from 'lucide-react';
import { StatsCard } from '../components/StatsCard';
import { AttendanceModal } from '../components/AttendanceModal';
import { ClAdjustModal } from '../components/ClAdjustModal';

export function AdminDashboard({ onNavigateToMatrix }) {
  const { isDeveloper, isViewOnlyAdmin } = useAuth();

  const [date, setDate] = useState(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  });

  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [selectedRecord, setSelectedRecord] = useState(null);

  // CL Adjust Modal
  const [clModalOpen, setClModalOpen] = useState(false);
  const [clTargetEmployee, setClTargetEmployee] = useState(null);

  const fetchOverview = async (targetDate) => {
    setLoading(true);
    try {
      const data = await api.getTodayOverview(targetDate);
      setOverview(data);
    } catch (err) {
      console.error('Failed to fetch overview:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview(date);
  }, [date]);

  const handleOpenOverride = (emp, record = null) => {
    if (!isDeveloper) return;
    setSelectedEmployee(emp);
    setSelectedRecord(record);
    setModalOpen(true);
  };

  const filteredEmployees = overview?.allEmployeesWithStatus?.filter((emp) => {
    const nameMatch = emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      emp.employee_id.toLowerCase().includes(searchQuery.toLowerCase());
    if (!nameMatch) return false;

    const att = emp.attendance;
    if (filterType === 'all') return true;
    if (filterType === 'marked') return !!att;
    if (filterType === 'not_marked') return !att;
    if (filterType === 'present') return att?.status === 'present';
    if (filterType === '1st_half') return att?.status === 'half_day' && att?.half_day_slot === '1st_half';
    if (filterType === '2nd_half') return att?.status === 'half_day' && att?.half_day_slot === '2nd_half';
    if (filterType === 'casual_leave') return att?.status === 'casual_leave';
    if (filterType === 'absent') return att?.status === 'absent';
    return true;
  }) || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      
      {/* Header & Date Controller */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Live Attendance Monitor
            </h1>
            <span className={`text-[11px] font-medium px-2 py-0.5 rounded-md ${
              isDeveloper 
                ? 'bg-violet-50 text-violet-700 border border-violet-200' 
                : 'bg-purple-50 text-purple-700 border border-purple-200'
            }`}>
              {isDeveloper ? 'Developer (Full Edit)' : 'Admin (View Only)'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitor who marked vs pending, full day, 1st half (10-2), 2nd half (2-7) & Casual Leaves (CL)
          </p>
        </div>

        {/* Date Selector */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-xs">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="bg-transparent font-semibold text-slate-800 focus:outline-hidden cursor-pointer text-xs"
            />
          </div>

          <button
            onClick={() => {
              const d = new Date();
              const y = d.getFullYear();
              const m = String(d.getMonth() + 1).padStart(2, '0');
              const day = String(d.getDate()).padStart(2, '0');
              const todayStr = `${y}-${m}-${day}`;
              setDate(todayStr);
              fetchOverview(todayStr);
            }}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
          >
            Today
          </button>
        </div>
      </div>

      {/* METRIC CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        <StatsCard
          title="Total Staff"
          value={overview?.stats?.totalEmployees || 0}
          subtitle="Active Candidates"
          icon={Users}
          onClick={() => setFilterType('all')}
          active={filterType === 'all'}
        />
        <StatsCard
          title="Marked"
          value={overview?.stats?.totalMarked || 0}
          subtitle={`${overview?.stats?.completionRate || 0}% marked`}
          icon={UserCheck}
          onClick={() => setFilterType('marked')}
          active={filterType === 'marked'}
        />
        <StatsCard
          title="Unmarked"
          value={overview?.stats?.notMarkedCount || 0}
          subtitle="Pending"
          icon={UserX}
          onClick={() => setFilterType('not_marked')}
          active={filterType === 'not_marked'}
        />
        <StatsCard
          title="Full Day"
          value={overview?.stats?.presentCount || 0}
          subtitle="10 AM - 7 PM"
          icon={CheckCircle2}
          onClick={() => setFilterType('present')}
          active={filterType === 'present'}
        />
        <StatsCard
          title="1st Half"
          value={overview?.stats?.halfDay1stCount || 0}
          subtitle="10 AM - 2 PM"
          icon={Clock}
          onClick={() => setFilterType('1st_half')}
          active={filterType === '1st_half'}
        />
        <StatsCard
          title="2nd Half"
          value={overview?.stats?.halfDay2ndCount || 0}
          subtitle="2 PM - 7 PM"
          icon={Clock}
          onClick={() => setFilterType('2nd_half')}
          active={filterType === '2nd_half'}
        />
        <StatsCard
          title="Absent / Leave"
          value={overview?.stats?.absentCount || 0}
          subtitle="Adjusted via CL"
          icon={Palmtree}
          onClick={() => setFilterType('absent')}
          active={filterType === 'absent'}
        />
      </div>

      {/* CANDIDATES TABLE */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
        
        {/* Filter Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-1.5 flex-wrap">
            {[
              { id: 'all', label: `All (${overview?.stats?.totalEmployees || 0})` },
              { id: 'marked', label: `Marked (${overview?.stats?.totalMarked || 0})` },
              { id: 'not_marked', label: `Unmarked (${overview?.stats?.notMarkedCount || 0})` },
              { id: 'present', label: `Full Day (${overview?.stats?.presentCount || 0})` },
              { id: '1st_half', label: `1st Half (${overview?.stats?.halfDay1stCount || 0})` },
              { id: '2nd_half', label: `2nd Half (${overview?.stats?.halfDay2ndCount || 0})` },
              { id: 'absent', label: `Absent (${overview?.stats?.absentCount || 0})` },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilterType(tab.id)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                  filterType === tab.id
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative min-w-[200px]">
            <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
              <Search className="w-3.5 h-3.5" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search candidate name, ID..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:border-blue-500"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
                <th className="pb-2.5 pl-2">Candidate</th>
                <th className="pb-2.5">Status</th>
                <th className="pb-2.5">CL Status (Prev / Curr / Left)</th>
                <th className="pb-2.5">Timing</th>
                <th className="pb-2.5">Check-in/Out</th>
                <th className="pb-2.5">Location</th>
                <th className="pb-2.5">Remarks</th>
                <th className="pb-2.5 text-right pr-2">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-6 text-center text-slate-400 text-xs">
                    No candidates found for this filter.
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp) => {
                  const att = emp.attendance;
                  const cl = emp.clStats;

                  return (
                    <tr key={emp.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 pl-2">
                        <p className="font-semibold text-slate-900 text-xs">{emp.name}</p>
                        <p className="text-[10px] text-slate-400 font-mono">{emp.employee_id} • {emp.email}</p>
                      </td>

                      <td className="py-3">
                        {att ? (
                          att.status === 'present' ? (
                            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                              Full Day
                            </span>
                          ) : att.status === 'half_day' ? (
                            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                              {att.half_day_slot === '1st_half' ? '1st Half (10-2)' : '2nd Half (2-7)'}
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-50 text-rose-800 border border-rose-200">
                              🔴 Absent
                            </span>
                          )
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-500 border border-slate-200">
                            Unmarked
                          </span>
                        )}
                      </td>

                      <td className="py-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[11px] font-semibold text-slate-700 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">
                            Prev: {cl?.previous_cl ?? 0}
                          </span>
                          <span className="text-[11px] font-semibold text-sky-800 bg-sky-50 border border-sky-200 px-1.5 py-0.5 rounded">
                            Curr: +{cl?.monthly_cl ?? 1}
                          </span>
                          <span className="text-[11px] font-bold text-emerald-900 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                            {cl?.remaining_cl ?? 0} Left
                          </span>
                          {isDeveloper && (
                            <button
                              type="button"
                              onClick={() => {
                                setClTargetEmployee(emp);
                                setClModalOpen(true);
                              }}
                              className="p-1 hover:bg-sky-100 text-sky-700 rounded transition-colors cursor-pointer"
                              title={`Adjust Previous CL for ${emp.name}`}
                            >
                              <Edit3 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </td>

                      <td className="py-3 text-slate-600">
                        {att ? (
                          att.status === 'present' ? '10:00 AM - 07:00 PM' :
                          att.status === 'half_day' ? (att.half_day_slot === '1st_half' ? '10:00 AM - 02:00 PM' : '02:00 PM - 07:00 PM') :
                          'Full Day Leave'
                        ) : '-'}
                      </td>

                      <td className="py-3 font-mono text-[11px] text-slate-600">
                        {att?.check_in_time ? `In: ${att.check_in_time}` : '-'}
                      </td>

                      <td className="py-3">
                        {att?.work_mode ? (
                          <span className="capitalize text-slate-600 font-medium">
                            {att.work_mode === 'remote' ? '🏠 Remote' : '🏢 Office'}
                          </span>
                        ) : '-'}
                      </td>

                      <td className="py-3 max-w-[140px] truncate text-slate-500 text-[11px]" title={att?.notes}>
                        {att?.notes || '-'}
                      </td>

                      <td className="py-3 text-right pr-2">
                        {isDeveloper ? (
                          <button
                            onClick={() => handleOpenOverride(emp, att)}
                            className="px-2.5 py-1 bg-violet-50 hover:bg-violet-100 text-violet-800 border border-violet-200 text-[11px] font-bold rounded transition-colors cursor-pointer inline-flex items-center gap-1"
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>Edit Attendance</span>
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">View Only</span>
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

      {/* Override / Mark Modal (Developer Only) */}
      {selectedEmployee && isDeveloper && (
        <AttendanceModal
          isOpen={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setSelectedEmployee(null);
            setSelectedRecord(null);
          }}
          employee={selectedEmployee}
          date={date}
          initialRecord={selectedRecord}
          onSaved={() => fetchOverview(date)}
        />
      )}

      {/* CL Adjust Modal (Developer Only) */}
      {clTargetEmployee && isDeveloper && (
        <ClAdjustModal
          isOpen={clModalOpen}
          onClose={() => {
            setClModalOpen(false);
            setClTargetEmployee(null);
          }}
          employee={clTargetEmployee}
          onSaved={() => fetchOverview(date)}
        />
      )}

    </div>
  );
}

