const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// ImgBB API Key
const IMGBB_API_KEY = process.env.IMGBB_API_KEY || '7197452aa7f7eb17791bc0e10c7c8977';

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

// Healthcheck endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date(),
    uploader: 'ImgBB'
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

    const uploadedUrls = {};

    // 1. Convert photo buffer to Base64 and upload to ImgBB
    console.log('Uploading photo to ImgBB...');
    const base64Photo = photoFile.buffer.toString('base64');
    
    const formData = new URLSearchParams();
    formData.append('image', base64Photo);
    formData.append('expiration', '600');

    const imgbbRes = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
      method: 'POST',
      body: formData,
    });

    if (!imgbbRes.ok) {
      const errText = await imgbbRes.text();
      console.error('ImgBB API failed response:', errText);
      throw new Error(`ImgBB upload failed with status ${imgbbRes.status}`);
    }

    const imgbbData = await imgbbRes.json();
    if (!imgbbData.success) {
      console.error('ImgBB upload was unsuccessful:', imgbbData);
      throw new Error(imgbbData.error ? imgbbData.error.message : 'Unknown ImgBB error');
    }

    uploadedUrls.photo = imgbbData.data.url;
    console.log(`Photo uploaded successfully to ImgBB. URL: ${uploadedUrls.photo}`);

    // 2. ImgBB only supports images, so we skip uploading the timelapse video to the cloud
    if (timelapseFile) {
      console.log('Skipping timelapse video upload to ImgBB (unsupported format).');
      uploadedUrls.timelapse = null; // Video will still be saved locally by the frontend
    }

    // Return uploaded links to frontend
    res.json({
      success: true,
      urls: uploadedUrls,
    });

  } catch (error) {
    console.error('Upload process failed:', error);
    res.status(500).json({
      error: 'Failed to upload photo to ImgBB.',
      details: error.message
    });
  }
});

// Start the server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`ImgBB Uploader initialized.`);
});
