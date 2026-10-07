import React, { useState, useEffect } from 'react';
import { X, Palmtree, Plus, Minus, AlertCircle, CheckCircle2, Code2, Sparkles } from 'lucide-react';
import { api } from '../utils/api';

export function ClAdjustModal({ isOpen, onClose, employee, onSaved }) {
  const [previousCl, setPreviousCl] = useState(0.0);
  const [monthlyCl, setMonthlyCl] = useState(1.0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (employee) {
      setPreviousCl(employee.previous_cl !== undefined ? parseFloat(employee.previous_cl) : 0.0);
      setMonthlyCl(employee.monthly_cl !== undefined ? parseFloat(employee.monthly_cl) : 1.0);
    }
    setError(null);
    setSuccess(false);
  }, [employee, isOpen]);

  if (!isOpen || !employee) return null;

  const handleAdjust = (delta) => {
    setPreviousCl((prev) => {
      const updated = Math.max(0, Math.round(((parseFloat(prev) || 0) + delta) * 10) / 10);
      return updated;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await api.adjustEmployeeCl(employee.id, {
        exact_previous_cl: parseFloat(previousCl) || 0.0,
      });
      setSuccess(true);
      setTimeout(() => {
        if (onSaved) onSaved();
        onClose();
      }, 400);
    } catch (err) {
      setError(err.message || 'Failed to update CL balance');
    } finally {
      setLoading(false);
    }
  };

  const totalAvailable = Math.round(((parseFloat(previousCl) || 0) + (parseFloat(monthlyCl) || 1)) * 10) / 10;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-sky-900 via-indigo-950 to-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/20 border border-sky-400/30 flex items-center justify-center text-sky-300">
              <Palmtree className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-bold text-sm sm:text-base text-white">Adjust Casual Leave (CL)</h3>
                <span className="text-[10px] bg-sky-400/30 text-sky-200 px-2 py-0.5 rounded font-mono font-semibold uppercase">
                  Dev Mode
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                <strong>{employee.name}</strong> ({employee.employee_id})
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

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs text-rose-700 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs text-emerald-800 font-semibold">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>Casual Leave balance updated successfully!</span>
            </div>
          )}

          {/* Stepper & Number Controls */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Previous / Carried Forward CL
              </label>
              <span className="text-[11px] text-slate-500 font-medium">
                (Carry forward balance)
              </span>
            </div>

            {/* Stepper with +/- buttons */}
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => handleAdjust(-1.0)}
                className="px-2.5 py-2 bg-white border border-slate-200 hover:bg-slate-100 active:scale-95 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer shadow-xs"
                title="Minus 1.0 Day"
              >
                -1.0
              </button>

              <button
                type="button"
                onClick={() => handleAdjust(-0.5)}
                className="p-2 bg-white border border-slate-200 hover:bg-slate-100 active:scale-95 text-slate-700 font-bold rounded-xl transition-all cursor-pointer shadow-xs"
                title="Minus 0.5 Day"
              >
                <Minus className="w-4 h-4" />
              </button>

              <div className="w-24 text-center">
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  value={previousCl}
                  onChange={(e) => setPreviousCl(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-full text-center py-2 px-1 text-xl font-extrabold text-slate-900 bg-white border-2 border-sky-400 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-sky-400/40"
                />
                <span className="text-[10px] text-slate-400 font-medium">Days</span>
              </div>

              <button
                type="button"
                onClick={() => handleAdjust(0.5)}
                className="p-2 bg-white border border-slate-200 hover:bg-slate-100 active:scale-95 text-slate-700 font-bold rounded-xl transition-all cursor-pointer shadow-xs"
                title="Add 0.5 Day"
              >
                <Plus className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => handleAdjust(1.0)}
                className="px-2.5 py-2 bg-white border border-slate-200 hover:bg-slate-100 active:scale-95 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer shadow-xs"
                title="Add 1.0 Day"
              >
                +1.0
              </button>
            </div>
          </div>

          {/* Live Total Calculation Card */}
          <div className="bg-sky-50 border border-sky-200 rounded-xl p-4 text-xs space-y-1.5">
            <div className="flex items-center justify-between text-slate-600">
              <span>Previous Carried CL:</span>
              <strong className="text-slate-800">{previousCl} CL</strong>
            </div>
            <div className="flex items-center justify-between text-slate-600">
              <span>Monthly Allotment (+1/month):</span>
              <strong className="text-slate-800">+{monthlyCl} CL</strong>
            </div>
            <div className="pt-1.5 border-t border-sky-200 flex items-center justify-between font-bold text-sky-950 text-sm">
              <span>Total Available CL Quota:</span>
              <span className="text-sky-700 font-extrabold">{totalAvailable} CL</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 rounded-xl shadow-md shadow-sky-600/20 transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>{loading ? 'Updating...' : 'Save CL Balance (Dev)'}</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
