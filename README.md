# 🕒 AttendanceHub - Attendance Management Portal

A full-stack Attendance Portal with **Monday to Friday weekday rules**, **1st Half & 2nd Half shift management**, **Automatic Monthly Working Days Calculation**, and **Role-Based Access (Admin View-Only vs Developer Edit Access)**.

---

## 🌟 Key Updates & Features

### 1. 👥 Role Permissions
- 🛠️ **Developer (`developer@portal.com` / `dev123`)**:
  - Full Access: Can view live monitor, edit/override attendance records, add/edit/delete candidates, and manage company holidays.
- 👁️ **Admin (`admin@portal.com` / `admin123`)**:
  - **View-Only Access**: Can monitor live attendance, see who marked vs who hasn't, view monthly matrix, and export CSV/PDF reports. (Cannot edit or modify records).
- 👤 **Candidate / Employee (`rahul@portal.com` / `user123`)**:
  - Self-attendance update for today (Monday to Friday only).
  - Can choose **Full Day**, **1st Half (10 AM - 2 PM)**, **2nd Half (2 PM - 7 PM)**, **Absent**, or **Unmarked (Reset)**.

### 2. 🏢 Working Location
- Cleaned up: **Office** and **Remote / WFH** (Field option removed).

### 3. ⚪ "Unmarked" Status Option
- Candidates and developers can reset/clear today's attendance back to **Unmarked (Pending)** anytime.

---

## 🔑 Login Accounts (1-Click Buttons on Login Page)

| Role | Email | Password | Permissions |
| :--- | :--- | :--- | :--- |
| **Developer** | `developer@portal.com` | `dev123` | **Full Edit & Override Access** |
| **Admin** | `admin@portal.com` | `admin123` | **View-Only Live Monitoring** |
| **Candidate** | `rahul@portal.com` | `user123` | Self Attendance Marking |
| **Candidate** | `priya@portal.com` | `user123` | Self Attendance Marking |
| **Candidate** | `amit@portal.com` | `user123` | Self Attendance Marking |

---

## 🚀 How to Run the Application
```bash
npm start
```
Open **[http://localhost:5000](http://localhost:5000)** in your browser.
