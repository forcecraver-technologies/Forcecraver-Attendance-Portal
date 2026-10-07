import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Login } from './pages/Login';
import { EmployeeDashboard } from './pages/EmployeeDashboard';
import { AdminDashboard } from './pages/AdminDashboard';
import { MonthlyReport } from './pages/MonthlyReport';
import { EmployeeManagement } from './pages/EmployeeManagement';
import { HolidaysManagement } from './pages/HolidaysManagement';
import { ProfileModal } from './components/ProfileModal';

function MainLayout() {
  const { isAuthenticated, isAdmin, loading } = useAuth();
  const [activeTab, setActiveTab] = useState(isAdmin ? 'admin-dashboard' : 'emp-dashboard');
  const [profileModalOpen, setProfileModalOpen] = useState(false);

  React.useEffect(() => {
    if (isAdmin) {
      setActiveTab('admin-dashboard');
    } else {
      setActiveTab('emp-dashboard');
    }
  }, [isAdmin]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-600">
        <div className="flex flex-col items-center gap-2">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-medium text-slate-500">Loading Portal...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenProfile={() => setProfileModalOpen(true)}
      />

      <main className="flex-1 pb-10">
        {isAdmin ? (
          <>
            {activeTab === 'admin-dashboard' && (
              <AdminDashboard onNavigateToMatrix={() => setActiveTab('admin-matrix')} />
            )}
            {activeTab === 'admin-matrix' && <MonthlyReport />}
            {activeTab === 'admin-employees' && <EmployeeManagement />}
            {activeTab === 'admin-holidays' && <HolidaysManagement />}
          </>
        ) : (
          <EmployeeDashboard 
            activeTab={activeTab} 
            setActiveTab={setActiveTab} 
          />
        )}
      </main>

      {/* Clean Minimalist Footer */}
      <footer className="border-t border-slate-200 py-3 text-center text-xs text-slate-400 no-print bg-white">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-1 text-[11px]">
          <p>© 2026 Attendance Portal • Weekdays (Mon - Fri, 10:00 AM - 07:00 PM)</p>
          <p className="text-slate-400">1st Half: 10 AM - 2 PM | 2nd Half: 2 PM - 7 PM</p>
        </div>
      </footer>

      {/* Profile Modal */}
      <ProfileModal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainLayout />
    </AuthProvider>
  );
}
