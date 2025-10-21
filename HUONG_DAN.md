# HƯỚNG DẪN SỬ DỤNG HỆ THỐNG

## 🚀 Cài đặt lần đầu

### 1. Cài đặt IBM i Access ODBC Driver
- Tải và cài đặt driver từ IBM: https://www.ibm.com/support/pages/ibm-i-access-client-solutions
- Hoặc liên hệ IT để cài đặt driver kết nối AS/400

### 2. Cài đặt Python dependencies
```bash
pip install -r requirements.txt
```

### 3. Cài đặt Node.js dependencies (nếu chưa có)
```bash
npm install
```

## ▶️ Chạy hệ thống

### Cách 1: Dùng file .bat (Dễ nhất)

1. **Mở Terminal 1**: Double click `START_BACKEND.bat`
   - Backend API sẽ chạy tại: http://localhost:5000

2. **Mở Terminal 2**: Double click `START_FRONTEND.bat`
   - Frontend sẽ chạy tại: http://localhost:4200

### Cách 2: Chạy thủ công

**Terminal 1 - Backend:**
```bash
python api.py
```

**Terminal 2 - Frontend:**
```bash
npm run dev
```

## 🎯 Sử dụng

1. Mở trình duyệt: http://localhost:4200
2. Click nút **"Dùng AS/400"** để kết nối database thật
3. Chọn Start Date và End Date để lọc dữ liệu
4. Dữ liệu sẽ tự động load từ AS/400

## 📝 Cấu hình

### Thay đổi thông tin kết nối AS/400
Mở file `api.py`, tìm dòng:
```python
def get_connection():
    return pyodbc.connect(
        'DRIVER={IBM i Access ODBC Driver};'
        'SYSTEM=10.247.194.1;'        # Đổi IP nếu cần
        'UID=FA01001;'                # Đổi username
        'PWD=FA01001;'                # Đổi password
        'DBQ=WAVEDLIB;'               # Đổi library
    )
```

### Thay đổi SQL query
Mở file `api.py`, tìm biến `sql` trong hàm `get_production_data()`

## ❌ Xử lý lỗi

### Lỗi: "Driver not found"
- Cài đặt IBM i Access ODBC Driver
- Kiểm tra tên driver trong `api.py` khớp với driver đã cài

### Lỗi: "Connection failed"
- Kiểm tra IP, username, password trong `api.py`
- Kiểm tra kết nối mạng đến AS/400

### Lỗi: "CORS error"
- Đảm bảo backend đang chạy trên port 5000
- Kiểm tra `flask-cors` đã được cài đặt

## 📞 Hỗ trợ
Liên hệ IT nếu gặp vấn đề kết nối AS/400
