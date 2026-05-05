"""
VeriMed Full Seed Script
Run: venv\Scripts\python.exe seed_full_data.py
"""
import sys, os
from datetime import datetime, timedelta
sys.path.insert(0, os.path.dirname(__file__))

from app.database import get_db_connection, execute_update, execute_query
from app.models import User, Medicine, MedicineBatch, RetailerInventory, BatchHistory, Analytics
from app.utils.helpers import generate_batch_id, generate_qr_data, generate_qr_code

def clear_db():
    conn = get_db_connection()
    with conn.cursor() as cursor:
        cursor.execute("SET FOREIGN_KEY_CHECKS = 0;")
        cursor.execute("TRUNCATE TABLE batch_history;")
        cursor.execute("TRUNCATE TABLE qr_verifications;")
        cursor.execute("TRUNCATE TABLE analytics;")
        cursor.execute("TRUNCATE TABLE alerts;")
        cursor.execute("TRUNCATE TABLE deliveries;")
        cursor.execute("TRUNCATE TABLE retailer_inventory;")
        cursor.execute("TRUNCATE TABLE medicine_batches;")
        cursor.execute("TRUNCATE TABLE medicines;")
        cursor.execute("TRUNCATE TABLE users;")
        cursor.execute("SET FOREIGN_KEY_CHECKS = 1;")
    conn.commit()
    conn.close()
    print("Database cleared.")

