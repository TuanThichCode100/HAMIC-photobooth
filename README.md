# HAMIC'S PHOTOBOOTH

A feature-rich, browser-based 4-cut photobooth that simulates a professional photobooth experience right from your webcam. This project is built with React, TypeScript, and TailwindCSS, and uses an Express backend with ImgBB integration for cloud image sharing.

## ✨ Features

- **Webcam Capture**: Takes four photos in sequence with a fun countdown.
- **Customizable Frames**: Cycle through different themes and frames for your photo strip.
- **Timelapse Video**: Automatically records a timelapse of your photo session and downloads it.
- **Instant Download**: Save the final high-resolution photo strip to your device.
- **QR Code Sharing**: After saving, a QR code is generated. Scan it on your phone to instantly get the photo (Powered by ImgBB).

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
- **To design your own frames**, link to (https://www.canva.com/design/DAG2tlOl5Iw/cjaQVmnB0lagwPSjwcPtww/edit). After saving the frame, using (https://pixlr.com/remove-background/) to remove the background. Finally, add the background-remove picture to (https://www.base64-image.de/) to convert png picture to base64 picture and paste the base64 string into the `constants.ts` file with `topic`, `frame_content`, `number`, `coords`.
---
*This project was created to demonstrate a fun and interactive web application using modern frontend technologies.*
