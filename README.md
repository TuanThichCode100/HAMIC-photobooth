
# HAMIC'S PHOTOBOOTH

A feature-rich, browser-based 4-cut photobooth that simulates a professional photobooth experience right from your webcam. This project is built with React, TypeScript, and TailwindCSS, and uses Firebase for cloud storage and sharing.

## ✨ Features

- **Webcam Capture**: Takes four photos in sequence with a fun countdown.
- **Customizable Frames**: Cycle through different themes and frames for your photo strip.
- **Timelapse Video**: Automatically records a timelapse of your photo session and downloads it.
- **Instant Download**: Save the final high-resolution photo strip to your device.
- **QR Code Sharing**: After saving, a QR code is generated. Scan it on your phone to instantly get the photo. (Powered by Firebase)
- **Optional Auto Upload**: You can run a small backend (`server/`) that will upload saved photos/videos to Google Drive automatically and return a shareable link.

## 🚀 How to Use

1.  **Allow Camera Access**: When the page loads, your browser will ask for permission to use your camera. Please allow it.
2.  **Choose a Theme**: Use the up and down arrow buttons next to the photo strip preview to select your favorite frame.
3.  **Strike a Pose**: Click the "Start" button. The app will count down from 3 before taking each of the four photos.
4.  **Save & Share**: Once all four photos are taken, click "Save & QR".
    - Your final photo strip will be downloaded to your computer.
    - A QR code will appear on the screen. Scan this with your mobile device to easily download the photo there too!
5.  **Retake**: Not happy with the result? Just click "Retake" to start over.

## 🛠️ Technical Details

### 🔧 Optional: Google Drive Auto-upload
If you want saved photos and videos to be automatically uploaded to Google Drive and get a shareable link, you can run the simple uploader in `server/`.

1. Create a Google Service Account with Drive API access and download the JSON key file.
2. Put it somewhere in the repo (e.g. `server/service-account.json`) and set `GOOGLE_SERVICE_ACCOUNT_FILE` in `server/.env` to point to it.
3. Run the uploader:

```bash
cd server
npm install
npm start
```

4. (Optional) Set the environment variable `VITE_DRIVE_UPLOADER_URL` to point to the running uploader (e.g. `http://localhost:4000`) and restart the frontend.

> Tip: To have uploads placed into a specific Google Drive folder, set `DRIVE_FOLDER_ID` in `server/.env` to the folder ID (e.g. `1KY_DPlWtR5q0aKfae5uVF53FDFFJoELL`).

The frontend will attempt to upload files to that endpoint after saving them locally; the link returned by the server will be printed to the browser console.

## 🛠️ Technical Details

- **Frontend**: Built with [React](https://reactjs.org/) and [TypeScript](https://www.typescriptlang.org/).
- **Styling**: Styled using [TailwindCSS](https://tailwindcss.com/) for a modern, responsive design.
- **Backend & Storage**: Utilizes [Firebase](https://firebase.google.com/) for:
    - Anonymous authentication to secure uploads.
    - Cloud Storage to host the generated images.
    - Firestore to store metadata about the uploads.
- **Deployment**: Can be deployed as a static web application on any modern hosting provider (e.g., Vercel, Netlify, Firebase Hosting).
- **To design your own frames**, link to (https://www.canva.com/design/DAG2tlOl5Iw/cjaQVmnB0lagwPSjwcPtww/edit). After saving the frame, using (https://pixlr.com/remove-background/) to remove the background. Finally, add the background-remove picture to (https://www.base64-image.de/) to convert png picture to base64 picture and paste the base64 string into the `constants.ts` file with `topic`, `frame_content`, `number`, `coords`.
---
*This project was created to demonstrate a fun and interactive web application using modern frontend technologies.*