def run():
    print("=== VeriMed Full Demo Data Seed ===")
    clear_db()

    # 1. Create Users
    print("Creating Manufacturers...")
    User.create_user("pharma_corp", "contact@pharmacorp.com", "password", "John Doe", "manufacturer", "Pharma Corp", "PH-1001")
    User.create_user("gsk_pak", "info@gsk.pk", "password", "Jane Smith", "manufacturer", "GSK Pakistan", "PH-1002")
    execute_update("UPDATE users SET city = 'Islamabad' WHERE username = 'pharma_corp'")
    execute_update("UPDATE users SET city = 'Karachi' WHERE username = 'gsk_pak'")

    print("Creating Retailers...")
    User.create_user("d_watson", "store@dwatson.com", "password", "Ali Raza", "retailer", "D. Watson Chemist", "RT-2001")
    User.create_user("shaheen", "store@shaheen.com", "password", "Ahmad Khan", "retailer", "Shaheen Chemist", "RT-2002")
    execute_update("UPDATE users SET city = 'Islamabad', address = 'F-10 Markaz, Islamabad', contact_phone = '051-111-222-333' WHERE username = 'd_watson'")
    execute_update("UPDATE users SET city = 'Lahore', address = 'Mall Road, Lahore', contact_phone = '042-111-222-333' WHERE username = 'shaheen'")

    print("Creating Customers...")
    User.create_user("customer_ali", "ali@gmail.com", "password", "Ali Customer", "customer", "", "")
    execute_update("UPDATE users SET city = 'Islamabad' WHERE username = 'customer_ali'")

    m1 = User.get_user_by_username("pharma_corp")['id']
    m2 = User.get_user_by_username("gsk_pak")['id']
    r1 = User.get_user_by_username("d_watson")['id']
    r2 = User.get_user_by_username("shaheen")['id']
    c1 = User.get_user_by_username("customer_ali")['id']

    # 2. Create Medicines
    print("Creating Medicines...")
    med1_id = Medicine.create_medicine("Panadol 500mg", "Paracetamol", "500mg", m2, "Paracetamol", "Made in PK")
    med2_id = Medicine.create_medicine("Augmentin 625mg", "Amoxicillin", "625mg", m2, "Amoxicillin", "Made in PK")
    med3_id = Medicine.create_medicine("Brufen 400mg", "Ibuprofen", "400mg", m1, "Ibuprofen", "Made in PK")
    med4_id = Medicine.create_medicine("Flagyl 400mg", "Metronidazole", "400mg", m1, "Metronidazole", "Made in PK")
    med5_id = Medicine.create_medicine("Arinac", "Ibuprofen/Pseudoephedrine", "400mg/60mg", m1, "Ibuprofen", "Made in PK")

    now = datetime.now()
    exp_good = (now + timedelta(days=365)).strftime('%Y-%m-%d')
    exp_soon = (now + timedelta(days=15)).strftime('%Y-%m-%d')

    # 3. Create Batches
    print("Creating Batches...")
    batches = []
    
    def add_batch(med_id, m_id, qty, exp):
        b_id = generate_batch_id()
        m = Medicine.get_medicine_by_id(med_id)
        m_user = User.get_user_by_id(m_id)
        qr_data = generate_qr_data(b_id, m['medicine_name'], m_user['company_name'], exp)
        qr_b64 = generate_qr_code(qr_data)
        MedicineBatch.create_batch(b_id, med_id, m_id, qty, now.strftime('%Y-%m-%d'), exp, qr_data, qr_b64, f"SN-{b_id}", f"LOT-{b_id}")
        batch = MedicineBatch.get_batch_by_batch_id(b_id)
        batches.append(batch)
        return batch

    b1 = add_batch(med1_id, m2, 10000, exp_good) # Panadol
    b2 = add_batch(med2_id, m2, 5000, exp_soon)  # Augmentin (exp soon)
    b3 = add_batch(med3_id, m1, 8000, exp_good)  # Brufen
    b4 = add_batch(med4_id, m1, 6000, exp_good)  # Flagyl
    b5 = add_batch(med5_id, m1, 2000, exp_good)  # Arinac

    # 4. Deliveries and Inventory
    print("Creating Deliveries and Inventory...")
    import uuid
    def dispatch(m_id, r_id, batch, qty, website):
        d_id = 'DLV-' + uuid.uuid4().hex[:12].upper()
        r_user = User.get_user_by_id(r_id)
        execute_update(
            "INSERT INTO deliveries (delivery_id, manufacturer_id, retailer_id, batch_id, quantity, delivery_date, delivery_status, retailer_name, retailer_contact, retailer_location, retailer_website) VALUES (%s, %s, %s, %s, %s, %s, 'delivered', %s, %s, %s, %s)",
            (d_id, m_id, r_id, batch['id'], qty, now.strftime('%Y-%m-%d'), r_user['company_name'], r_user['contact_phone'], r_user['address'] or r_user['city'], website)
        )
        RetailerInventory.add_to_inventory(r_id, batch['id'], qty, now.strftime('%Y-%m-%d'), m_id)

    dispatch(m2, r1, b1, 500, "www.dwatson.pk/panadol") # Panadol to D. Watson
    dispatch(m2, r2, b1, 300, "www.shaheenchemist.com/panadol") # Panadol to Shaheen
    dispatch(m2, r1, b2, 200, "www.dwatson.pk/augmentin") # Augmentin to D. Watson
    dispatch(m1, r2, b3, 400, "www.shaheenchemist.com/brufen") # Brufen to Shaheen
    dispatch(m1, r1, b4, 150, "www.dwatson.pk/flagyl") # Flagyl to D. Watson
    dispatch(m1, r1, b5, 500, "www.dwatson.pk/arinac") # Arinac to D. Watson

    # 5. Add some history and analytics
    print("Generating Analytics...")
    Analytics.record_metric(m2, 'manufacturer', 'batches_created', 2)
    Analytics.record_metric(m1, 'manufacturer', 'batches_created', 3)
    Analytics.record_metric(r1, 'retailer', 'sales', 100)
    Analytics.record_metric(r2, 'retailer', 'sales', 50)
    RetailerInventory.update_inventory(r1, b1['id'], 50) # Sell some panadol

    print("=== Demo Data Seed Complete ===")

if __name__ == "__main__":
    run()
