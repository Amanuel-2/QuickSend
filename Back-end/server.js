const express = require("express");
const multer = require("multer");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const { createServer } = require("http");
const { Server } = require("socket.io");

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});
const PORT = 8000;

app.use(cors());
app.use(express.json());

// Store session data in memory (in production, use Redis or database)
const sessions = new Map();

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log("✅ Created uploads directory");
}

// Storage for multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    const sessionId = req.body.sessionId || Date.now().toString();
    cb(null, `${sessionId}-${file.originalname}`);
  },
});
const upload = multer({ storage });

// Upload endpoint
app.post("/upload", upload.single("file"), (req, res) => {
  try {
    console.log("📤 Upload request received");
    console.log("Request body:", req.body);
    console.log("Request file:", req.file ? {
      originalname: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype
    } : "No file");

    const sessionId = req.body.sessionId || Date.now().toString();
    const file = req.file;

    if (file) {
      // Store session data
      sessions.set(sessionId, {
        filename: file.filename,
        originalName: file.originalname,
        size: file.size,
        mimetype: file.mimetype,
        uploadedAt: new Date(),
        downloaded: false
      });

      console.log(`✅ File uploaded successfully: ${file.originalname} (Session: ${sessionId})`);

      res.json({
        message: "File uploaded successfully",
        file: file,
        sessionId: sessionId
      });
    } else {
      console.error("❌ No file uploaded");
      res.status(400).json({ error: "No file uploaded" });
    }
  } catch (error) {
    console.error("❌ Upload error:", error);
    res.status(500).json({ error: "Upload failed", details: error.message });
  }
});

// Get file by session ID (for mobile download)
app.get("/receive/:sessionId", (req, res) => {
  try {
    const sessionId = req.params.sessionId;
    console.log(`📥 Receive request for session: ${sessionId}`);
    
    const sessionData = sessions.get(sessionId);

    if (!sessionData) {
      console.error(`❌ Session not found: ${sessionId}`);
      return res.status(404).json({ error: "Session not found or expired" });
    }

    const filePath = path.join(__dirname, "uploads", sessionData.filename);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      console.error(`❌ File not found: ${filePath}`);
      return res.status(404).json({ error: "File not found" });
    }

    console.log(`✅ Sending file: ${sessionData.originalName}`);
    
    // Mark as downloaded
    sessionData.downloaded = true;
    sessions.set(sessionId, sessionData);

    // Send file
    res.download(filePath, sessionData.originalName, (err) => {
      if (err) {
        console.error("❌ Download error:", err);
        res.status(500).json({ error: "Failed to download file" });
      }
    });
  } catch (error) {
    console.error("❌ Receive error:", error);
    res.status(500).json({ error: "Download failed", details: error.message });
  }
});

// Get session info (for mobile preview)
app.get("/session/:sessionId", (req, res) => {
  try {
    const sessionId = req.params.sessionId;
    console.log(`🔍 Session info request: ${sessionId}`);
    const sessionData = sessions.get(sessionId);

    if (!sessionData) {
      console.error(`❌ Session not found: ${sessionId}`);
      return res.status(404).json({ error: "Session not found or expired" });
    }

    res.json({
      filename: sessionData.originalName,
      size: sessionData.size,
      mimetype: sessionData.mimetype,
      uploadedAt: sessionData.uploadedAt,
      downloaded: sessionData.downloaded
    });
  } catch (error) {
    console.error("❌ Session info error:", error);
    res.status(500).json({ error: "Failed to get session info", details: error.message });
  }
});

// Mobile upload endpoint (for phone to computer)
app.post("/mobile-upload", upload.single("file"), (req, res) => {
  try {
    console.log("📱 Mobile upload request received");
    const file = req.file;

    if (file) {
      console.log(`✅ Mobile file uploaded: ${file.originalname} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
      
      // Emit to all connected clients that a new file was uploaded
      io.emit('newFileUploaded', {
        filename: file.filename,
        originalName: file.originalname,
        size: file.size,
        mimetype: file.mimetype,
        uploadedAt: new Date(),
        fromMobile: true
      });

      res.json({
        message: "File uploaded successfully",
        file: file,
        downloadUrl: `${req.protocol}://${req.get('host')}/uploads/${file.filename}`
      });
    } else {
      console.error("❌ Mobile upload: No file received");
      res.status(400).json({ error: "No file uploaded" });
    }
  } catch (error) {
    console.error("❌ Mobile upload error:", error);
    res.status(500).json({ error: "Upload failed", details: error.message });
  }
});

