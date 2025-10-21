# -*- coding: utf-8 -*-
import pyodbc
import sys

try:
    conn = pyodbc.connect(
        'DRIVER={IBM i Access ODBC Driver};'
        'SYSTEM=10.247.194.1;'
        'UID=FA01001;'
        'PWD=FA01001;'
        'DBQ=WAVEDLIB;'
    )
    print("[OK] Ket noi thanh cong!")
    cursor = conn.cursor()
    cursor.execute('SELECT 1 FROM SYSIBM.SYSDUMMY1')
    result = cursor.fetchone()
    print(f"[OK] Query test OK: {result}")
    conn.close()
except pyodbc.Error as e:
    print(f"[ERROR] Loi ODBC: {e}")
    print(f"Error code: {e.args[0] if e.args else 'N/A'}")
    sys.exit(1)
except Exception as e:
    print(f"[ERROR] Loi: {e}")
    sys.exit(1)
