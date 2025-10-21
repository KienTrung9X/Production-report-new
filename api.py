from flask import Flask, jsonify, request
from flask_cors import CORS
import pyodbc
import json
import os

app = Flask(__name__)
CORS(app)

def get_connection():
    return pyodbc.connect(
        'DRIVER={IBM i Access ODBC Driver};'
        'SYSTEM=10.247.194.1;'
        'UID=FA01001;'
        'PWD=FA01001;'
        'DBQ=WAVEDLIB;'
    )

@app.route('/api/health')
def health():
    return jsonify({'status': 'ok'})

@app.route('/api/test-connection')
def test_connection():
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute('SELECT 1 FROM SYSIBM.SYSDUMMY1')
        result = cursor.fetchone()
        conn.close()
        return jsonify({'success': True, 'message': 'Kết nối AS/400 thành công!'})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/raw-data')
def get_raw_data():
    start_date = request.args.get('start_date', '20250101')
    end_date = request.args.get('end_date', '20251231')
    line = request.args.get('line', None)

    sql = """
        SELECT 
            PCPU9H AS COMP_DAY,
            LN1C9H AS LINE1,
            LN2C9H AS LINE2,
            LN_NAME,
            PSHN9H AS PR,
            ITMC9H AS ITEM,
            IT1IA0 AS ITEM1,
            IT2IA0 AS ITEM2,
            PSHQ9H AS EST_PRO_QTY,
            PCPQ9H AS ACT_PRO_QTY,
            QUNC9H AS UNIT,
            SIZCA0 AS SIZE,
            CHNCA0 AS CH
        FROM WAVEDLIB.F9H00
        INNER JOIN WAVEDLIB.FA000 ON ITMC9H = ITMCA0
        INNER JOIN (
            SELECT DGRC09, SUBSTR(DDTC09,1,3) AS LN1, SUBSTR(DDTC09,4,2) AS LN2,
            CN1I09 AS LN_NAME FROM WAVEDLIB.C0900 
            WHERE DGRC09 = 'LN1C' AND SUBSTR(DDTC09,6,2) = '01'
        ) AS LINE_INFO ON LINE_INFO.LN1 = LN1C9H AND LINE_INFO.LN2 = LN2C9H
        WHERE PCPU9H BETWEEN ? AND ?
        AND LN1C9H IN ('111','121','312','313','161','315')
    """
    
    params = [start_date, end_date]
    if line:
        sql += " AND LN_NAME = ?"
        params.append(line)

    sql += " ORDER BY PCPU9H DESC"

    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(sql, tuple(params))
        
        columns = [column[0] for column in cursor.description]
        raw_results = [dict(zip(columns, row)) for row in cursor.fetchall()]
        
        conn.close()
        
        results = []
        for row in raw_results:
            results.append({
                'id': f"row-{len(results)+1}",
                'area': str(row.get('LINE1', '')),
                'week': str(row.get('COMP_DAY', '')),
                'line': str(row.get('LN_NAME', '')).strip(),
                'itemcode': str(row.get('PR', '')),
                'item1': str(row.get('ITEM', '')),
                'item2': str(row.get('ITEM1', '')).strip(),
                'planQty': float(row.get('EST_PRO_QTY', 0) or 0),
                'actualQty': float(row.get('ACT_PRO_QTY', 0) or 0),
                'unit': str(row.get('UNIT', 'KG')).strip(),
                'date': str(row.get('COMP_DAY', '')),
                'group': str(row.get('LINE2', '')),
                'item3': str(row.get('ITEM2', '')).strip(),
                'size': str(row.get('SIZE', '')).strip(),
                'qcPass': str(row.get('CH', '')).strip(),
                'note': ''
            })
        
        return jsonify(results)
    except pyodbc.Error as e:
        error_msg = str(e)
        if 'Data source name not found' in error_msg or 'IM002' in error_msg:
            return jsonify({'error': 'IBM i Access ODBC Driver chưa được cài đặt. Vui lòng cài đặt driver từ IBM.'}), 500
        elif 'Communication link failure' in error_msg or '08S01' in error_msg:
            return jsonify({'error': 'Không thể kết nối đến AS/400. Kiểm tra network và thông tin kết nối.'}), 500
        else:
            return jsonify({'error': f'Lỗi database: {error_msg}'}), 500
    except Exception as e:
        return jsonify({'error': f'Lỗi không xác định: {str(e)}'}), 500

