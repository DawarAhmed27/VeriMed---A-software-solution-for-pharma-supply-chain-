import pymysql
import os
from dotenv import load_dotenv

load_dotenv()

try:
    host = os.getenv('MYSQL_HOST', 'localhost')
    user = os.getenv('MYSQL_USER', 'root')
    password = os.getenv('MYSQL_PASSWORD', '1234')
    db_name = os.getenv('MYSQL_DB', 'verimed_db')

    # Connect without database first to create it
    conn = pymysql.connect(host=host, user=user, password=password)
    cursor = conn.cursor()
    cursor.execute(f'CREATE DATABASE IF NOT EXISTS {db_name}')
    conn.commit()
    conn.select_db(db_name)
    
    with open('database.sql', 'r') as f:
        sql = f.read()
        
    for statement in sql.split(';'):
        if statement.strip():
            cursor.execute(statement)
            
    conn.commit()
    conn.close()
    print('Database initialized successfully')
except Exception as e:
    print(f'Error: {e}')
