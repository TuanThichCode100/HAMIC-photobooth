# HAMIC Photobooth - Frontend Service

Đây là ứng dụng giao diện người dùng (Frontend) cho HAMIC Photobooth, được xây dựng bằng React, TypeScript, Vite và TailwindCSS. Ứng dụng cung cấp giao diện tương tác webcam, chọn khung viền (frame) và hiển thị QR Code để tải ảnh về điện thoại.

## 🛠️ Yêu cầu & Cài đặt

Ứng dụng này thường được chạy thông qua Docker Compose ở thư mục gốc. Tuy nhiên, nếu bạn muốn chạy thủ công phục vụ phát triển:

1. Di chuyển vào thư mục `frontend/`.
2. Cài đặt các gói phụ thuộc:
   ```bash
   npm install
   ```
3. Khởi chạy server phát triển local:
   ```bash
   npm run dev
   ```
4. Truy cập giao diện tại: [http://localhost:3000](http://localhost:3000).

## ⚙️ Cấu hình API

Frontend giao tiếp với backend để tải ảnh lên và lấy URL ảnh phục vụ mã QR.
* Đường dẫn API được kiểm soát thông qua biến môi trường cấu hình tại build-time ở [docker-compose.yml](../docker-compose.yml):
  * `VITE_API_URL=http://localhost:5000` (đường dẫn local backend).

## 📁 Cấu trúc thư mục chính

* `/components`: Các thành phần giao diện nhỏ như Webcam view, Controls điều khiển, Modal QR Code.
* `/services`:
  * `backendService.ts`: Chứa hàm `uploadToBackend` gửi dữ liệu ảnh chụp lên backend Express để đẩy lên ImgBB.
  * `imageService.ts`: Hàm xử lý ghép 4 ảnh đã chụp vào khung hình (frame) được chọn.
  * `fileSystemService.ts`: Hàm lưu trực tiếp tệp ảnh và video timelapse về máy cục bộ.
* `constants.ts`: Định nghĩa danh sách các khung ảnh PNG kèm tọa độ dự phòng. Frame HAMIC K71 được lấy từ `../assets/hamic_frames_transparent.png`; các frame cũ ở `public/frames/`.

## Chạy không cần backend

Không đặt `VITE_API_URL` để dùng chụp ảnh và tải về máy mà không gọi API. Chỉ cấu hình URL này khi cần upload và chia sẻ QR. Xem [hướng dẫn tại thư mục gốc](../README.md) để chạy bằng Python hoặc `npm run dev` từ root.

Sau khi sửa frontend, chạy `npm run build:static` tại root để cập nhật bản tĩnh trong `site/`.
