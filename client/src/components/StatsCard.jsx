import React from 'react';

export function StatsCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  onClick = null,
  active = false
}) {
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-xl border p-4 transition-all ${
        active 
          ? 'border-blue-600 ring-1 ring-blue-600 bg-blue-50/20 shadow-xs' 
          : 'border-slate-200 hover:border-slate-300'
      } ${onClick ? 'cursor-pointer' : ''}`}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
            {title}
          </p>
          <p className="text-2xl font-bold tracking-tight text-slate-900">
            {value}
          </p>
          {subtitle && (
            <p className="text-[11px] text-slate-500">
              {subtitle}
            </p>
          )}
        </div>

        {Icon && (
          <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-500">
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>
    </div>
  );
}
