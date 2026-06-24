# Hướng dẫn Thiết lập Cơ sở dữ liệu & Phân quyền Google Drive

Thư mục này quản lý thông tin xác thực và quy tắc bảo mật cho cơ sở dữ liệu Firebase cũng như dịch vụ tích hợp Google Drive.

---

## 1. Cấu hình Google Drive (Bắt buộc cho Backend)

Để hệ thống Backend có thể tải ảnh/video tự động lên thư mục Google Drive của bạn và hiển thị QR Code động cho khách hàng quét, bạn **bắt buộc** phải thực hiện 2 bước phân quyền sau:

### Bước 1: Chia sẻ Thư mục Google Drive mục tiêu
1. Mở Google Drive của bạn, chọn hoặc tạo thư mục muốn lưu trữ ảnh photobooth (ví dụ: thư mục có ID là `1KY_DPlWtR5q0aKfae5uVF53FDFFJoELL`).
2. Nhấn chuột phải vào thư mục -> **Chia sẻ (Share)**.
3. Thêm địa chỉ email Service Account sau làm **Người chỉnh sửa (Editor)**:
   ```
   firebase-adminsdk-fbsvc@hamic-s-photobooth.iam.gserviceaccount.com
   ```
4. Nhấn **Gửi (Send)** (bỏ tích chọn "Gửi thông báo cho mọi người" nếu không cần thiết).

### Bước 2: Kích hoạt Google Drive API trong Google Cloud Console
1. Truy cập vào [Google Cloud Console](https://console.cloud.google.com/).
2. Chọn dự án tương ứng với Firebase của bạn (`hamic-s-photobooth`).
3. Điều hướng tới **APIs & Services** (API & Dịch vụ) -> **Library** (Thư viện).
4. Tìm kiếm từ khóa **"Google Drive API"**.
5. Nhấp vào kết quả và nhấn nút **Enable** (Kích hoạt).

---

## 2. Cấu hình Quy tắc bảo mật Firebase (Firebase Security Rules)

Để bảo vệ dữ liệu trên ứng dụng Firebase của bạn, vui lòng sao chép các quy tắc bảo mật trong thư mục này lên Firebase Console của bạn:

### Cấu hình Firestore Rules
1. Truy cập Firebase Console -> **Firestore Database** -> tab **Rules**.
2. Sao chép nội dung của file [`firestore.rules`](./firestore.rules) và dán đè lên quy tắc hiện tại.
3. Nhấn **Publish** (Xuất bản).

### Cấu hình Cloud Storage Rules
1. Truy cập Firebase Console -> **Storage** -> tab **Rules**.
2. Sao chép nội dung của file [`storage.rules`](./storage.rules) và dán đè lên quy tắc hiện tại.
3. Nhấn **Publish** (Xuất bản).
