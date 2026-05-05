-- ==========================================
-- VeriMed Database Schema
-- ==========================================

CREATE DATABASE IF NOT EXISTS verimed_db;
USE verimed_db;

-- ==========================================
-- USERS TABLE
-- ==========================================
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100),
    role ENUM('manufacturer', 'retailer', 'customer') NOT NULL DEFAULT 'retailer',
    company_name VARCHAR(100),
    license_number VARCHAR(50),
    contact_phone VARCHAR(20),
    address TEXT,
    city VARCHAR(50),
    state VARCHAR(50),
    country VARCHAR(50),
    postal_code VARCHAR(20),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_role (role),
    INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ==========================================
-- MEDICINES TABLE (Master Data)
-- ==========================================
CREATE TABLE medicines (
    id INT AUTO_INCREMENT PRIMARY KEY,
    medicine_name VARCHAR(100) NOT NULL,
    generic_name VARCHAR(100),
    dosage VARCHAR(50),
    manufacturer_id INT NOT NULL,
    active_ingredient VARCHAR(255),
    manufacturer_info VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (manufacturer_id) REFERENCES users(id) ON DELETE RESTRICT,
    INDEX idx_medicine_name (medicine_name),
    INDEX idx_manufacturer_id (manufacturer_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ==========================================
-- MEDICINE BATCHES TABLE
-- ==========================================
CREATE TABLE medicine_batches (
    id INT AUTO_INCREMENT PRIMARY KEY,
    batch_id VARCHAR(50) NOT NULL UNIQUE,
    medicine_id INT NOT NULL,
    manufacturer_id INT NOT NULL,
    quantity INT NOT NULL,
    manufacturing_date DATE NOT NULL,
    expiry_date DATE NOT NULL,
    batch_status ENUM('active', 'expired', 'recalled') DEFAULT 'active',
    qr_code_data LONGTEXT,
    qr_code_base64 LONGTEXT,
    serial_number VARCHAR(100),
    lot_number VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (medicine_id) REFERENCES medicines(id) ON DELETE RESTRICT,
    FOREIGN KEY (manufacturer_id) REFERENCES users(id) ON DELETE RESTRICT,
    INDEX idx_batch_id (batch_id),
    INDEX idx_manufacturer_id (manufacturer_id),
    INDEX idx_expiry_date (expiry_date),
    INDEX idx_batch_status (batch_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ==========================================
-- BATCH HISTORY TABLE (Verification/Tracking)
-- ==========================================
CREATE TABLE batch_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    batch_id INT NOT NULL,
    event_type ENUM('created', 'verified', 'delivered', 'scanned') NOT NULL,
    location VARCHAR(255),
    scanned_by_user INT,
    scanned_by_role ENUM('manufacturer', 'retailer') NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (batch_id) REFERENCES medicine_batches(id) ON DELETE CASCADE,
    FOREIGN KEY (scanned_by_user) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_batch_id (batch_id),
    INDEX idx_timestamp (timestamp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ==========================================
-- RETAILER INVENTORY TABLE
-- ==========================================
CREATE TABLE retailer_inventory (
    id INT AUTO_INCREMENT PRIMARY KEY,
    retailer_id INT NOT NULL,
    batch_id INT NOT NULL,
    quantity_received INT NOT NULL,
    quantity_in_stock INT NOT NULL,
    quantity_sold INT DEFAULT 0,
    received_date DATE NOT NULL,
    received_from_user INT,
    last_verified_date DATETIME,
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (retailer_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (batch_id) REFERENCES medicine_batches(id) ON DELETE RESTRICT,
    FOREIGN KEY (received_from_user) REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE KEY unique_retailer_batch (retailer_id, batch_id),
    INDEX idx_retailer_id (retailer_id),
    INDEX idx_batch_id (batch_id),
    INDEX idx_is_verified (is_verified)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ==========================================
-- DELIVERIES TABLE
-- ==========================================
CREATE TABLE deliveries (
    id INT AUTO_INCREMENT PRIMARY KEY,
    delivery_id VARCHAR(50) NOT NULL UNIQUE,
    manufacturer_id INT NOT NULL,
    retailer_id INT NOT NULL,
    batch_id INT NOT NULL,
    quantity INT NOT NULL,
    delivery_date DATE,
    delivery_status ENUM('pending', 'in_transit', 'delivered', 'cancelled') DEFAULT 'pending',
    delivered_at DATETIME,
    verified_at DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (manufacturer_id) REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY (retailer_id) REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY (batch_id) REFERENCES medicine_batches(id) ON DELETE RESTRICT,
    INDEX idx_delivery_id (delivery_id),
    INDEX idx_manufacturer_id (manufacturer_id),
    INDEX idx_retailer_id (retailer_id),
    INDEX idx_delivery_status (delivery_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ==========================================
-- QR CODE VERIFICATION LOG TABLE
-- ==========================================
CREATE TABLE qr_verifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    batch_id INT NOT NULL,
    verified_by_user INT,
    verified_by_role ENUM('manufacturer', 'retailer', 'consumer') NOT NULL,
    is_authentic BOOLEAN DEFAULT TRUE,
    verification_status ENUM('valid', 'expired', 'counterfeit', 'unknown') DEFAULT 'valid',
    verification_details JSON,
    verified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (batch_id) REFERENCES medicine_batches(id) ON DELETE CASCADE,
    FOREIGN KEY (verified_by_user) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_batch_id (batch_id),
    INDEX idx_verified_at (verified_at),
    INDEX idx_is_authentic (is_authentic)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ==========================================
-- ANALYTICS TABLE
-- ==========================================
CREATE TABLE analytics (
    id INT AUTO_INCREMENT PRIMARY KEY,
    metric_date DATE NOT NULL,
    user_id INT,
    user_role ENUM('manufacturer', 'retailer', 'customer') NOT NULL,
    metric_type ENUM('batches_created', 'batches_verified', 'inventory_level', 'sales', 'deliveries') NOT NULL,
    metric_value INT DEFAULT 0,
    metric_details JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_user_id (user_id),
    INDEX idx_metric_date (metric_date),
    INDEX idx_metric_type (metric_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ==========================================
-- ALERTS TABLE
-- ==========================================
CREATE TABLE alerts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    alert_type ENUM('expiring_soon', 'expired', 'low_stock', 'delivery_pending', 'verification_failed') NOT NULL,
    user_id INT NOT NULL,
    batch_id INT,
    severity ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium',
    message TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    action_url VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (batch_id) REFERENCES medicine_batches(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_alert_type (alert_type),
    INDEX idx_is_read (is_read)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ==========================================
-- Create Indexes for Performance
-- ==========================================
CREATE INDEX idx_users_created_at ON users(created_at);
CREATE INDEX idx_batches_created_at ON medicine_batches(created_at);
CREATE INDEX idx_inventory_updated_at ON retailer_inventory(updated_at);