@app.route('/api/lines')
def get_lines():
    sql = """
        SELECT DISTINCT CN1I09 AS LN_NAME 
        FROM WAVEDLIB.C0900 
        WHERE DGRC09 = 'LN1C' AND SUBSTR(DDTC09,6,2) = '01'
        AND SUBSTR(DDTC09,1,3) IN ('111','121','312','313','161','315')
        ORDER BY LN_NAME
    """
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(sql)
        lines = [row[0].strip() for row in cursor.fetchall()]
        conn.close()
        return jsonify(lines)
    except pyodbc.Error as e:
        error_msg = str(e)
        if 'Data source name not found' in error_msg or 'IM002' in error_msg:
            return jsonify({'error': 'IBM i Access ODBC Driver chưa được cài đặt'}), 500
        elif 'Communication link failure' in error_msg or '08S01' in error_msg:
            return jsonify({'error': 'Không thể kết nối đến AS/400'}), 500
        else:
            return jsonify({'error': f'Lỗi database: {error_msg}'}), 500
    except Exception as e:
        return jsonify({'error': f'Lỗi: {str(e)}'}), 500

@app.route('/api/production-data')
def get_production_data():
    start_date = request.args.get('start_date', '20250101').replace('-', '')
    end_date = request.args.get('end_date', '20251231').replace('-', '')
    save_to_file = request.args.get('save', 'false').lower() == 'true'
    
    print(f"📊 Fetching data from {start_date} to {end_date}")

    sql = """
        SELECT 
            PCPU9H AS COMP_DAY,
            LN1C9H AS LINE1,
            LN2C9H AS LINE2,
            LN_NAME,
            PSHN9H AS PR,
            ITMC9H AS ITEM,
            IT1IA0 AS ITEM1,
            IT2IA0 AS ITEM2,
            PSHQ9H AS EST_PRO_QTY,
            PCPQ9H AS ACT_PRO_QTY,
            QUNC9H AS UNIT,
            SIZCA0 AS SIZE,
            CHNCA0 AS CH
        FROM WAVEDLIB.F9H00
        INNER JOIN WAVEDLIB.FA000 ON ITMC9H = ITMCA0
        INNER JOIN (
            SELECT DGRC09, SUBSTR(DDTC09,1,3) AS LN1, SUBSTR(DDTC09,4,2) AS LN2,
            CN1I09 AS LN_NAME FROM WAVEDLIB.C0900 
            WHERE DGRC09 = 'LN1C' AND SUBSTR(DDTC09,6,2) = '01'
        ) AS LINE_INFO ON LINE_INFO.LN1 = LN1C9H AND LINE_INFO.LN2 = LN2C9H
        WHERE PCPU9H BETWEEN ? AND ?
        AND LN1C9H IN ('111','121','312','313','161','315')
        ORDER BY PCPU9H DESC
    """

    try:
        print("🔌 Connecting to AS/400...")
        conn = get_connection()
        cursor = conn.cursor()
        print("📝 Executing query...")
        cursor.execute(sql, (start_date, end_date))
        
        columns = [column[0] for column in cursor.description]
        raw_results = [dict(zip(columns, row)) for row in cursor.fetchall()]
        
        conn.close()
        print(f"✅ Fetched {len(raw_results)} records")
        
        results = []
        for row in raw_results:
            results.append({
                'area': str(row.get('LINE1', '')),
                'week': str(row.get('COMP_DAY', '')),
                'line': str(row.get('LN_NAME', '')).strip(),
                'itemcode': str(row.get('PR', '')),
                'item1': str(row.get('ITEM', '')),
                'item2': str(row.get('ITEM1', '')).strip(),
                'planQty': float(row.get('EST_PRO_QTY', 0) or 0),
                'actualQty': float(row.get('ACT_PRO_QTY', 0) or 0),
                'unit': str(row.get('UNIT', 'KG')).strip(),
                'date': str(row.get('COMP_DAY', '')),
                'group': str(row.get('LINE2', '')),
                'item3': str(row.get('ITEM2', '')).strip(),
                'size': str(row.get('SIZE', '')).strip(),
                'qcPass': str(row.get('CH', '')).strip(),
            })
        
        if save_to_file:
            print("💾 Saving to file...")
            with open('production-data.json', 'w', encoding='utf-8') as f:
                json.dump(results, f, ensure_ascii=False, indent=2)
            print(f"✅ Saved {len(results)} records")
            return jsonify({'success': True, 'saved': len(results), 'message': f'Đã lưu {len(results)} dòng vào production-data.json'})
        
        return jsonify(results)
    except pyodbc.Error as e:
        error_msg = str(e)
        if 'Data source name not found' in error_msg or 'IM002' in error_msg:
            return jsonify({'error': 'IBM i Access ODBC Driver chưa được cài đặt. Tải tại: https://www.ibm.com/support/pages/ibm-i-access-client-solutions'}), 500
        elif 'Communication link failure' in error_msg or '08S01' in error_msg:
            return jsonify({'error': 'Không thể kết nối đến AS/400 (10.247.194.1). Kiểm tra network.'}), 500
        elif 'Invalid authorization' in error_msg or '28000' in error_msg:
            return jsonify({'error': 'Sai username/password kết nối AS/400'}), 500
        else:
            return jsonify({'error': f'Lỗi database: {error_msg}'}), 500
    except Exception as e:
        return jsonify({'error': f'Lỗi: {str(e)}'}), 500

if __name__ == '__main__':
    app.run(port=5000, debug=True)
