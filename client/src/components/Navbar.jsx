import React from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Calendar, 
  Users, 
  Clock, 
  LogOut, 
  FileSpreadsheet,
  Settings,
  Menu,
  X
} from 'lucide-react';

export function Navbar({ activeTab, setActiveTab, onOpenProfile }) {
  const { user, isAdmin, isDeveloper, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const today = new Date();
  const dateStr = today.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  const isWeekend = today.getDay() === 0 || today.getDay() === 6;

  const adminNavItems = [
    { id: 'admin-dashboard', label: 'Live Monitor', icon: Clock },
    { id: 'admin-matrix', label: 'Monthly Sheet', icon: FileSpreadsheet },
    { id: 'admin-employees', label: 'Employees', icon: Users },
    { id: 'admin-holidays', label: 'Holidays', icon: Calendar },
  ];

  const employeeNavItems = [
    { id: 'emp-dashboard', label: 'Today Attendance', icon: Clock },
    { id: 'emp-calendar', label: 'Monthly History', icon: Calendar },
  ];

  const navItems = isAdmin ? adminNavItems : employeeNavItems;

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-15">
          
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
              <Calendar className="w-4.5 h-4.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-base text-slate-900 tracking-tight">
                  Attendance Portal
                </span>
                <span className={`text-[11px] font-medium px-2 py-0.5 rounded-md ${
                  isDeveloper
                    ? 'bg-violet-50 text-violet-700 border border-violet-200'
                    : isAdmin 
                    ? 'bg-purple-50 text-purple-700 border border-purple-200' 
                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                }`}>
                  {isDeveloper ? 'Developer' : isAdmin ? 'Admin' : 'Employee'}
                </span>
              </div>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-slate-100 text-slate-900 font-semibold'
                      : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right Section */}
          <div className="hidden md:flex items-center gap-4">
            {/* Simple Date Pill */}
            <div className="text-xs text-slate-500 font-medium">
              <span>{dateStr}</span>
              {isWeekend && (
                <span className="ml-2 px-1.5 py-0.5 text-[10px] bg-amber-50 text-amber-700 border border-amber-200 rounded font-medium">
                  Weekend
                </span>
              )}
            </div>

            <div className="h-4 w-px bg-slate-200" />

            {/* Profile info */}
            <div className="flex items-center gap-2.5">
              <button
                onClick={onOpenProfile}
                className="flex items-center gap-2 hover:opacity-80 transition-opacity text-left cursor-pointer"
                title="Account Settings"
              >
                <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center font-semibold text-xs">
                  {user?.name?.slice(0, 2).toUpperCase() || 'U'}
                </div>
                <div className="text-xs">
                  <p className="font-semibold text-slate-800 leading-tight">{user?.name}</p>
                  <p className="text-[10px] text-slate-400 font-mono">{user?.employee_id}</p>
                </div>
              </button>

              <button
                onClick={onOpenProfile}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                title="Settings"
              >
                <Settings className="w-4 h-4" />
              </button>

              <button
                onClick={logout}
                className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-1.5 text-slate-600 rounded-lg hover:bg-slate-100"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Menu dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 py-3 space-y-2">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <p className="font-semibold text-xs text-slate-800">{user?.name}</p>
              <p className="text-[11px] text-slate-400">{user?.employee_id} • {user?.role}</p>
            </div>
            <button
              onClick={() => {
                onOpenProfile();
                setMobileMenuOpen(false);
              }}
              className="text-xs text-blue-600 font-medium px-2 py-1 bg-blue-50 rounded"
            >
              Settings
            </button>
          </div>

          <div className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium ${
                    isActive
                      ? 'bg-slate-100 text-slate-900 font-semibold'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </button>
              );
            })}
          </div>

          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 mt-2 px-3 py-1.5 rounded-lg text-xs text-red-600 bg-red-50 hover:bg-red-100 font-medium"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </div>
      )}
    </header>
  );
}
