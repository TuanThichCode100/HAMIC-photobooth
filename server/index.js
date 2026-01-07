require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const { google } = require('googleapis');
const path = require('path');

const PORT = process.env.PORT || 4000;
const app = express();
app.use(cors());

// Multer: store uploads temporarily on disk
const upload = multer({ dest: path.join(__dirname, 'tmp') });

function getAuthClient() {
  const keyFile = process.env.GOOGLE_SERVICE_ACCOUNT_FILE;
  if (!keyFile) throw new Error('GOOGLE_SERVICE_ACCOUNT_FILE env var is required (path to service account JSON)');

  const key = require(path.resolve(keyFile));
  const client = new google.auth.JWT(
    key.client_email,
    null,
    key.private_key,
    ['https://www.googleapis.com/auth/drive']
  );

  return client;
}

app.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'file is required' });

    const auth = getAuthClient();
    await auth.authorize();
    const drive = google.drive({ version: 'v3', auth });

    const { originalname, path: filepath, mimetype } = req.file;

    const fileMetadata = {
      name: originalname,
    };

    // If configured, place uploads into a specific Drive folder
    if (process.env.DRIVE_FOLDER_ID) {
      fileMetadata.parents = [process.env.DRIVE_FOLDER_ID];
      console.log('Uploading to Drive folder:', process.env.DRIVE_FOLDER_ID);
    }

    const media = {
      mimeType: mimetype || 'application/octet-stream',
      body: fs.createReadStream(filepath),
    };

    const created = await drive.files.create({
      resource: fileMetadata,
      media,
      fields: 'id, name, webViewLink, webContentLink',
    });

    const fileId = created.data.id;

    // Make it publicly readable by anyone with the link
    await drive.permissions.create({
      fileId,
      requestBody: {
        role: 'reader',
        type: 'anyone',
      },
    });

    // Get the file info with links
    const fileInfo = await drive.files.get({ fileId, fields: 'id, name, webViewLink, webContentLink' });

    // Clean up temporary file
    fs.unlink(filepath, () => {});

    res.json({
      id: fileInfo.data.id,
      name: fileInfo.data.name,
      webViewLink: fileInfo.data.webViewLink,
      webContentLink: fileInfo.data.webContentLink,
    });
  } catch (err) {
    console.error('Upload error', err);
    res.status(500).json({ error: err.message || 'upload failed' });
  }
});

app.get('/', (req, res) => res.send('Hamic Drive Uploader running'));

app.listen(PORT, () => console.log(`Drive uploader listening on ${PORT}`));