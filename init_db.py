#!/usr/bin/env python3
import pymysql
import sys

# Database connection parameters
host = 'localhost'
user = 'root'
password = '1234'

# Read SQL script
with open('verimed-backend/database.sql', 'r') as f:
    sql_script = f.read()

try:
    # Connect to MySQL
    conn = pymysql.connect(
        host=host,
        user=user,
        password=password,
        charset='utf8mb4'
    )
    cursor = conn.cursor()
    
    # Split and execute statements
    statements = sql_script.split(';')
    for statement in statements:
        statement = statement.strip()
        if statement:
            print(f"Executing: {statement[:80]}...")
            cursor.execute(statement)
    
    conn.commit()
    print("\n✓ Database initialized successfully!")
    
except Exception as e:
    print(f"✗ Error: {e}", file=sys.stderr)
    sys.exit(1)
finally:
    if conn:
        conn.close()