// Get all uploaded files
app.get("/files", (req, res) => {
  fs.readdir("uploads", (err, files) => {
    if (err) {
      console.error("❌ Error reading uploads directory:", err);
      return res.status(500).json({ error: "Unable to fetch files" });
    }
    console.log(`📂 Serving ${files.length} files`);
    res.json(files);
  });
});

// Delete a file
app.delete("/files/:filename", (req, res) => {
  const filePath = path.join(__dirname, "uploads", req.params.filename);
  fs.unlink(filePath, (err) => {
    if (err) {
      console.error(`❌ Error deleting file: ${req.params.filename}`, err);
      return res.status(500).json({ error: "Unable to delete file" });
    }
    console.log(`🗑️ File deleted: ${req.params.filename}`);
    res.json({ message: "File deleted successfully" });
  });
});

// Serve uploaded files statically
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Serve mobile-friendly receive page
app.get("/mobile-receive/:sessionId", (req, res) => {
  const sessionId = req.params.sessionId;
  const sessionData = sessions.get(sessionId);

  if (!sessionData) {
    return res.status(404).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>File Not Found</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 20px; }
          .error { color: #dc3545; }
        </style>
      </head>
      <body>
        <h1 class="error">❌ File Not Found</h1>
        <p>The file you're looking for has expired or doesn't exist.</p>
      </body>
      </html>
    `);
  }

  const isImage = sessionData.mimetype.startsWith('image/');
  const isVideo = sessionData.mimetype.startsWith('video/');

  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Receive File</title>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        body { 
          font-family: Arial, sans-serif; 
          text-align: center; 
          padding: 20px; 
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          margin: 0;
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }
        .container {
          background: white;
          color: #333;
          padding: 30px;
          border-radius: 20px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.2);
          max-width: 400px;
          margin: 0 auto;
        }
        .file-info {
          margin: 20px 0;
          padding: 15px;
          background: #f8f9fa;
          border-radius: 10px;
        }
        .download-btn {
          background: #667eea;
          color: white;
          border: none;
          padding: 15px 30px;
          border-radius: 25px;
          font-size: 1.1rem;
          cursor: pointer;
          margin: 10px;
          text-decoration: none;
          display: inline-block;
        }
        .preview {
          max-width: 100%;
          border-radius: 10px;
          margin: 20px 0;
        }
        .size {
          color: #666;
          font-size: 0.9rem;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>📱 Receive File</h1>
        
        <div class="file-info">
          <h3>📄 ${sessionData.originalName}</h3>
          <p class="size">${(sessionData.size / 1024 / 1024).toFixed(2)} MB</p>
        </div>
        
        ${isImage ? `<img src="/uploads/${sessionData.filename}" class="preview" alt="Preview">` : ''}
        ${isVideo ? `<video src="/uploads/${sessionData.filename}" class="preview" controls></video>` : ''}
        ${!isImage && !isVideo ? `
          <div style="width: 100%; height: 200px; background: #f8f9fa; border-radius: 10px; display: flex; flex-direction: column; justify-content: center; align-items: center; margin: 20px 0;">
            <div style="font-size: 4rem; margin-bottom: 10px;">📄</div>
            <div style="color: #666; font-size: 1.2rem;">${sessionData.originalName.split('.').pop().toUpperCase()} File</div>
          </div>
        ` : ''}
        
        <a href="/receive/${sessionId}" class="download-btn">
          📥 Download File
        </a>
        
        <p style="margin-top: 20px; color: #666; font-size: 0.9rem;">
          Tap the button above to download the file to your device
        </p>
      </div>
    </body>
    </html>
  `);
});

// WebSocket connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📡 WebSocket server ready for real-time updates`);
  console.log(`📁 Uploads directory: ${uploadsDir}`);
  console.log(`✅ Ready to receive files!`);
});
