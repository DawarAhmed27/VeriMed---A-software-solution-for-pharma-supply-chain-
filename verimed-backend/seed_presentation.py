"""
VeriMed Presentation Seed Script
Creates users: m1, r1, c1 with password 'pass'
Run: venv\\Scripts\\python.exe seed_presentation.py
"""
import sys
import os
import uuid
from datetime import datetime, timedelta

# Add backend to path
sys.path.insert(0, os.path.dirname(__file__))

from app.database import get_db_connection, execute_update, execute_query
from app.models import User, Medicine, MedicineBatch, RetailerInventory, Analytics
from app.utils.helpers import generate_batch_id, generate_qr_data, generate_qr_code

def clear_existing_presentation_data():
    conn = get_db_connection()
    with conn.cursor() as cursor:
        cursor.execute("SET FOREIGN_KEY_CHECKS = 0;")
        # Delete specific presentation users if they exist
        cursor.execute("DELETE FROM users WHERE username IN ('m1', 'r1', 'c1')")
        cursor.execute("SET FOREIGN_KEY_CHECKS = 1;")
    conn.commit()
    conn.close()
    print("Cleaned up existing m1, r1, c1 users.")

def run():
    print("=== VeriMed Presentation Data Seed ===")
    clear_existing_presentation_data()

    password = "pass"

    # 1. Create Users
    print("Creating Presentation Users...")
    
    # Manufacturer m1
    User.create_user(
        "m1", "manufacturer@verimed.com", password, 
        "Dr. Sarah Ahmed", "manufacturer", "Global Pharma Solutions", "MFG-PK-9928"
    )
    execute_update("UPDATE users SET city = 'Islamabad', address = 'Industrial Area, I-9, Islamabad' WHERE username = 'm1'")
    
    # Retailer r1
    User.create_user(
        "r1", "retailer@verimed.com", password, 
        "Hassan Ali", "retailer", "City Care Pharmacy", "RET-PK-4412"
    )
    execute_update("UPDATE users SET city = 'Lahore', address = 'Liberty Market, Gulberg, Lahore', contact_phone = '042-35876611' WHERE username = 'r1'")
    
    # Customer c1
    User.create_user(
        "c1", "customer@verimed.com", password, 
        "Bilal Khan", "customer", "", ""
    )
    execute_update("UPDATE users SET city = 'Islamabad' WHERE username = 'c1'")

    # Get IDs
    m1_id = User.get_user_by_username("m1")['id']
    r1_id = User.get_user_by_username("r1")['id']
    c1_id = User.get_user_by_username("c1")['id']

    # 2. Create Medicines for m1
    print("Creating Medicines for m1...")
    med1_id = Medicine.create_medicine("VeriCillin 500mg", "Amoxicillin", "500mg", m1_id, "Amoxicillin Trihydrate", "Certified Global Pharma Lab")
    med2_id = Medicine.create_medicine("CureAll Syrup", "Paracetamol", "250mg/5ml", m1_id, "Paracetamol", "Certified Global Pharma Lab")
    med3_id = Medicine.create_medicine("HeartGuard", "Atorvastatin", "20mg", m1_id, "Atorvastatin Calcium", "Certified Global Pharma Lab")

    now = datetime.now()
    exp_good = (now + timedelta(days=730)).strftime('%Y-%m-%d') # 2 years
    exp_soon = (now + timedelta(days=45)).strftime('%Y-%m-%d')  # 45 days

    # 3. Create Batches
    print("Creating Batches...")
    def add_batch(med_id, m_id, qty, exp):
        b_id = generate_batch_id()
        m = Medicine.get_medicine_by_id(med_id)
        m_user = User.get_user_by_id(m_id)
        qr_data = generate_qr_data(b_id, m['medicine_name'], m_user['company_name'], exp)
        qr_b64 = generate_qr_code(qr_data)
        MedicineBatch.create_batch(b_id, med_id, m_id, qty, now.strftime('%Y-%m-%d'), exp, qr_data, qr_b64, f"SN-{b_id}", f"LOT-{b_id}")
        return MedicineBatch.get_batch_by_batch_id(b_id)

    b1 = add_batch(med1_id, m1_id, 5000, exp_good)
    b2 = add_batch(med2_id, m1_id, 2000, exp_soon)
    b3 = add_batch(med3_id, m1_id, 3000, exp_good)

    # 4. Move some to Retailer r1 and others
    print("Dispatching to Retailers in different cities...")
    def dispatch(m_id, r_username, r_name, r_city, r_addr, batch, qty, website=""):
        # Check if retailer exists, create if not
        r_user = User.get_user_by_username(r_username)
        if not r_user:
            User.create_user(r_username, f"{r_username}@verimed.com", "pass", "Manager", "retailer", r_name, "RET-" + uuid.uuid4().hex[:4].upper())
            execute_update("UPDATE users SET city = %s, address = %s WHERE username = %s", (r_city, r_addr, r_username))
            r_user = User.get_user_by_username(r_username)
        
        r_id = r_user['id']
        d_id = 'DLV-' + uuid.uuid4().hex[:8].upper()
        
        execute_update(
            "INSERT INTO deliveries (delivery_id, manufacturer_id, retailer_id, batch_id, quantity, delivery_date, delivery_status, retailer_name, retailer_contact, retailer_location, retailer_website) VALUES (%s, %s, %s, %s, %s, %s, 'delivered', %s, %s, %s, %s)",
            (d_id, m_id, r_id, batch['id'], qty, now.strftime('%Y-%m-%d'), r_name, "0300-1234567", r_addr, website)
        )
        RetailerInventory.add_to_inventory(r_id, batch['id'], qty, now.strftime('%Y-%m-%d'), m_id)

    # Lahore (Already exists r1)
    dispatch(m1_id, "r1", "City Care Pharmacy", "Lahore", "Liberty Market, Gulberg", b1, 400, "www.citycare.pk")
    
    # Karachi
    dispatch(m1_id, "r_karachi", "Agha's Pharmacy", "Karachi", "Clifton Block 5, Karachi", b1, 250, "www.aghas.com")
    dispatch(m1_id, "r_karachi", "Agha's Pharmacy", "Karachi", "Clifton Block 5, Karachi", b3, 600)
    
    # Islamabad
    dispatch(m1_id, "r_isloo", "Medix Plus", "Islamabad", "Blue Area, Islamabad", b2, 150)
    
    # Peshawar
    dispatch(m1_id, "r_pessy", "Khyber Chemist", "Peshawar", "University Road, Peshawar", b3, 300)

    # 5. Add Analytics for Presentation
    print("Setting up Analytics...")
    Analytics.record_metric(m1_id, 'manufacturer', 'batches_created', 3)
    Analytics.record_metric(m1_id, 'manufacturer', 'deliveries', 5)
    Analytics.record_metric(r1_id, 'retailer', 'sales', 124)
    Analytics.record_metric(r1_id, 'retailer', 'batches_verified', 15)
    
    # Mark one batch as verified in retailer inventory
    RetailerInventory.mark_as_verified(r1_id, b1['id'])

    print("\n" + "="*40)
    print("SUCCESS: Presentation Data Seeded!")
    print("Username: m1 | Password: pass (Manufacturer)")
    print("Username: r1 | Password: pass (Retailer)")
    print("Username: c1 | Password: pass (Customer)")
    print("="*40)

if __name__ == "__main__":
    run()
