/**
 * API client helper with automatic JWT injection and error handling
 */

const API_BASE_URL = '/api';

async function request(endpoint, options = {}) {
  const token = localStorage.getItem('attendance_token');

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data.error || data.message || 'Request failed');
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

export const api = {
  // Auth
  login: (credentials) => request('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
  register: (userData) => request('/auth/register', { method: 'POST', body: JSON.stringify(userData) }),
  sendOtp: (data) => request('/auth/send-otp', { method: 'POST', body: JSON.stringify(data) }),
  verifyOtpRegister: (data) => request('/auth/verify-otp-register', { method: 'POST', body: JSON.stringify(data) }),
  forgotPasswordSendOtp: (data) => request('/auth/forgot-password/send-otp', { method: 'POST', body: JSON.stringify(data) }),
  forgotPasswordVerifyReset: (data) => request('/auth/forgot-password/verify-reset', { method: 'POST', body: JSON.stringify(data) }),
  getMe: () => request('/auth/me'),
  updateProfile: (profile) => request('/auth/profile', { method: 'PUT', body: JSON.stringify(profile) }),
  changePassword: (passwords) => request('/auth/password', { method: 'PUT', body: JSON.stringify(passwords) }),

  // Employee Attendance
  getTodayAttendance: () => request('/attendance/today'),
  markAttendance: (payload) => request('/attendance/mark', { method: 'POST', body: JSON.stringify(payload) }),
  getMyStats: (year, month) => request(`/attendance/my-stats?year=${year}&month=${month}`),

  // Admin
  getTodayOverview: (date) => request(`/admin/today-overview${date ? `?date=${date}` : ''}`),
  getMonthlyMatrix: (year, month) => request(`/admin/monthly-matrix?year=${year}&month=${month}`),
  getEmployees: () => request('/admin/employees'),
  getEmployeeCalendar: (id, year, month) => request(`/admin/employees/${id}/calendar?year=${year}&month=${month}`),
  createEmployee: (data) => request('/admin/employees', { method: 'POST', body: JSON.stringify(data) }),
  updateEmployee: (id, data) => request(`/admin/employees/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  adjustEmployeeCl: (id, data) => request(`/admin/employees/${id}/adjust-cl`, { method: 'POST', body: JSON.stringify(data) }),
  deleteEmployee: (id) => request(`/admin/employees/${id}`, { method: 'DELETE' }),
  overrideAttendance: (payload) => request('/admin/attendance/override', { method: 'POST', body: JSON.stringify(payload) }),
  getHolidays: () => request('/admin/holidays'),
  addHoliday: (data) => request('/admin/holidays', { method: 'POST', body: JSON.stringify(data) }),
  deleteHoliday: (id) => request(`/admin/holidays/${id}`, { method: 'DELETE' }),
};
