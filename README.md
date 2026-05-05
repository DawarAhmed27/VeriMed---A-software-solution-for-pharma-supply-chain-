# VeriMed - Advanced Supply Chain Verification System

VeriMed is a full-stack, enterprise-grade web application designed to combat counterfeit medicines in the pharmaceutical supply chain. It provides tools for manufacturers to create and dispatch verified medicine batches, retailers to manage authenticated stock, and customers to verify authenticity, find stock near them, and report suspicious medicines on a community heatmap.

---

## 🛠️ Tech Stack & Architecture

- **Frontend:** React (Vite), React Router, React Leaflet, Vanilla CSS.
- **Backend:** Python (Flask), PyMySQL, JWT Authentication.
- **Database:** MySQL.
- **Security:** SHA-256 cryptographic hashes for ledger simulation, JWT for role-based authorization.

### 📁 Project Structure
- `/verimed-frontend/` - Contains the React application (UI/UX, API integrations, pages like Dashboard, Verify, FakeReports).
  - `/src/pages/` - Core portal components (Customer, Manufacturer, Retailer, Verify, etc).
  - `/src/components/` - Reusable UI elements (VerimedNavbar, ProtectedRoute).
  - `/src/utils/` - API wrapper configuration (`api.js`).
- `/verimed-backend/` - Contains the Flask REST API.
  - `/app/routes/` - API endpoints (medicines, batches, inventory, reports, auth).
  - `init_db.py` - Database schema initialization and seeding.

---

## 🚀 How to Run the Project

### Prerequisites
- Node.js (v18+)
- Python (3.9+)
- MySQL Server (running locally)

### 1. Database Setup
Ensure MySQL is running on port 3306. Create the database and initialize the tables:
```bash
# Enter MySQL console
mysql -u root -p

# Create the database
CREATE DATABASE verimed_db;
EXIT;
```
*(Note: If your MySQL password is not blank, update the `db_config` in `verimed-backend/app/database.py`)*

### 2. Start the Backend (Flask API)
Open a terminal and navigate to the backend directory:
```powershell
cd verimed-backend

# 1. Create a virtual environment (First time only)
python -m venv venv

# 2. Activate the virtual environment
.\venv\Scripts\Activate.ps1    # On Windows
# source venv/bin/activate     # On Mac/Linux

# 3. Install dependencies
pip install -r requirements.txt

# 4. Initialize the database and dummy data
python init_db.py

# 5. Start the backend server
python run.py
```
*The backend API will be available at `http://localhost:5000/api`*

### 3. Start the Frontend (Vite/React)
Open a second terminal and navigate to the frontend directory:
```powershell
cd verimed-frontend

# 1. Install Node modules
npm install

# 2. Start the development server
npm run dev
```
*The frontend will be available at `http://localhost:5173` (or `5174` if port is in use).*

---

## 👥 Demo Accounts
You can log in to explore role-specific dashboards using the following credentials:

| Role | Username | Password |
|---|---|---|
| **Manufacturer** | `pfizer_admin` | `password123` |
| **Retailer** | `dwtok_pharmacy` | `password123` |
| **Customer** | `dawar` | `password123` |

---

## ✨ Core Features
- **Immutable Ledger:** Batch histories are visualized as blockchain-style blocks with SHA-256 hashes for transparent tracking.
- **Supply Chain Recalls:** Manufacturers can recall batches, which instantly triggers a system-wide flag on retailer inventory and the public customer verification portal.
- **Counterfeit Heatmap:** Suspected counterfeit reports are plotted on an interactive geospatial heatmap.
- **Authenticity Scanner:** Customers can scan QR codes or type in batch IDs to instantly verify if a medicine is genuine.
- **Live Stock Search:** Users can search live, verified retailer inventory to find required medication locally.
- **Premium Dark Mode:** A toggleable system-wide UI theme.
