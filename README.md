# TransitOps 🚛

TransitOps is a modern, enterprise-grade Fleet and Logistics Control Platform designed to streamline shipment dispatching, track vehicle maintenance, manage operator compliance, log fuel expenses, and compile visual reports. It features a sleek dashboard, persistent Dark Mode, and a simulated floating SMTP email server to handle operational alerts.

---

## 🚀 Key Features

* **Smart Dashboard:** Live fleet utilization stats, active load tracking, operational speeds, and compliance alerts.
* **Vehicle Registry:** Complete fleet registry detailing types, odometer logs, daily cost estimates, and maintenance states.
* **Driver Management:** Operator profiles with license numbers, expiry alerts, safety scores, and status toggles.
* **Trip Dispatcher:** Intelligent trip creation interface with weight capacity validation to prevent overloading.
* **Maintenance Scheduler:** Scheduled services (e.g., Oil Change) that automatically transitions vehicles to `In Shop` status.
* **Fuel & Expense Ledger:** Financial logging for refueling logs, toll fees, and general operating expenses.
* **Report Center:** Downloadable CSV and PDF strategy summaries formatted in local Indian Currency (`₹`).
* **Mock SMTP Server:** Simulated floating email server inbox to log live dispatch notifications and compliance warnings.

---

## 🔑 Role-Based Access Control (RBAC)

TransitOps enforces strict role-based route protection and UI views:

| Module | Fleet Manager | Safety Officer | Financial Analyst | Dispatcher |
| :--- | :--- | :--- | :--- | :--- |
| **Dashboard** | Full Access | Compliance Triage | Cost & ROI | Operational |
| **Vehicle Registry** | Full CRUD | View Only | View Only | View Only |
| **Driver Registry** | View Only | Full CRUD (Suspend) | No Access | View Only |
| **Trip Dispatcher** | View & Cancel | View Only | View Only | Full CRUD |
| **Maintenance** | Full CRUD | View Only | View Only (Cost) | View Only |
| **Fuel & Expense** | Log Expenses | No Access | Full CRUD | View Only |
| **Reports** | Full Access | Compliance Reports | Financial (Exports) | Operational |
| **Settings** | Read Only | No Access | No Access | No Access |

---

## 🛠️ Technology Stack

* **Frontend:** React.js, Tailwind CSS, Vite, HTML5.
* **Backend:** Node.js, Express, Supabase client.
* **Database:** PostgreSQL (Supabase backend integration).
* **PDF Export:** PDF-Lib.

---

## 📦 Installation & Setup

### Prerequisites
* **Node.js** (v16+)
* **Supabase / PostgreSQL instance**

### Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure the environment variables in a `.env` file:
   ```env
   PORT=3000
   SUPABASE_URL=your_supabase_url
   SUPABASE_KEY=your_supabase_anon_key
   ```
4. Run database migrations:
   ```bash
   npm run migrate
   ```
5. Start the server:
   ```bash
   npm run dev
   ```

### Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd ../frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure the environment variables in a `.env` file:
   ```env
   VITE_API_URL=http://localhost:3000
   ```
4. Run the development server:
   ```bash
   npm run dev
   ```
5. Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 📹 Video Walkthrough Steps
To demonstrate the capabilities of TransitOps, follow this workflow:

1. **Step 1:** Register vehicle `Van-05` (Maharashtra Hub, Capacity: 500 kg, Status: Available).
2. **Step 2:** Register driver `Alex` with a valid license and safety score.
3. **Step 3:** Create a trip draft with Cargo Weight of 450 kg assigned to `Van-05` and `Alex`.
4. **Step 4:** Dispatch trip (validates cargo <= 500 kg, triggers SMTP dispatch email).
5. **Step 5:** Verify vehicle and driver status automatically transition to `On Trip`.
6. **Step 6:** Log completion by entering the final odometer and fuel consumed (litres).
7. **Step 7:** Verify both vehicle and driver status automatically reset to `Available`.
8. **Step 8:** Log Maintenance (e.g., Oil Change) for `Van-05`. Verify status changes to `In Shop` and is hidden from trip selector dropdowns.
9. **Step 9:** Check reports to see updated operational costs and fuel efficiency averages.

---
