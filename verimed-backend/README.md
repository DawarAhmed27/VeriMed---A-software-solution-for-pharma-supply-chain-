# VeriMed Backend API

A pharmaceutical supply chain verification system backend built with Python Flask and MySQL.

## 🏗️ Architecture

```
verimed-backend/
├── app/
│   ├── __init__.py           # Flask app factory
│   ├── database.py           # Database connection functions
│   ├── models.py             # Data models (User, Medicine, Batch, etc.)
│   ├── auth.py               # JWT authentication utilities
│   ├── routes/
│   │   ├── __init__.py       # Blueprint registration
│   │   ├── auth.py           # Authentication endpoints
│   │   ├── medicines.py      # Medicine management endpoints
│   │   ├── batches.py        # Batch creation & verification endpoints
│   │   ├── inventory.py      # Retailer inventory endpoints
│   │   └── analytics.py      # Analytics endpoints
│   └── utils/
│       ├── __init__.py
│       └── helpers.py        # QR code generation, validation helpers
├── config.py                 # Configuration management
├── database.sql              # MySQL schema
├── requirements.txt          # Python dependencies
├── .env                      # Environment variables
└── run.py                    # Application entry point
```

## 📋 Prerequisites

- Python 3.7+
- MySQL 5.7+
- pip (Python package manager)

## 🚀 Installation

### 1. Clone the repository
```bash
cd verimed-backend
```

### 2. Create MySQL Database
```bash
mysql -u root -p < database.sql
```

### 3. Create virtual environment
```bash
# Windows
python -m venv venv
venv\Scripts\activate

# macOS/Linux
python3 -m venv venv
source venv/bin/activate
```

### 4. Install dependencies
```bash
pip install -r requirements.txt
pip install flask-cors
```

### 5. Configure environment variables
Update `.env` file with your MySQL credentials:
```
MYSQL_HOST=localhost
MYSQL_USER=root
MYSQL_PASSWORD=your_password
MYSQL_DB=verimed_db
MYSQL_PORT=3306
```

### 6. Run the application
```bash
python run.py
```

API will be available at: `http://localhost:5000`

## 📡 API Endpoints

### Authentication

#### Register
- **POST** `/api/auth/register`
- **Body:**
```json
{
  "username": "manu1",
  "email": "manu1@company.com",
  "password": "password123",
  "full_name": "John Manufacturer",
  "role": "manufacturer",
  "company_name": "Pharma Corp",
  "license_number": "PH-12345"
}
```

#### Login
- **POST** `/api/auth/login`
- **Body:**
```json
{
  "username": "manu1",
  "password": "password123"
}
```
- **Response:**
```json
{
  "message": "Login successful",
  "token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "user": {
    "id": 1,
    "username": "manu1",
    "role": "manufacturer",
    "company_name": "Pharma Corp"
  }
}
```

#### Get Profile
- **GET** `/api/auth/profile`
- **Headers:** `Authorization: Bearer <token>`

#### Get Users
- **GET** `/api/auth/users?role=manufacturer`
- **Headers:** `Authorization: Bearer <token>`

### Medicines (Manufacturer Only)

#### Create Medicine
- **POST** `/api/medicines`
- **Headers:** `Authorization: Bearer <token>`
- **Body:**
```json
{
  "medicine_name": "Amoxicillin 500mg",
  "generic_name": "Amoxicillin",
  "dosage": "500mg",
  "active_ingredient": "Amoxicillin trihydrate",
  "manufacturer_info": "Made in Germany"
}
```

#### Get All Medicines
- **GET** `/api/medicines`
- **Headers:** `Authorization: Bearer <token>`

#### Get Medicine by ID
- **GET** `/api/medicines/<medicine_id>`
- **Headers:** `Authorization: Bearer <token>`

### Medicine Batches (Manufacturer)

#### Create Batch
- **POST** `/api/batches`
- **Headers:** `Authorization: Bearer <token>`
- **Body:**
```json
{
  "medicine_id": 1,
  "quantity": 5000,
  "manufacturing_date": "2026-03-01",
  "expiry_date": "2028-03-01",
  "serial_number": "SN-123456",
  "lot_number": "LOT-789"
}
```

