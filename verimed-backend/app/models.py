import jwt
import bcrypt
from datetime import datetime, timedelta
from config import Config
from app.database import execute_query, execute_update, execute_insert, get_db_connection

class User:
    """User Model"""
    
    @staticmethod
    def create_user(username, email, password, full_name, role, company_name, license_number):
        """Create a new user"""
        password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        
        query = """
            INSERT INTO users (username, email, password_hash, full_name, role, company_name, license_number, is_active)
            VALUES (%s, %s, %s, %s, %s, %s, %s, TRUE)
        """
        
        return execute_update(query, (username, email, password_hash, full_name, role, company_name, license_number))
    
    @staticmethod
    def get_user_by_username(username):
        """Get user by username"""
        query = "SELECT * FROM users WHERE username = %s"
        return execute_query(query, (username,), fetch_one=True)
    
    @staticmethod
    def get_user_by_id(user_id):
        """Get user by ID"""
        query = "SELECT * FROM users WHERE id = %s"
        return execute_query(query, (user_id,), fetch_one=True)
    
    @staticmethod
    def get_user_by_email(email):
        """Get user by email"""
        query = "SELECT * FROM users WHERE email = %s"
        return execute_query(query, (email,), fetch_one=True)
    
    @staticmethod
    def verify_password(password, password_hash):
        """Verify password against hash"""
        return bcrypt.checkpw(password.encode('utf-8'), password_hash.encode('utf-8'))
    
    @staticmethod
    def get_all_users(role=None):
        """Get all users, optionally filtered by role"""
        if role:
            query = "SELECT id, username, email, full_name, role, company_name FROM users WHERE role = %s AND is_active = TRUE"
            return execute_query(query, (role,))
        query = "SELECT id, username, email, full_name, role, company_name FROM users WHERE is_active = TRUE"
        return execute_query(query)

class Medicine:
    """Medicine Model"""
    
    @staticmethod
    def create_medicine(medicine_name, generic_name, dosage, manufacturer_id, active_ingredient, manufacturer_info):
        """Create a new medicine and return its ID"""
        query = """
            INSERT INTO medicines (medicine_name, generic_name, dosage, manufacturer_id, active_ingredient, manufacturer_info)
            VALUES (%s, %s, %s, %s, %s, %s)
        """
        return execute_insert(query, (medicine_name, generic_name, dosage, manufacturer_id, active_ingredient, manufacturer_info))
    
    @staticmethod
    def get_medicine_by_id(medicine_id):
        """Get medicine by ID"""
        query = "SELECT * FROM medicines WHERE id = %s"
        return execute_query(query, (medicine_id,), fetch_one=True)
    
    @staticmethod
    def get_medicines_by_manufacturer(manufacturer_id):
        """Get all medicines by manufacturer"""
        query = "SELECT * FROM medicines WHERE manufacturer_id = %s AND is_active = TRUE"
        return execute_query(query, (manufacturer_id,))
    
    @staticmethod
    def get_all_medicines():
        """Get all medicines"""
        query = "SELECT * FROM medicines WHERE is_active = TRUE"
        return execute_query(query)

