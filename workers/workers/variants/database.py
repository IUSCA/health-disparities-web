import atexit

import psycopg2

from workers.config import config

conn = None


def initialize_db_connection():
    global conn
    print('connecting to the database')
    conn = psycopg2.connect(**config['variant_database'], gssencmode='disable')
    return conn


def connect_to_database():
    try:
        connection = psycopg2.connect(**config['variant_database'], gssencmode='disable')
        return connection
    except Exception as e:
        print(f"Error connecting to the database: {e}")
        return None


def close_db_connection():
    global conn
    if conn:
        conn.close()


# Register the close_db_connection function to be called on program exit
atexit.register(close_db_connection)
conn = initialize_db_connection()
