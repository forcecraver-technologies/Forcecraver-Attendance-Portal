import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { Calendar, Plus, Trash2, Sparkles, AlertCircle, CheckCircle2, Code2, Eye } from 'lucide-react';

export function HolidaysManagement() {
  const { isDeveloper } = useAuth();
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  const fetchHolidays = async () => {
    setLoading(true);
    try {
      const res = await api.getHolidays();
      setHolidays(res.holidays || []);
    } catch (err) {
      console.error('Failed to fetch holidays:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHolidays();
  }, []);

  const handleAddHoliday = async (e) => {
    e.preventDefault();
    if (!isDeveloper) {
      alert('Only Developer can add holidays');
      return;
    }
    setError(null);
    setMessage(null);

    try {
      await api.addHoliday({ date, name, description });
      setMessage(`Holiday "${name}" added successfully!`);
      setDate('');
      setName('');
      setDescription('');
      await fetchHolidays();
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setError(err.message || 'Failed to add holiday');
    }
  };

  const handleDelete = async (id, name) => {
    if (!isDeveloper) {
      alert('Only Developer can delete holidays');
      return;
    }
    if (!window.confirm(`Are you sure you want to remove holiday "${name}"?`)) return;

    try {
      await api.deleteHoliday(id);
      await fetchHolidays();
    } catch (err) {
      alert(err.message || 'Failed to delete holiday');
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Header */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-md bg-purple-100 text-purple-800 text-xs font-bold uppercase tracking-wider">
              Calendar Rules
            </span>
            <span className={`text-xs px-2.5 py-1 rounded-md font-bold ${
              isDeveloper ? 'bg-violet-100 text-violet-800' : 'bg-slate-100 text-slate-600'
            }`}>
              {isDeveloper ? 'Developer Edit Mode' : 'Admin View Only'}
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight mt-1">
            Official Forcecraver Holidays
          </h1>
          <p className="text-xs text-slate-500">
            Holidays falling on weekdays (Mon - Fri) are considered working days, and all employees are automatically marked Present (Paid Holiday).
          </p>
        </div>
      </div>

      <div className={`grid grid-cols-1 ${isDeveloper ? 'md:grid-cols-3' : ''} gap-6`}>
        
        {/* Add Holiday Form (Developer Only) */}
        {isDeveloper && (
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-md h-fit">
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2 mb-4">
              <Plus className="w-4 h-4 text-violet-600" />
              <span>Add New Holiday (Developer)</span>
            </h3>

            {message && (
              <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs text-emerald-800 font-medium">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{message}</span>
              </div>
            )}

            {error && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs text-rose-800 font-medium">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleAddHoliday} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Date</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:border-violet-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Holiday Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Diwali, Christmas"
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:border-violet-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Description (Optional)</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="National holiday"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:border-violet-500"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs rounded-xl shadow-md shadow-violet-600/20 transition-all cursor-pointer"
              >
                Save Holiday
              </button>
            </form>
          </div>
        )}

        {/* Holidays List */}
        <div className={`${isDeveloper ? 'md:col-span-2' : 'col-span-1'} bg-white p-6 rounded-3xl border border-slate-200/80 shadow-md`}>
          <h3 className="font-bold text-slate-900 text-base mb-4">
            Configured Holidays ({holidays.length})
          </h3>

          {holidays.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              No custom holidays added yet. Company follows standard Monday-to-Friday working calendar.
            </div>
          ) : (
            <div className="space-y-2.5">
              {holidays.map((h) => (
                <div
                  key={h.id}
                  className="flex items-center justify-between p-3.5 bg-slate-50 hover:bg-slate-100/80 rounded-2xl border border-slate-200 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-xs shrink-0">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">{h.name}</h4>
                      <p className="text-xs text-slate-500 font-mono">{h.date} {h.description && `• ${h.description}`}</p>
                    </div>
                  </div>

                  {isDeveloper ? (
                    <button
                      onClick={() => handleDelete(h.id, h.name)}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                      title="Remove Holiday (Developer)"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  ) : (
                    <span className="text-[11px] text-slate-400 italic">View Only</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