class MedicineBatch:
    """Medicine Batch Model"""
    
    @staticmethod
    def create_batch(batch_id, medicine_id, manufacturer_id, quantity, manufacturing_date, 
                    expiry_date, qr_code_data, qr_code_base64, serial_number, lot_number):
        """Create a new medicine batch"""
        query = """
            INSERT INTO medicine_batches 
            (batch_id, medicine_id, manufacturer_id, quantity, manufacturing_date, expiry_date, 
             qr_code_data, qr_code_base64, serial_number, lot_number, batch_status)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'active')
        """
        return execute_update(query, (batch_id, medicine_id, manufacturer_id, quantity, manufacturing_date,
                                     expiry_date, qr_code_data, qr_code_base64, serial_number, lot_number))
    
    @staticmethod
    def get_batch_by_id(batch_id):
        """Get batch by ID"""
        query = "SELECT * FROM medicine_batches WHERE id = %s"
        return execute_query(query, (batch_id,), fetch_one=True)
    
    @staticmethod
    def get_batch_by_batch_id(batch_id_str):
        """Get batch by batch_id string"""
        query = """
            SELECT mb.*, m.medicine_name, u.company_name 
            FROM medicine_batches mb
            JOIN medicines m ON mb.medicine_id = m.id
            JOIN users u ON mb.manufacturer_id = u.id
            WHERE mb.batch_id = %s
        """
        return execute_query(query, (batch_id_str,), fetch_one=True)
    
    @staticmethod
    def get_batches_by_manufacturer(manufacturer_id):
        """Get all batches by manufacturer"""
        query = """
            SELECT mb.*, m.medicine_name 
            FROM medicine_batches mb
            JOIN medicines m ON mb.medicine_id = m.id
            WHERE mb.manufacturer_id = %s AND mb.batch_status = 'active'
            ORDER BY mb.created_at DESC
        """
        return execute_query(query, (manufacturer_id,))
    
    @staticmethod
    def update_batch_status(batch_id, status):
        """Update batch status"""
        query = "UPDATE medicine_batches SET batch_status = %s WHERE id = %s"
        return execute_update(query, (status, batch_id))
    
    @staticmethod
    def check_expiry_date(batch_id):
        """Check if batch is expired — handles both str and date objects from MySQL"""
        query = "SELECT expiry_date FROM medicine_batches WHERE id = %s"
        result = execute_query(query, (batch_id,), fetch_one=True)
        if not result:
            return False
        expiry = result['expiry_date']
        # PyMySQL may return a datetime.date directly or a str depending on the driver version
        if isinstance(expiry, str):
            from datetime import date
            expiry = datetime.strptime(expiry, '%Y-%m-%d').date()
        elif hasattr(expiry, 'date'):
            expiry = expiry.date()  # datetime → date
        # expiry is now a datetime.date
        return expiry < datetime.now().date()

class RetailerInventory:
    """Retailer Inventory Model"""
    
    @staticmethod
    def add_to_inventory(retailer_id, batch_id, quantity_received, received_date, received_from_user):
        """Add batch to retailer inventory"""
        query = """
            INSERT INTO retailer_inventory 
            (retailer_id, batch_id, quantity_received, quantity_in_stock, received_date, received_from_user)
            VALUES (%s, %s, %s, %s, %s, %s)
            ON DUPLICATE KEY UPDATE
            quantity_in_stock = quantity_in_stock + %s
        """
        return execute_update(query, (retailer_id, batch_id, quantity_received, quantity_received, 
                                     received_date, received_from_user, quantity_received))
    
    @staticmethod
    def get_retailer_inventory(retailer_id):
        """Get all inventory for a retailer"""
        query = """
            SELECT
                ri.id             AS internal_id,
                ri.retailer_id,
                ri.quantity_received,
                ri.quantity_in_stock,
                ri.quantity_sold,
                ri.received_date,
                ri.is_verified,
                mb.batch_id       AS batch_id,
                mb.expiry_date,
                mb.batch_status,
                m.medicine_name
            FROM retailer_inventory ri
            JOIN medicine_batches mb ON ri.batch_id = mb.id
            JOIN medicines m ON mb.medicine_id = m.id
            WHERE ri.retailer_id = %s
            ORDER BY mb.expiry_date ASC
        """
        return execute_query(query, (retailer_id,))
    
    @staticmethod
    def get_inventory_item(retailer_id, batch_id):
        """Get specific inventory item"""
        query = """
            SELECT ri.*, mb.batch_id, mb.batch_status, m.medicine_name 
            FROM retailer_inventory ri
            JOIN medicine_batches mb ON ri.batch_id = mb.id
            JOIN medicines m ON mb.medicine_id = m.id
            WHERE ri.retailer_id = %s AND ri.batch_id = %s
        """
        return execute_query(query, (retailer_id, batch_id), fetch_one=True)
    
    @staticmethod
    def update_inventory(retailer_id, batch_id, quantity_sold):
        """Update inventory after sale"""
        query = """
            UPDATE retailer_inventory 
            SET quantity_in_stock = quantity_in_stock - %s, quantity_sold = quantity_sold + %s
            WHERE retailer_id = %s AND batch_id = %s
        """
        return execute_update(query, (quantity_sold, quantity_sold, retailer_id, batch_id))
    
    @staticmethod
    def mark_as_verified(retailer_id, batch_id):
        """Mark batch as verified by retailer"""
        query = """
            UPDATE retailer_inventory 
            SET is_verified = TRUE, last_verified_date = NOW()
            WHERE retailer_id = %s AND batch_id = %s
        """
        return execute_update(query, (retailer_id, batch_id))

    @staticmethod
    def get_inventory_stats(retailer_id):
        """Get inventory summary stats for a retailer"""
        query = """
            SELECT
                COUNT(*)                     AS total_batches,
                COALESCE(SUM(ri.quantity_in_stock), 0) AS total_units,
                COALESCE(SUM(ri.quantity_sold),     0) AS total_sold,
                COALESCE(SUM(CASE WHEN ri.is_verified = 1 THEN 1 ELSE 0 END), 0) AS verified_batches
            FROM retailer_inventory ri
            WHERE ri.retailer_id = %s
        """
        return execute_query(query, (retailer_id,), fetch_one=True)


