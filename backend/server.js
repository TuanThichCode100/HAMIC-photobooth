const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { google } = require('googleapis');
const { Readable } = require('stream');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Target Google Drive Folder where photos will be stored
const DRIVE_FOLDER_ID = process.env.DRIVE_FOLDER_ID || '1KY_DPlWtR5q0aKfae5uVF53FDFFJoELL';

// Enable CORS for frontend requests
app.use(cors());
app.use(express.json());

// Set up Multer memory storage for uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 15 * 1024 * 1024, // 15MB file size limit
  },
});

// Load Google Drive API service using Service Account credentials
const getDriveService = () => {
  const KEY_FILE = path.join(__dirname, '../database/service-account.json');
  console.log(`Loading service account key from: ${KEY_FILE}`);
  
  const auth = new google.auth.GoogleAuth({
    keyFile: KEY_FILE,
    scopes: ['https://www.googleapis.com/auth/drive'],
  });
  
  return google.drive({ version: 'v3', auth });
};

// Healthcheck endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date(),
    driveFolderId: DRIVE_FOLDER_ID 
  });
});

// Upload endpoint
app.post('/api/upload', upload.fields([
  { name: 'photo', maxCount: 1 },
  { name: 'timelapse', maxCount: 1 }
]), async (req, res) => {
  try {
    const photoFile = req.files && req.files.photo ? req.files.photo[0] : null;
    const timelapseFile = req.files && req.files.timelapse ? req.files.timelapse[0] : null;

    if (!photoFile) {
      return res.status(400).json({ error: 'No photo file uploaded.' });
    }

    const driveService = getDriveService();
    const uploadedUrls = {};

    // 1. Upload photo strip to Google Drive
    const photoName = `hamic-photo-${Date.now()}.png`;
    const photoMetadata = {
      name: photoName,
      parents: [DRIVE_FOLDER_ID],
    };
    const photoMedia = {
      mimeType: photoFile.mimetype,
      body: Readable.from(photoFile.buffer),
    };
    
    console.log(`Uploading photo: ${photoName} to Google Drive folder: ${DRIVE_FOLDER_ID}`);
    const photoDriveRes = await driveService.files.create({
      requestBody: photoMetadata,
      media: photoMedia,
      fields: 'id, webViewLink, webContentLink',
    });
    
    const photoFileId = photoDriveRes.data.id;
    console.log(`Photo uploaded successfully. File ID: ${photoFileId}`);

    // Grant public read permission to the photo so users can view it via QR Code
    try {
      await driveService.permissions.create({
        fileId: photoFileId,
        requestBody: {
          role: 'reader',
          type: 'anyone',
        },
      });
      uploadedUrls.photo = photoDriveRes.data.webViewLink;
      console.log(`Granted public access for photo. Link: ${uploadedUrls.photo}`);
    } catch (permError) {
      console.error('Error setting public permissions on photo file:', permError);
      // Fallback to returned webViewLink
      uploadedUrls.photo = photoDriveRes.data.webViewLink;
    }

    // 2. Upload timelapse video if exists
    if (timelapseFile) {
      const timelapseName = `hamic-timelapse-${Date.now()}.webm`;
      const timelapseMetadata = {
        name: timelapseName,
        parents: [DRIVE_FOLDER_ID],
      };
      const timelapseMedia = {
        mimeType: timelapseFile.mimetype,
        body: Readable.from(timelapseFile.buffer),
      };
      
      console.log(`Uploading timelapse video: ${timelapseName}`);
      const timelapseDriveRes = await driveService.files.create({
        requestBody: timelapseMetadata,
        media: timelapseMedia,
        fields: 'id, webViewLink',
      });
      
      const timelapseFileId = timelapseDriveRes.data.id;
      
      // Grant public read permission to the timelapse video
      try {
        await driveService.permissions.create({
          fileId: timelapseFileId,
          requestBody: {
            role: 'reader',
            type: 'anyone',
          },
        });
        uploadedUrls.timelapse = timelapseDriveRes.data.webViewLink;
        console.log(`Granted public access for timelapse. Link: ${uploadedUrls.timelapse}`);
      } catch (permError) {
        console.error('Error setting public permissions on timelapse file:', permError);
        uploadedUrls.timelapse = timelapseDriveRes.data.webViewLink;
      }
    }

    // Return uploaded links to frontend
    res.json({
      success: true,
      urls: uploadedUrls,
    });

  } catch (error) {
    console.error('Upload process failed:', error);
    res.status(500).json({
      error: 'Failed to upload files to Google Drive.',
      details: error.message
    });
  }
});

// Start the server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Google Drive Folder ID configured: ${DRIVE_FOLDER_ID}`);
});
