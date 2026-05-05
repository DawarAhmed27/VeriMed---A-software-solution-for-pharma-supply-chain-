import pymysql
from pymysql.cursors import DictCursor
from config import Config


def get_db_connection():
    """Get a PyMySQL database connection"""
    try:
        conn = pymysql.connect(
            host=Config.MYSQL_HOST,
            user=Config.MYSQL_USER,
            password=Config.MYSQL_PASSWORD,
            database=Config.MYSQL_DB,
            port=Config.MYSQL_PORT,
            charset='utf8mb4',
            cursorclass=DictCursor,
            autocommit=False,
        )
        return conn
    except Exception as e:
        print(f"Database connection error: {e}")
        return None


def execute_query(query, params=None, fetch_one=False):
    """Execute a database query and return results"""
    conn = get_db_connection()
    if not conn:
        return None

    try:
        with conn.cursor() as cursor:
            cursor.execute(query, params or ())
            if fetch_one:
                result = cursor.fetchone()
            else:
                result = cursor.fetchall()
        conn.commit()
        return result
    except Exception as e:
        print(f"Query execution error: {e}")
        conn.rollback()
        return None
    finally:
        conn.close()


def execute_update(query, params=None):
    """Execute an INSERT/UPDATE/DELETE query"""
    conn = get_db_connection()
    if not conn:
        return False

    try:
        with conn.cursor() as cursor:
            cursor.execute(query, params or ())
        conn.commit()
        return True
    except Exception as e:
        print(f"Update error: {e}")
        conn.rollback()
        return False
    finally:
        conn.close()


def execute_insert(query, params=None):
    """Execute an INSERT query and return the new row's lastrowid, or None on failure"""
    conn = get_db_connection()
    if not conn:
        return None

    try:
        with conn.cursor() as cursor:
            cursor.execute(query, params or ())
            new_id = cursor.lastrowid
        conn.commit()
        return new_id
    except Exception as e:
        print(f"Insert error: {e}")
        conn.rollback()
        return None
    finally:
        conn.close()


def get_last_insert_id():
    """Get the last inserted ID"""
    conn = get_db_connection()
    if not conn:
        return None

    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT LAST_INSERT_ID() as id")
            result = cursor.fetchone()
            return result.get('id') if result else None
    except Exception as e:
        print(f"Error getting last insert ID: {e}")
        return None
    finally:
        conn.close()
