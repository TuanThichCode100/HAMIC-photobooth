# HAMIC'S PHOTOBOOTH

A feature-rich, browser-based 4-cut photobooth that simulates a professional photobooth experience right from your webcam. This project is built with React, TypeScript, and TailwindCSS, and uses an Express backend with ImgBB integration for cloud image sharing.

## ✨ Features

- **Webcam Capture**: Takes four photos in sequence with a fun countdown.
- **Customizable Frames**: Cycle through different themes and frames for your photo strip.
- **Timelapse Video**: Automatically records a timelapse of your photo session and downloads it.
- **Instant Download**: Save the final high-resolution photo strip to your device.
- **QR Code Sharing**: After saving, a QR code is generated. Scan it on your phone to instantly get the photo (Powered by ImgBB).

## Chạy nhanh bằng Python (không cần Node.js hoặc Docker)

Tại thư mục gốc của repository:

```bash
python -m http.server 8000
```

Mở **http://localhost:8000** và cho phép truy cập camera. Trang gốc sẽ mở bản web tĩnh có sẵn trong `site/`. Có thể phục vụ riêng bản tĩnh bằng `python -m http.server 8000 --directory site`.

Frame **HAMIC K71** từ `assets/hamic_frames_transparent.png` là frame mặc định, có **3 ô ảnh**. Các frame cũ vẫn chọn được bằng nút mũi tên. Số lần chụp tự điều chỉnh theo số ô của frame.

Chụp ảnh, ghép frame, tải PNG và video hoạt động không cần backend. Mã QR chia sẻ cần backend; bản tĩnh mặc định chỉ lưu về máy. Giao diện hiện dùng Tailwind/font và bộ lọc OpenCV/MediaPipe qua CDN nên cần Internet để tải các tài nguyên này. Dùng `localhost` khi chạy trên máy; truy cập camera từ thiết bị khác cần HTTPS.

## Phát triển bằng npm

Chạy ngay tại thư mục gốc:

```bash
npm install
npm run dev
```

Mở **http://localhost:3000**. Sau khi sửa mã nguồn hoặc frame, cập nhật bản Python phục vụ bằng:

```bash
npm run typecheck
npm run build:static
```

`site/` là bản build được lưu cùng repository để người dùng Python không phải cài npm. Cần cập nhật thư mục này khi thay đổi frontend. `npm run build` vẫn tạo bản build thông thường ở `frontend/dist/`.

Để bật chia sẻ QR, chạy backend theo [backend/README.md](backend/README.md), tạo `frontend/.env.local` với `VITE_API_URL=http://localhost:5000`, rồi khởi động lại dev server hoặc build lại bản tĩnh. Docker Compose đã cấu hình URL này sẵn.

## 🛠️ Installation & Setup (Docker)

To run the application, make sure you have [Docker](https://www.docker.com/) and Docker Compose installed.

1. (Optional) Update the `IMGBB_API_KEY` environment variable in [docker-compose.yml](file:///d:/Mini%20Project/HAMIC%20photobooth/HAMIC-photobooth/docker-compose.yml) if you want to use your own ImgBB API key.
2. Build and start the services using Docker Compose:

   ```bash
   docker-compose up --build
   ```

Once the containers are running:
- **Frontend**: Access it at [http://localhost:3000](http://localhost:3000)
- **Backend**: API server is running at [http://localhost:5000](http://localhost:5000)

## 🚀 How to Use

1.  **Allow Camera Access**: When the page loads, your browser will ask for permission to use your camera. Please allow it.
2.  **Choose a Theme**: Use the up and down arrow buttons next to the photo strip preview to select your favorite frame.
3.  **Strike a Pose**: Click the "Start" button. The app will count down from 3 before taking each of the four photos.
4.  **Save & Share**: Once all four photos are taken, click "Save & QR".
    - Your final photo strip and timelapse video will be downloaded to your computer.
    - A QR code will appear on the screen. Scan this with your mobile device to easily view and download the photo strip there too!
5.  **Retake**: Not happy with the result? Just click "Retake" to start over.

## 🛠️ Technical Details

- **Frontend**: Built with [React](https://reactjs.org/) and [TypeScript](https://www.typescriptlang.org/).
- **Styling**: Styled using [TailwindCSS](https://tailwindcss.com/) for a modern, responsive design.
- **Backend**: Built with [Express](https://expressjs.com/) and Node.js. It acts as an API proxy that:
    - Receives photo and video uploads from the frontend.
    - Uploads the photo strip to **ImgBB** to retrieve a public image sharing link.
    - Serves health status checks.
- **Deployment**: Can be deployed using Docker containers.
- **To add your own frames**, place a transparent PNG in `assets/`, reference it with `new URL('../assets/your-frame.png', import.meta.url).href` in `frontend/constants.ts`, and add its `topic`, `frame_content`, `number`, and fallback `coords`. The app detects transparent photo slots automatically. Run `npm run build:static` to refresh the Python version. Existing frames live in `frontend/public/frames/`.
---
*This project was created to demonstrate a fun and interactive web application using modern frontend technologies.*