class QRVerification:
    """QR Code Verification Model"""

    @staticmethod
    def log_verification(batch_id, verified_by_user, verified_by_role, is_authentic, verification_status, details):
        """Log a QR code verification"""
        import json
        query = """
            INSERT INTO qr_verifications 
            (batch_id, verified_by_user, verified_by_role, is_authentic, verification_status, verification_details)
            VALUES (%s, %s, %s, %s, %s, %s)
        """
        return execute_update(query, (batch_id, verified_by_user, verified_by_role, is_authentic, 
                                     verification_status, json.dumps(details)))
    
    @staticmethod
    def get_verification_history(batch_id):
        """Get verification history for a batch"""
        query = """
            SELECT qv.*, u.username, u.role 
            FROM qr_verifications qv
            LEFT JOIN users u ON qv.verified_by_user = u.id
            WHERE qv.batch_id = %s
            ORDER BY qv.verified_at DESC
        """
        return execute_query(query, (batch_id,))

class BatchHistory:
    """Batch History/Tracking Model"""
    
    @staticmethod
    def log_event(batch_id, event_type, location, scanned_by_user, scanned_by_role):
        """Log a batch event"""
        query = """
            INSERT INTO batch_history 
            (batch_id, event_type, location, scanned_by_user, scanned_by_role)
            VALUES (%s, %s, %s, %s, %s)
        """
        return execute_update(query, (batch_id, event_type, location, scanned_by_user, scanned_by_role))
    
    @staticmethod
    def get_batch_history(batch_id):
        """Get history for a batch"""
        query = """
            SELECT bh.*, u.username 
            FROM batch_history bh
            LEFT JOIN users u ON bh.scanned_by_user = u.id
            WHERE bh.batch_id = %s
            ORDER BY bh.timestamp DESC
        """
        return execute_query(query, (batch_id,))

class Analytics:
    """Analytics Model"""
    
    @staticmethod
    def record_metric(user_id, user_role, metric_type, metric_value, metric_date=None):
        """Record an analytics metric"""
        if metric_date is None:
            metric_date = datetime.now().date()
        
        query = """
            INSERT INTO analytics 
            (user_id, user_role, metric_type, metric_value, metric_date)
            VALUES (%s, %s, %s, %s, %s)
            ON DUPLICATE KEY UPDATE metric_value = metric_value + %s
        """
        return execute_update(query, (user_id, user_role, metric_type, metric_value, metric_date, metric_value))
    
    @staticmethod
    def get_manufacturer_analytics(manufacturer_id, days=30):
        """Get manufacturer analytics"""
        query = """
            SELECT metric_type, SUM(metric_value) as total
            FROM analytics
            WHERE user_id = %s AND user_role = 'manufacturer' 
            AND metric_date >= DATE_SUB(CURDATE(), INTERVAL %s DAY)
            GROUP BY metric_type
        """
        return execute_query(query, (manufacturer_id, days))
    
    @staticmethod
    def get_retailer_analytics(retailer_id, days=30):
        """Get retailer analytics"""
        query = """
            SELECT metric_type, SUM(metric_value) as total
            FROM analytics
            WHERE user_id = %s AND user_role = 'retailer' 
            AND metric_date >= DATE_SUB(CURDATE(), INTERVAL %s DAY)
            GROUP BY metric_type
        """
        return execute_query(query, (retailer_id, days))
    
    @staticmethod
    def get_inventory_stats(retailer_id):
        """Get inventory statistics for retailer"""
        query = """
            SELECT 
                COUNT(*) as total_batches,
                SUM(quantity_in_stock) as total_units,
                SUM(quantity_sold) as total_sold,
                SUM(CASE WHEN is_verified = TRUE THEN 1 ELSE 0 END) as verified_batches
            FROM retailer_inventory
            WHERE retailer_id = %s
        """
        return execute_query(query, (retailer_id,), fetch_one=True)
