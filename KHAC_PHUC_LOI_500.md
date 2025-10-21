# Khắc phục lỗi ❌ HTTP error! status: 500

## Nguyên nhân

Lỗi 500 xảy ra khi backend không thể kết nối đến AS/400 database. Có 3 nguyên nhân chính:

### 1. IBM i Access ODBC Driver chưa được cài đặt

**Giải pháp:**
- Tải và cài đặt IBM i Access Client Solutions từ: https://www.ibm.com/support/pages/ibm-i-access-client-solutions
- Sau khi cài đặt, cấu hình ODBC Driver trong Windows

**Kiểm tra:**
```bash
# Mở ODBC Data Sources (64-bit) trong Windows
# Tìm "IBM i Access ODBC Driver" trong danh sách Drivers
```

### 2. Không thể kết nối đến AS/400 Server

**Kiểm tra kết nối:**
```bash
ping 10.247.194.1
```

**Nguyên nhân có thể:**
- Không có kết nối mạng đến AS/400
- Firewall chặn kết nối
- VPN chưa được kết nối (nếu cần)

### 3. Thông tin đăng nhập không đúng

Kiểm tra thông tin trong file `api.py`:
```python
def get_connection():
    return pyodbc.connect(
        'DRIVER={IBM i Access ODBC Driver};'
        'SYSTEM=10.247.194.1;'
        'UID=FA01001;'        # Username
        'PWD=FA01001;'        # Password
        'DBQ=WAVEDLIB;'       # Database
    )
```

## Cách kiểm tra lỗi chi tiết

### Bước 1: Kiểm tra backend có chạy không
```bash
# Mở trình duyệt và truy cập:
http://localhost:5000/api/health

# Kết quả mong đợi:
{"status":"ok"}
```

### Bước 2: Test kết nối AS/400
```bash
# Truy cập:
http://localhost:5000/api/test-connection

# Nếu thành công:
{"success":true,"message":"Kết nối AS/400 thành công!"}

# Nếu thất bại, sẽ hiển thị lỗi cụ thể
```

### Bước 3: Xem log chi tiết
Mở cửa sổ terminal đang chạy `START_BACKEND.bat` để xem log lỗi chi tiết.

## Giải pháp tạm thời

Nếu không thể kết nối AS/400, bạn có thể:

1. **Sử dụng dữ liệu mẫu có sẵn:**
   - App sẽ tự động load file `production-data.json` nếu có
   - Không cần kết nối AS/400 để xem dashboard

2. **Import dữ liệu từ file CSV/Excel:**
   - Chuyển đổi dữ liệu sang format JSON
   - Lưu vào file `production-data.json`

## Liên hệ hỗ trợ

Nếu vẫn gặp lỗi, vui lòng:
1. Chụp màn hình thông báo lỗi
2. Copy log từ terminal backend
3. Liên hệ IT support với thông tin trên
