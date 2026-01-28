"""
Database utilities with connection pooling
"""
import psycopg2
import psycopg2.extras
import psycopg2.pool
import os
from contextlib import contextmanager
from typing import Optional, Generator
from utils.logger import logger
from config import Config

# Global connection pool
_connection_pool: Optional[psycopg2.pool.SimpleConnectionPool] = None


def get_database_config() -> dict:
    """
    Get database configuration from Config class
    
    Returns:
        Dictionary with database connection parameters
    """
    return {
        'dbname': Config.DB_NAME,
        'user': Config.DB_USER,
        'password': Config.DB_PASSWORD,
        'host': Config.DB_HOST,
        'port': Config.DB_PORT
    }


def init_connection_pool(minconn: int = 1, maxconn: int = 10) -> None:
    """
    Initialize database connection pool
    
    Args:
        minconn: Minimum number of connections in pool
        maxconn: Maximum number of connections in pool
    """
    global _connection_pool
    
    if _connection_pool is not None:
        logger.warning("Connection pool already initialized")
        return
    
    try:
        db_config = get_database_config()
        _connection_pool = psycopg2.pool.SimpleConnectionPool(
            minconn,
            maxconn,
            **db_config
        )
        logger.info(f"Database connection pool initialized (min={minconn}, max={maxconn})")
    except Exception as e:
        logger.error(f"Failed to initialize connection pool: {str(e)}")
        raise


def close_connection_pool() -> None:
    """Close all connections in the pool"""
    global _connection_pool
    
    if _connection_pool is not None:
        _connection_pool.closeall()
        _connection_pool = None
        logger.info("Database connection pool closed")


@contextmanager
def get_db_connection() -> Generator:
    """
    Context manager for PostgreSQL connection with pooling
    
    Usage:
        with get_db_connection() as conn:
            cursor = get_db_cursor(conn)
            cursor.execute("SELECT * FROM users")
            results = cursor.fetchall()
    
    Yields:
        Database connection from pool
    """
    global _connection_pool
    
    # Initialize pool if not exists
    if _connection_pool is None:
        init_connection_pool()
    
    conn = None
    try:
        # Get connection from pool
        conn = _connection_pool.getconn()
        yield conn
    except Exception as e:
        logger.error(f"Database connection error: {str(e)}")
        if conn:
            conn.rollback()
        raise
    finally:
        # Return connection to pool
        if conn:
            _connection_pool.putconn(conn)


def get_db_cursor(conn):
    """
    Get cursor with RealDictCursor for query results as dict
    
    Args:
        conn: Database connection
        
    Returns:
        Cursor with RealDictCursor factory
    """
    return conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)


def init_db() -> None:
    """
    Initialize and verify database connection
    
    This function verifies the database connection, checks for required
    extensions, and lists available tables. Should be called on app startup.
    """
    try:
        with get_db_connection() as conn:
            cursor = get_db_cursor(conn)
            
            # Test connection
            cursor.execute("SELECT version();")
            version = cursor.fetchone()
            logger.info(f"✓ PostgreSQL connected: {version['version']}")
            
            # Verify pgvector extension
            cursor.execute("SELECT * FROM pg_extension WHERE extname = 'vector';")
            if cursor.fetchone():
                logger.info("✓ pgvector extension is installed")
            else:
                logger.warning("⚠ Warning: pgvector extension not found. Run init.sql first!")
            
            # Verify tables
            cursor.execute("""
                SELECT table_name FROM information_schema.tables 
                WHERE table_schema = 'public' 
                ORDER BY table_name;
            """)
            tables = cursor.fetchall()
            if tables:
                logger.info(f"✓ Found {len(tables)} tables:")
                for table in tables:
                    logger.info(f"  - {table['table_name']}")
            else:
                logger.warning("⚠ Warning: No tables found. Run init.sql first!")
            
            conn.commit()
            
    except Exception as e:
        logger.error(f"✗ Database initialization error: {str(e)}")
        raise


def execute_query(query: str, params: tuple = None, fetch_one: bool = False) -> any:
    """
    Execute a database query with automatic connection management
    
    Args:
        query: SQL query string
        params: Query parameters
        fetch_one: If True, fetch only one result
        
    Returns:
        Query results
    """
    try:
        with get_db_connection() as conn:
            cursor = get_db_cursor(conn)
            cursor.execute(query, params)
            
            if fetch_one:
                return cursor.fetchone()
            else:
                return cursor.fetchall()
    except Exception as e:
        logger.error(f"Query execution error: {str(e)}")
        raise
