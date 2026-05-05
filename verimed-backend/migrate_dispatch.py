"""
Migration: Add retailer dispatch info columns to the deliveries table.
Run once: python migrate_dispatch.py
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from app.database import execute_update, execute_query

def column_exists(table, column):
    result = execute_query(
        "SELECT COUNT(*) as cnt FROM information_schema.columns "
        "WHERE table_schema = DATABASE() AND table_name = %s AND column_name = %s",
        (table, column),
        fetch_one=True
    )
    return result and result['cnt'] > 0

print("Running dispatch migration...")

# Make retailer_id nullable
try:
    execute_update("ALTER TABLE deliveries MODIFY COLUMN retailer_id INT NULL", ())
    print("  OK: retailer_id made nullable")
except Exception as e:
    print(f"  SKIP: retailer_id modify ({e})")

# Add new columns only if they don't exist
new_cols = [
    ("retailer_name",    "ALTER TABLE deliveries ADD COLUMN retailer_name VARCHAR(150) DEFAULT NULL"),
    ("retailer_contact", "ALTER TABLE deliveries ADD COLUMN retailer_contact VARCHAR(50) DEFAULT NULL"),
    ("retailer_location","ALTER TABLE deliveries ADD COLUMN retailer_location VARCHAR(255) DEFAULT NULL"),
    ("retailer_website", "ALTER TABLE deliveries ADD COLUMN retailer_website VARCHAR(255) DEFAULT NULL"),
]

for col, sql in new_cols:
    if not column_exists("deliveries", col):
        try:
            execute_update(sql, ())
            print(f"  OK: Added column {col}")
        except Exception as e:
            print(f"  ERROR adding {col}: {e}")
    else:
        print(f"  SKIP: column {col} already exists")

print("Migration complete.")
