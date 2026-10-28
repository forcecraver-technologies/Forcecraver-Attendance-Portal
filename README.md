# 🕒 Forcecraver Attendance Portal

A full-stack Attendance Portal with **Monday to Friday weekday rules**, **1st Half & 2nd Half shift management**, **Automatic Monthly Working Days Calculation**, and **Role-Based Access (Admin View-Only vs Developer Edit Access)**.

---

## 🌟 Key Updates & Features

### 1. 👥 Role Permissions
- 🛠️ **Developer **:
  - Full Access: Can view live monitor, edit/override attendance records, add/edit/delete candidates, and manage company holidays.
- 👁️ **Admin **:
  - **View-Only Access**: Can monitor live attendance, see who marked vs who hasn't, view monthly matrix, and export CSV/PDF reports. (Cannot edit or modify records).
- 👤 **Candidate / Employee **:
  - Self-attendance update for today (Monday to Friday only).
  - Can choose **Full Day**, **1st Half (10 AM - 2 PM)**, **2nd Half (2 PM - 7 PM)**, **Absent**, or **Unmarked (Reset)**.

### 2. 🏢 Working Location
- Cleaned up: **Office** and **Remote / WFH** (Field option removed).

### 3. ⚪ "Unmarked" Status Option
- Candidates and developers can reset/clear today's attendance back to **Unmarked (Pending)** anytime.

---



## ☁️ Vercel Deployment Guide (with PostgreSQL)

### Step 1: Free PostgreSQL Database Create Karein (Neon.tech - 30 seconds)
1. [neon.tech](https://neon.tech) par jaakar free account banayein ya GitHub se login karein.
2. Ek naya project create karein (e.g. `attendance-portal`).
3. Dashboard par aapko **Connection string** milegi:

   *(Isko copy kar lein)*

### Step 2: GitHub par code push karein
```bash
git remote add origin https://github.com/<your-username>/<your-repo-name>.git
git branch -M main
git push -u origin main
```

### Step 3: Vercel par Deploy karein
1. [vercel.com](https://vercel.com) par login karein aur **"Add New Project"** -> **"Import"** select karein.
2. Apne GitHub repository ko select karein.
3. **Environment Variables** section me ye keys add karein:
   - `DATABASE_URL`: Aapki Neon PostgreSQL connection string
   - `JWT_SECRET`: `forcecraver-super-secret-master-token-key-2026`
   - `SMTP_HOST`: ``
   - `SMTP_PORT`: `465`
   - `SMTP_USER`: ``
   - `SMTP_PASS`: ``
   - `EMAIL_FROM`: `Forcecraver Attendance Portal `
4. **Deploy** button dabayein!

> 💡 **Auto Migration:** Database tables (`users`, `attendance`, `holidays`) aur default accounts (`developer@portal.com`, `admin@portal.com`, `rahul@portal.com`) deploy hote hi automatically create ho jayenge!

---

## 🚀 Local Run (Development)
1. Apni `.env` file me `DATABASE_URL` daalein:
   ```env
   DATABASE_URL="postgresql://user:password@localhost:5432/attendance"
   ```
2. Server start karein:
   ```bash
   npm start
   ```
   Open **http://localhost:5000**
