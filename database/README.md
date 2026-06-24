# HAMIC Photobooth - Cấu hình Cơ sở dữ liệu (Database Rules)

Thư mục này chứa quy tắc bảo mật (Security Rules) cho cơ sở dữ liệu Firebase Firestore và Cloud Storage nếu bạn chọn sử dụng Firebase trong tương lai.

> **Lưu ý quan trọng**: Hiện tại hệ thống đã chuyển sang sử dụng dịch vụ lưu trữ hình ảnh miễn phí **ImgBB** thông qua API máy chủ (bằng API Key cấu hình trong `docker-compose.yml`). Do đó, các cấu hình Google Drive và Firebase Storage trong thư mục này **hiện tại không còn được sử dụng trực tiếp** bởi ứng dụng, và được giữ lại để tham khảo hoặc lưu trữ.

---

## 🛠️ Lưu trữ tham khảo: Cấu hình Firebase Security Rules

Nếu bạn quyết định quay lại sử dụng Firebase ở môi trường production:

### 1. Cấu hình Firestore Rules
1. Truy cập Firebase Console -> **Firestore Database** -> tab **Rules**.
2. Sao chép nội dung của file [`firestore.rules`](./firestore.rules) và dán đè lên quy tắc hiện tại.
3. Nhấn **Publish** (Xuất bản).

### 2. Cấu hình Cloud Storage Rules
1. Truy cập Firebase Console -> **Storage** -> tab **Rules**.
2. Sao chép nội dung của file [`storage.rules`](./storage.rules) và dán đè lên quy tắc hiện tại.
3. Nhấn **Publish** (Xuất bản).
