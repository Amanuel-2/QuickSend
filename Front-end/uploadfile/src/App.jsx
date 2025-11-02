import { useState, useEffect, useRef } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { io } from "socket.io-client";
import API from './API';
import MobileSender from './MobileSender';
const API_url = API;

function App() {
  const [file, setFile] = useState(null);
  const [files, setFiles] = useState([]);
  const [currentScreen, setCurrentScreen] = useState('upload'); // 'upload' or 'qr'
  const [sessionId, setSessionId] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [notification, setNotification] = useState(null);
  const fileInputRef = useRef(null);

  // Detect if user is on mobile device
  useEffect(() => {
    const checkMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor || window.opera;
      const isMobileDevice = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent.toLowerCase());
      const isSmallScreen = window.innerWidth <= 768;
      setIsMobile(isMobileDevice || isSmallScreen);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Fetch files from backend
  const fetchFiles = async () => {
    try {
      const res = await fetch(`${API_url}/files`);
      if (!res.ok) {
        throw new Error('Failed to fetch files');
      }
      const data = await res.json();
      setFiles(data);
    } catch (error) {
      console.error('❌ Error fetching files:', error);
      setFiles([]);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  // WebSocket connection for real-time notifications
  useEffect(() => {
    if (!isMobile) {
      const socket = io('http://192.168.8.39:8000');

      socket.on('newFileUploaded', (data) => {
        setNotification({
          type: 'success',
          message: `📱 New file received: ${data.originalName}`,
          filename: data.filename
        });

        // Refresh files list
        fetchFiles();

        // Auto-hide notification after 5 seconds
        setTimeout(() => {
          setNotification(null);
        }, 5000);
      });

      return () => {
        socket.disconnect();
      };
    }
  }, [isMobile]);

  // Handle drag and drop
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      setFile(droppedFile);
    }
  };

  // Handle file selection
  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  // Handle upload
  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      console.error('No file selected');
      setNotification({
        type: 'error',
        message: 'Please select a file first'
      });
      setTimeout(() => setNotification(null), 3000);
      return;
    }

    // Generate session ID
    const newSessionId = Date.now().toString();
    setSessionId(newSessionId);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("sessionId", newSessionId);

    try {
      console.log(`📤 Uploading file: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
      setUploadProgress(50);

      const response = await fetch(`${API_url}/upload`, {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Upload successful:', data);
        setUploadProgress(100);
        setTimeout(() => {
          setCurrentScreen('qr');
          setUploadProgress(0);
        }, 500);
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Upload failed' }));
        console.error('❌ Upload failed:', errorData);
        setNotification({
          type: 'error',
          message: errorData.error || 'Upload failed. Please try again.'
        });
        setTimeout(() => setNotification(null), 5000);
        setUploadProgress(0);
      }
    } catch (error) {
      console.error('❌ Upload error:', error);
      setNotification({
        type: 'error',
        message: `Upload failed: ${error.message}. Check if server is running.`
      });
      setTimeout(() => setNotification(null), 5000);
      setUploadProgress(0);
    }
  };

  // Handle delete
  const handleDelete = async (filename) => {
    await fetch(`${API_url}/files/${filename}`, {
      method: "DELETE",
    });
    fetchFiles();
  };

  // Reset to upload screen
  const handleNewUpload = () => {
    setCurrentScreen('upload');
    setFile(null);
    setSessionId(null);
  };

  // Render upload screen
  const renderUploadScreen = () => (
    <div style={{
      padding: "40px",
      maxWidth: "600px",
      margin: "0 auto",
      textAlign: "center"
    }}>
      <h1 style={{
        fontSize: "2.5rem",
        marginBottom: "2rem",
        background: "linear-gradient(45deg, #667eea 0%, #764ba2 100%)",
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent"
      }}>
        📱 Share Files
      </h1>

      <div
        ref={fileInputRef}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        style={{
          border: `3px dashed ${isDragOver ? '#667eea' : '#ddd'}`,
          borderRadius: "15px",
          padding: "60px 20px",
          marginBottom: "30px",
          cursor: "pointer",
          transition: "all 0.3s ease",
          backgroundColor: isDragOver ? '#f8f9ff' : '#fafafa',
          minHeight: "200px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center"
        }}
      >
        <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>
          {file ? "📎" : "📁"}
        </div>
        <h3 style={{ marginBottom: "1rem", color: "#333" }}>
          {file ? file.name : "Drop files here or click to select"}
        </h3>
        <p style={{ color: "#666", fontSize: "0.9rem" }}>
          Supports any file type
        </p>
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileSelect}
          style={{ display: "none" }}
        />
      </div>

      {file && (
        <div style={{ marginBottom: "30px" }}>
          <div style={{
            padding: "15px",
            backgroundColor: "#e8f5e8",
            borderRadius: "10px",
            marginBottom: "20px"
          }}>
            <strong>Selected:</strong> {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
          </div>

          {uploadProgress > 0 && (
            <div style={{
              width: "100%",
              backgroundColor: "#e0e0e0",
              borderRadius: "10px",
              marginBottom: "20px"
            }}>
              <div style={{
                width: `${uploadProgress}%`,
                height: "20px",
                backgroundColor: "#667eea",
                borderRadius: "10px",
                transition: "width 0.3s ease"
              }}></div>
            </div>
          )}

          <button
            onClick={handleUpload}
            disabled={uploadProgress > 0}
            style={{
              backgroundColor: "#667eea",
              color: "white",
              border: "none",
              padding: "15px 40px",
              borderRadius: "25px",
              fontSize: "1.1rem",
              cursor: uploadProgress > 0 ? "not-allowed" : "pointer",
              opacity: uploadProgress > 0 ? 0.7 : 1,
              transition: "all 0.3s ease"
            }}
          >
            {uploadProgress > 0 ? "Uploading..." : "📤 Send File"}
          </button>
        </div>
      )}
    </div>
  );

  // Render QR code screen
  const renderQRCodeScreen = () => (
    <div style={{
      padding: "40px",
      maxWidth: "500px",
      margin: "0 auto",
      textAlign: "center"
    }}>
      <h1 style={{
        fontSize: "2.5rem",
        marginBottom: "2rem",
        background: "linear-gradient(45deg, #667eea 0%, #764ba2 100%)",
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent"
      }}>
        📱 Scan QR Code
      </h1>

      <div style={{
        backgroundColor: "white",
        padding: "30px",
        borderRadius: "20px",
        boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
        marginBottom: "30px"
      }}>
        <QRCodeCanvas
          value={`http://192.168.8.39:8000/mobile-receive/${sessionId}`}
          size={250}
        />
      </div>

      <p style={{
        color: "#666",
        marginBottom: "30px",
        fontSize: "1.1rem"
      }}>
        Scan this QR code with your phone to receive the file
      </p>

      <button
        onClick={handleNewUpload}
        style={{
          backgroundColor: "#667eea",
          color: "white",
          border: "none",
          padding: "15px 30px",
          borderRadius: "25px",
          fontSize: "1rem",
          cursor: "pointer",
          marginRight: "15px"
        }}
      >
        📤 Send Another File
      </button>

      <button
        onClick={() => setCurrentScreen('upload')}
        style={{
          backgroundColor: "transparent",
          color: "#667eea",
          border: "2px solid #667eea",
          padding: "13px 30px",
          borderRadius: "25px",
          fontSize: "1rem",
          cursor: "pointer"
        }}
      >
        ← Back
      </button>
    </div>
  );

  // Show mobile interface if on mobile device
  if (isMobile) {
    return <MobileSender />;
  }

  return (
    <div style={{
      minHeight: "100vh",
      backgroundColor: "#f8f9fa",
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
    }}>
      {/* Notification */}
      {notification && (
        <div style={{
          position: "fixed",
          top: "20px",
          right: "20px",
          backgroundColor: notification.type === 'success' ? "#28a745" : "#dc3545",
          color: "white",
          padding: "15px 20px",
          borderRadius: "10px",
          boxShadow: "0 5px 15px rgba(0,0,0,0.2)",
          zIndex: 1000,
          maxWidth: "300px",
          animation: "slideIn 0.3s ease-out"
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span>{notification.message}</span>
            <button
              onClick={() => setNotification(null)}
              style={{
                background: "none",
                border: "none",
                color: "white",
                fontSize: "18px",
                cursor: "pointer",
                marginLeft: "10px"
              }}
            >
              ×
            </button>
          </div>
        </div>
      )}

      {currentScreen === 'upload' ? renderUploadScreen() : renderQRCodeScreen()}

      {/* Mobile Access QR Code - only show on upload screen */}
      {currentScreen === 'upload' && (
        <div style={{
          padding: "40px",
          backgroundColor: "white",
          marginTop: "40px"
        }}>
          <h3 style={{ textAlign: "center", marginBottom: "30px", color: "#333" }}>
            📱 Mobile Access
          </h3>
          <div style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "20px"
          }}>
            <div style={{
              backgroundColor: "#f8f9fa",
              padding: "20px",
              borderRadius: "15px",
              boxShadow: "0 5px 15px rgba(0,0,0,0.1)"
            }}>
              <QRCodeCanvas
                value={`http://192.168.8.39:5173`}
                size={200}
              />
            </div>
            <p style={{
              color: "#666",
              textAlign: "center",
              maxWidth: "300px",
              fontSize: "0.9rem"
            }}>
              Scan this QR code with your phone to access the mobile interface and send files to this computer
            </p>
          </div>
        </div>
      )}

      {/* File gallery - only show on upload screen */}
      {currentScreen === 'upload' && files.length > 0 && (
        <div style={{
          padding: "40px",
          backgroundColor: "white",
          marginTop: "20px"
        }}>
          <h3 style={{ textAlign: "center", marginBottom: "30px", color: "#333" }}>
            📂 Recent Files
          </h3>
          <div style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "20px",
            justifyContent: "center",
            maxWidth: "1200px",
            margin: "0 auto"
          }}>
            {files.map((filename) => {
              const isImage = filename.match(/\.(jpg|jpeg|png|gif|bmp|webp)$/i);
              const isVideo = filename.match(/\.(mp4|avi|mov|wmv|flv|webm)$/i);

              return (
                <div key={filename} style={{
                  textAlign: "center",
                  backgroundColor: "#f8f9fa",
                  padding: "15px",
                  borderRadius: "10px",
                  boxShadow: "0 2px 10px rgba(0,0,0,0.1)"
                }}>
                  {isImage ? (
                    <img
                      src={`${API_url}/uploads/${filename}`}
                      alt={filename}
                      style={{
                        width: "200px",
                        height: "150px",
                        objectFit: "cover",
                        borderRadius: "8px",
                        marginBottom: "10px"
                      }}
                    />
                  ) : isVideo ? (
                    <video
                      src={`${API_url}/uploads/${filename}`}
                      style={{
                        width: "200px",
                        height: "150px",
                        objectFit: "cover",
                        borderRadius: "8px",
                        marginBottom: "10px"
                      }}
                      controls
                    />
                  ) : (
                    <div style={{
                      width: "200px",
                      height: "150px",
                      backgroundColor: "#e9ecef",
                      borderRadius: "8px",
                      marginBottom: "10px",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "center",
                      alignItems: "center",
                      color: "#6c757d"
                    }}>
                      <div style={{ fontSize: "3rem", marginBottom: "10px" }}>
                        📄
                      </div>
                      <div style={{ fontSize: "0.8rem", textAlign: "center" }}>
                        {filename.split('.').pop().toUpperCase()}
                      </div>
                    </div>
                  )}
                  <div style={{ marginBottom: "10px", fontSize: "0.9rem", color: "#666" }}>
                    {filename}
                  </div>
                  <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
                    <button
                      onClick={() => window.open(`${API_url}/uploads/${filename}`, '_blank')}
                      style={{
                        color: "white",
                        background: "#28a745",
                        border: "none",
                        padding: "8px 16px",
                        borderRadius: "20px",
                        cursor: "pointer",
                        fontSize: "0.9rem"
                      }}
                    >
                      📥 Download
                    </button>
                    <button
                      onClick={() => handleDelete(filename)}
                      style={{
                        color: "white",
                        background: "#dc3545",
                        border: "none",
                        padding: "8px 16px",
                        borderRadius: "20px",
                        cursor: "pointer",
                        fontSize: "0.9rem"
                      }}
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
