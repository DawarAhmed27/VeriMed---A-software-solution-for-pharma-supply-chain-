import mysql.connector
import os
from dotenv import load_dotenv

load_dotenv()

def check_batches():
    try:
        conn = mysql.connector.connect(
            host=os.getenv('MYSQL_HOST'),
            user=os.getenv('MYSQL_USER'),
            password=os.getenv('MYSQL_PASSWORD'),
            database=os.getenv('MYSQL_DB')
        )
        cursor = conn.cursor(dictionary=True)
        
        batch_ids = ['BT-20260505113628-A2EB', 'BT-20260505113628-C23D', 'BT-20260505113628-34C7']
        
        print("Checking Medicine Batches Table:")
        query = "SELECT id, batch_id, batch_status FROM medicine_batches WHERE batch_id IN (%s, %s, %s)"
        cursor.execute(query, tuple(batch_ids))
        batches = cursor.fetchall()
        for b in batches:
            print(f"ID: {b['id']}, Batch ID: {b['batch_id']}, Status: {b['batch_status']}")
        
        if not batches:
            print("No batches found in medicine_batches table.")
        
        print("\nChecking Retailer Inventory Table:")
        if batches:
            internal_ids = [b['id'] for b in batches]
            format_strings = ','.join(['%s'] * len(internal_ids))
            query = f"SELECT ri.*, u.username as retailer_name FROM retailer_inventory ri JOIN users u ON ri.retailer_id = u.id WHERE ri.batch_id IN ({format_strings})"
            cursor.execute(query, tuple(internal_ids))
            inventory = cursor.fetchall()
            for i in inventory:
                print(f"Retailer: {i['retailer_name']}, Batch ID (internal): {i['batch_id']}, Is Verified: {i['is_verified']}")
            
            if not inventory:
                print("No records found in retailer_inventory for these batches.")
        
        cursor.close()
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_batches()
