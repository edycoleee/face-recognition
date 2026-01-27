#//app/utils/db.py
import psycopg2
import psycopg2.extras
import os
from contextlib import contextmanager

# PostgreSQL connection configuration
DB_CONFIG = {
    'dbname': os.getenv('POSTGRES_DB', 'face_db'),
    'user': os.getenv('POSTGRES_USER', 'sultan'),
    'password': os.getenv('POSTGRES_PASSWORD', 'Sulfat123#!'),
    'host': os.getenv('POSTGRES_HOST', '192.168.171.184'),
    'port': os.getenv('POSTGRES_PORT', '5432')
}

@contextmanager
def get_db_connection():
    """
    Context manager untuk PostgreSQL connection.
    Menggunakan psycopg2 dengan RealDictCursor untuk hasil query seperti dict.
    
    Usage:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM users")
            results = cursor.fetchall()
    """
    conn = psycopg2.connect(**DB_CONFIG)
    try:
        yield conn
    finally:
        conn.close()

def get_db_cursor(conn):
    """
    Get cursor dengan RealDictCursor untuk hasil query sebagai dict.
    Mirip dengan sqlite3.Row behavior.
    """
    return conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

def init_db():
    """
    Initialize database tables.
    Catatan: Jika menggunakan docker-compose dengan init.sql,
    function ini tidak diperlukan karena tables sudah auto-created.
    
    Function ini hanya sebagai fallback jika manual setup.
    """
    try:
        with get_db_connection() as conn:
            cursor = get_db_cursor(conn)
            
            # Test connection
            cursor.execute("SELECT version();")
            version = cursor.fetchone()
            print(f"✓ PostgreSQL connected: {version['version']}")
            
            # Verify pgvector extension
            cursor.execute("SELECT * FROM pg_extension WHERE extname = 'vector';")
            if cursor.fetchone():
                print("✓ pgvector extension is installed")
            else:
                print("⚠ Warning: pgvector extension not found. Run init.sql first!")
            
            # Verify tables
            cursor.execute("""
                SELECT table_name FROM information_schema.tables 
                WHERE table_schema = 'public' 
                ORDER BY table_name;
            """)
            tables = cursor.fetchall()
            if tables:
                print(f"✓ Found {len(tables)} tables:")
                for table in tables:
                    print(f"  - {table['table_name']}")
            else:
                print("⚠ Warning: No tables found. Run init.sql first!")
            
            conn.commit()
            
    except Exception as e:
        print(f"✗ Database initialization error: {str(e)}")
        raise