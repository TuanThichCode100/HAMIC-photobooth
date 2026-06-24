# HAMIC Photobooth - Backend Service

Đây là dịch vụ backend Express đóng vai trò làm API proxy trung gian để tải tệp từ frontend lên máy chủ lưu trữ **ImgBB**, giải quyết vấn đề giới hạn quota của Google Drive và phí duy trì Firebase Storage.

## 🛠️ Yêu cầu & Cài đặt

Dịch vụ này được chạy tự động thông qua Docker Compose ở thư mục gốc. Tuy nhiên, nếu bạn muốn chạy thủ công để phát triển:

1. Di chuyển vào thư mục `backend/`.
2. Cài đặt các gói phụ thuộc:
   ```bash
   npm install
   ```
3. Tạo file cấu hình môi trường `.env` dựa theo file [.env.example](.env.example):
   ```env
   PORT=5000
   IMGBB_API_KEY=7197452aa7f7eb17791bc0e10c7c8977
   ```
4. Khởi chạy ở chế độ phát triển:
   ```bash
   npm run dev
   ```

## ⚙️ Các biến môi trường

* `PORT`: Cổng chạy backend server (mặc định là `5000`).
* `IMGBB_API_KEY`: Mã API Key lấy từ tài khoản ImgBB của bạn (dùng để xác thực khi tải ảnh lên).

## 📡 Danh sách API Endpoints

### 1. Kiểm tra trạng thái hệ thống
* **Endpoint**: `GET /health`
* **Mô tả**: Trả về trạng thái hoạt động của server và loại driver lưu trữ đang cấu hình.
* **Phản hồi mẫu**:
  ```json
  {
    "status": "ok",
    "timestamp": "2026-06-25T00:10:00.000Z",
    "uploader": "ImgBB"
  }
  ```

### 2. Tải ảnh lên
* **Endpoint**: `POST /api/upload`
* **Mô tả**: Nhận ảnh strip từ photobooth (dưới dạng multipart/form-data) và tải lên ImgBB để nhận link QR code.
* **Payload**:
  * `photo`: File ảnh PNG cần tải lên (bắt buộc).
  * `timelapse`: File video webm ghi lại timelapse (không bắt buộc, hiện tại sẽ được lưu cục bộ).
* **Phản hồi mẫu**:
  ```json
  {
    "success": true,
    "urls": {
      "photo": "https://i.ibb.co/xxxxxx/hamic-photo.png",
      "timelapse": null
    }
  }
  ```
