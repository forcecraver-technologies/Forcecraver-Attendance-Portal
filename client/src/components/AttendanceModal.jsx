import React, { useState, useEffect } from 'react';
import { X, Clock, AlertCircle, CheckCircle2, User, Calendar, Code2, RotateCcw, Check, Sparkles } from 'lucide-react';
import { api } from '../utils/api';

export function AttendanceModal({ isOpen, onClose, employee, date, onSaved, initialRecord = null }) {
  const [status, setStatus] = useState('present'); // 'present', 'half_day', 'absent', 'unmarked'
  const [halfDaySlot, setHalfDaySlot] = useState('1st_half');
  const [workMode, setWorkMode] = useState('office'); // 'office', 'remote'
  const [checkInTime, setCheckInTime] = useState('10:00 AM');
  const [checkOutTime, setCheckOutTime] = useState('07:00 PM');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (initialRecord) {
      setStatus(initialRecord.status || 'present');
      setHalfDaySlot(initialRecord.half_day_slot || '1st_half');
      setWorkMode(initialRecord.work_mode || 'office');
      setCheckInTime(initialRecord.check_in_time || '10:00 AM');
      setCheckOutTime(initialRecord.check_out_time || '07:00 PM');
      setNotes(initialRecord.notes || '');
    } else {
      setStatus('present');
      setHalfDaySlot('1st_half');
      setWorkMode('office');
      setCheckInTime('10:00 AM');
      setCheckOutTime('07:00 PM');
      setNotes('');
    }
    setError(null);
  }, [initialRecord, isOpen, date, employee]);

  // Adjust timing presets when status or half day slot changes
  const handleStatusChange = (newStatus) => {
    setStatus(newStatus);
    if (newStatus === 'present') {
      setCheckInTime('10:00 AM');
      setCheckOutTime('07:00 PM');
    } else if (newStatus === 'half_day') {
      if (halfDaySlot === '1st_half') {
        setCheckInTime('10:00 AM');
        setCheckOutTime('02:00 PM');
      } else {
        setCheckInTime('02:00 PM');
        setCheckOutTime('07:00 PM');
      }
    } else if (newStatus === 'casual_leave' || newStatus === 'absent' || newStatus === 'unmarked') {
      setCheckInTime('');
      setCheckOutTime('');
    }
  };

  const handleHalfDaySlotChange = (slot) => {
    setHalfDaySlot(slot);
    if (slot === '1st_half') {
      setCheckInTime('10:00 AM');
      setCheckOutTime('02:00 PM');
    } else {
      setCheckInTime('02:00 PM');
      setCheckOutTime('07:00 PM');
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await api.overrideAttendance({
        user_id: employee.id,
        date: date,
        status,
        half_day_slot: status === 'half_day' ? halfDaySlot : null,
        check_in_time: checkInTime,
        check_out_time: checkOutTime,
        work_mode: workMode,
        notes,
      });
      if (onSaved) onSaved();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to update attendance record');
    } finally {
      setLoading(false);
    }
  };

  // Format date nicely
  let formattedDateHeader = date;
  try {
    const [y, m, d] = date.split('-');
    const dateObj = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
    formattedDateHeader = dateObj.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch (e) {}

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-violet-900 via-slate-900 to-indigo-950 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-500/20 border border-violet-400/30 flex items-center justify-center text-violet-300">
              <Code2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm sm:text-base text-white">Developer Attendance Override</h3>
                <span className="text-[10px] bg-violet-400/30 text-violet-200 px-2 py-0.5 rounded font-mono font-semibold uppercase">
                  Dev Edit
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                <strong>{employee?.name}</strong> ({employee?.employee_id}) • {formattedDateHeader}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs text-rose-700 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Quick Notice */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between text-xs">
            <div>
              <span className="text-slate-500">Current Status for {date}:</span>{' '}
              <strong className="text-slate-800 uppercase">
                {initialRecord ? initialRecord.status : 'Unmarked'}
              </strong>
            </div>
            <span className="text-[11px] text-violet-700 bg-violet-50 border border-violet-200 px-2 py-0.5 rounded font-medium">
              Direct Override
            </span>
          </div>

          {/* Attendance Type Selector */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
              Select Attendance Status
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => handleStatusChange('present')}
                className={`py-2.5 px-2 rounded-xl border text-center transition-all cursor-pointer ${
                  status === 'present'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-800 font-bold ring-2 ring-emerald-500/20 shadow-xs'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700 font-medium'
                }`}
              >
                <span className="block text-xs font-bold">🟢 Full Day</span>
                <span className="block text-[10px] text-slate-500 mt-0.5">10 AM - 7 PM</span>
              </button>

              <button
                type="button"
                onClick={() => handleStatusChange('half_day')}
                className={`py-2.5 px-2 rounded-xl border text-center transition-all cursor-pointer ${
                  status === 'half_day'
                    ? 'bg-amber-50 border-amber-500 text-amber-800 font-bold ring-2 ring-amber-500/20 shadow-xs'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700 font-medium'
                }`}
              >
                <span className="block text-xs font-bold">🌓 Half Day</span>
                <span className="block text-[10px] text-slate-500 mt-0.5">1st / 2nd Half</span>
              </button>

              <button
                type="button"
                onClick={() => handleStatusChange('absent')}
                className={`py-2.5 px-2 rounded-xl border text-center transition-all cursor-pointer ${
                  status === 'absent'
                    ? 'bg-rose-50 border-rose-500 text-rose-800 font-bold ring-2 ring-rose-500/20 shadow-xs'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700 font-medium'
                }`}
              >
                <span className="block text-xs font-bold">🔴 Absent</span>
                <span className="block text-[10px] text-slate-500 mt-0.5">Full Day Leave</span>
              </button>

              <button
                type="button"
                onClick={() => handleStatusChange('unmarked')}
                className={`py-2.5 px-2 rounded-xl border text-center transition-all cursor-pointer ${
                  status === 'unmarked'
                    ? 'bg-slate-100 border-slate-500 text-slate-900 font-bold ring-2 ring-slate-400/30 shadow-xs'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700 font-medium'
                }`}
              >
                <span className="block text-xs font-bold">⚪ Reset</span>
                <span className="block text-[10px] text-slate-500 mt-0.5">Unmark Day</span>
              </button>
            </div>
          </div>

          {/* Half Day Slot Selection (if status is half_day) */}
          {status === 'half_day' && (
            <div className="p-4 bg-amber-50/60 rounded-2xl border border-amber-200/80 space-y-2.5 animate-in fade-in duration-150">
              <label className="block text-xs font-bold uppercase tracking-wider text-amber-900">
                Select Half Day Shift Slot
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleHalfDaySlotChange('1st_half')}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    halfDaySlot === '1st_half'
                      ? 'bg-white border-amber-500 text-amber-900 font-bold shadow-xs ring-2 ring-amber-400/30'
                      : 'bg-amber-50/40 border-amber-200 text-amber-800 hover:bg-white/60'
                  }`}
                >
                  <span className="block text-xs font-semibold text-amber-700 uppercase">1st Half</span>
                  <span className="block text-sm font-bold text-slate-900 mt-0.5">10:00 AM - 02:00 PM</span>
                  <span className="block text-[10px] text-slate-500">Morning 4 Hours Shift</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleHalfDaySlotChange('2nd_half')}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    halfDaySlot === '2nd_half'
                      ? 'bg-white border-amber-500 text-amber-900 font-bold shadow-xs ring-2 ring-amber-400/30'
                      : 'bg-amber-50/40 border-amber-200 text-amber-800 hover:bg-white/60'
                  }`}
                >
                  <span className="block text-xs font-semibold text-amber-700 uppercase">2nd Half</span>
                  <span className="block text-sm font-bold text-slate-900 mt-0.5">02:00 PM - 07:00 PM</span>
                  <span className="block text-[10px] text-slate-500">Evening 5 Hours Shift</span>
                </button>
              </div>
            </div>
          )}

          {/* Timing details */}
          {status !== 'casual_leave' && status !== 'absent' && status !== 'unmarked' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Check-in Time</label>
                <input
                  type="text"
                  value={checkInTime}
                  onChange={(e) => setCheckInTime(e.target.value)}
                  placeholder="10:00 AM"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Check-out Time</label>
                <input
                  type="text"
                  value={checkOutTime}
                  onChange={(e) => setCheckOutTime(e.target.value)}
                  placeholder="07:00 PM"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:border-indigo-500"
                />
              </div>
            </div>
          )}

          {/* Work Mode */}
          {status !== 'casual_leave' && status !== 'absent' && status !== 'unmarked' && (
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Working Mode</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'office', label: '🏢 Office' },
                  { id: 'remote', label: '🏠 Remote / WFH' },
                ].map((mode) => (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => setWorkMode(mode.id)}
                    className={`py-2 px-3 text-xs capitalize rounded-xl border transition-all cursor-pointer ${
                      workMode === mode.id
                        ? 'bg-indigo-50 border-indigo-500 text-indigo-700 font-semibold'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Notes / Remarks */}
          {status !== 'unmarked' && (
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Remarks / Reason
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Approved leave, Overridden by developer..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:border-indigo-500 resize-none"
              />
            </div>
          )}

          {status === 'unmarked' && (
            <div className="p-3 bg-slate-100 rounded-xl border border-slate-200 text-xs text-slate-600 flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-slate-500 shrink-0" />
              <span>This will delete this attendance entry and revert candidate status to Unmarked.</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-sm font-semibold text-white bg-violet-600 hover:bg-violet-700 rounded-xl shadow-md shadow-violet-600/20 transition-all disabled:opacity-50 cursor-pointer"
            >
              {loading ? 'Saving...' : status === 'unmarked' ? 'Reset to Unmarked' : 'Save Record (Developer)'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
