# Hamic Drive Uploader

Small Express service that accepts file uploads and uploads them to Google Drive using a Service Account.

Setup

1. Create a Google Cloud service account with Drive API access and download the JSON key.
2. Place the JSON file in the `server/` folder and set `GOOGLE_SERVICE_ACCOUNT_FILE` to its path in a `.env` file. (Optional) If you want uploads to go into a specific Drive folder, set `DRIVE_FOLDER_ID` to the folder ID (for example: `1KY_DPlWtR5q0aKfae5uVF53FDFFJoELL`).
3. Install dependencies and start:

```bash
cd server
npm install
npm start
```

API

POST /upload
- Accepts multipart/form-data with field `file`.
- Returns JSON with `webViewLink` and `webContentLink` on success.