#### Get Manufacturer Batches
- **GET** `/api/batches`
- **Headers:** `Authorization: Bearer <token>`

#### Get Batch Details
- **GET** `/api/batches/<batch_id>`
- **Headers:** `Authorization: Bearer <token>`

#### Get QR Code
- **GET** `/api/batches/<batch_id>/qr`
- **Headers:** `Authorization: Bearer <token>`

#### Verify Batch
- **POST** `/api/batches/<batch_id>/verify`
- **Headers:** `Authorization: Bearer <token>`

### Retailer Inventory

#### Get Inventory
- **GET** `/api/inventory`
- **Headers:** `Authorization: Bearer <token>`

#### Get Inventory Stats
- **GET** `/api/inventory/stats`
- **Headers:** `Authorization: Bearer <token>`

#### Add to Inventory
- **POST** `/api/inventory/add`
- **Headers:** `Authorization: Bearer <token>`
- **Body:**
```json
{
  "batch_id": "BT-20260301-01",
  "quantity_received": 100,
  "received_date": "2026-03-05",
  "received_from_user": 1
}
```

#### Verify Inventory Item
- **POST** `/api/inventory/<batch_id>/verify`
- **Headers:** `Authorization: Bearer <token>`

#### Record Sale
- **POST** `/api/inventory/<batch_id>/sell`
- **Headers:** `Authorization: Bearer <token>`
- **Body:**
```json
{
  "quantity_sold": 25
}
```

#### Get Expiring Soon
- **GET** `/api/inventory/expiring-soon`
- **Headers:** `Authorization: Bearer <token>`

### Analytics

#### Manufacturer Analytics
- **GET** `/api/analytics/manufacturer?days=30`
- **Headers:** `Authorization: Bearer <token>`

#### Retailer Analytics
- **GET** `/api/analytics/retailer?days=30`
- **Headers:** `Authorization: Bearer <token>`

#### Retailer Inventory Analytics
- **GET** `/api/analytics/retailer/inventory`
- **Headers:** `Authorization: Bearer <token>`

## 🔐 Authentication

All protected endpoints require JWT token in Authorization header:
```
Authorization: Bearer <token>
```

Tokens expire after 24 hours (configurable in `.env`).

## 🗄️ Database Schema

### Key Tables:
- **users** - System users (manufacturers, retailers)
- **medicines** - Medicine master data
- **medicine_batches** - Batches created by manufacturers
- **retailer_inventory** - Inventory stock at retailers
- **batch_history** - Track batch movement through supply chain
- **qr_verifications** - QR code verification log
- **analytics** - Business metrics and reporting
- **alerts** - System alerts for expiry, stock levels, etc.

## 🧪 Testing

Example curl requests:

### Register
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "manu1",
    "email": "manu@company.com",
    "password": "Pass123",
    "full_name": "John Doe",
    "role": "manufacturer",
    "company_name": "Pharma Inc",
    "license_number": "PH-123"
  }'
```

### Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "manu1", "password": "Pass123"}'
```

### Create Batch
```bash
curl -X POST http://localhost:5000/api/batches \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "medicine_id": 1,
    "quantity": 5000,
    "manufacturing_date": "2026-03-01",
    "expiry_date": "2028-03-01",
    "serial_number": "SN-123",
    "lot_number": "LOT-456"
  }'
```

## ⚙️ Configuration

Update `config.py` for different environments:
- **development** - Debug enabled, suitable for development
- **production** - Debug disabled, optimized for production
- **testing** - Test configuration

## 📝 Notes

- Default user credentials (from Login.jsx): admin/admin123
- QR codes are generated on-the-fly and stored as base64 in database
- JWT tokens expire after 24 hours (configurable)
- All timestamps are in UTC
- Database uses InnoDB for transaction support

## 🐛 Troubleshooting

### MySQL Connection Error
- Verify MySQL is running
- Check credentials in `.env`
- Ensure database `verimed_db` exists

### Module Not Found
- Ensure all requirements are installed: `pip install -r requirements.txt`
- Check Python version (3.7+)

### Port Already in Use
- Change port in `.env`: `FLASK_PORT=5001`
- Or kill process using port 5000

## 📧 Support
For issues or questions, contact: support@verimed.com

## 📄 License
Proprietary - VeriMed Platform
