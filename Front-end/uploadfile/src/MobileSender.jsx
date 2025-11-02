import { useState, useRef } from "react";
import API from './API'

const API_url = API;

function MobileSender() {
    const [file, setFile] = useState(null);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadComplete, setUploadComplete] = useState(false);
    const fileInputRef = useRef(null);

    // Handle file selection
    const handleFileSelect = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            setFile(selectedFile);
            setUploadComplete(false);
        }
    };

    // Handle upload
    const handleUpload = async () => {
        if (!file) return;

        setIsUploading(true);
        setUploadProgress(0);

        const formData = new FormData();
        formData.append("file", file);

        try {
            // Simulate progress
            const progressInterval = setInterval(() => {
                setUploadProgress(prev => {
                    if (prev >= 90) {
                        clearInterval(progressInterval);
                        return prev;
                    }
                    return prev + 10;
                });
            }, 200);

            const response = await fetch(`${API_url}/mobile-upload`, {
                method: "POST",
                body: formData,
            });

            clearInterval(progressInterval);
            setUploadProgress(100);

            if (response.ok) {
                const data = await response.json();
                console.log('✅ Mobile upload successful:', data);
                setTimeout(() => {
                    setIsUploading(false);
                    setUploadComplete(true);
                    setUploadProgress(0);
                }, 500);
            } else {
                const errorData = await response.json().catch(() => ({ error: 'Upload failed' }));
                throw new Error(errorData.error || 'Upload failed');
            }
        } catch (error) {
            console.error('❌ Mobile upload failed:', error);
            setIsUploading(false);
            setUploadProgress(0);
            alert(`Upload failed: ${error.message}. Please check if the server is running.`);
        }
    };

    // Reset for new upload
    const handleNewUpload = () => {
        setFile(null);
        setUploadComplete(false);
        setUploadProgress(0);
    };

    return (
        <div style={{
            minHeight: "100vh",
            backgroundColor: "#f8f9fa",
            fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
            padding: "20px"
        }}>
            <div style={{
                maxWidth: "400px",
                margin: "0 auto",
                textAlign: "center"
            }}>
                <h1 style={{
                    fontSize: "2rem",
                    marginBottom: "2rem",
                    background: "linear-gradient(45deg, #667eea 0%, #764ba2 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent"
                }}>
                    📱 Send to Computer
                </h1>

                {!uploadComplete ? (
                    <>
                        {/* File Selection */}
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            style={{
                                border: "3px dashed #667eea",
                                borderRadius: "15px",
                                padding: "40px 20px",
                                marginBottom: "30px",
                                cursor: "pointer",
                                backgroundColor: "#f8f9ff",
                                minHeight: "150px",
                                display: "flex",
                                flexDirection: "column",
                                justifyContent: "center",
                                alignItems: "center"
                            }}
                        >
                            <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>
                                {file ? "📎" : "📁"}
                            </div>
                            <h3 style={{ marginBottom: "1rem", color: "#333" }}>
                                {file ? file.name : "Tap to select file"}
                            </h3>
                            <p style={{ color: "#666", fontSize: "0.9rem" }}>
                                Any file type supported
                            </p>
                            <input
                                ref={fileInputRef}
                                type="file"
                                onChange={handleFileSelect}
                                style={{ display: "none" }}
                            />
                        </div>

                        {/* File Info and Upload */}
                        {file && (
                            <div style={{ marginBottom: "30px" }}>
                                <div style={{
                                    padding: "15px",
                                    backgroundColor: "#e8f5e8",
                                    borderRadius: "10px",
                                    marginBottom: "20px"
                                }}>
                                    <strong>Selected:</strong> {file.name}
                                    <br />
                                    <span style={{ color: "#666", fontSize: "0.9rem" }}>
                                        {(file.size / 1024 / 1024).toFixed(2)} MB
                                    </span>
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
                                    disabled={isUploading}
                                    style={{
                                        backgroundColor: "#667eea",
                                        color: "white",
                                        border: "none",
                                        padding: "15px 40px",
                                        borderRadius: "25px",
                                        fontSize: "1.1rem",
                                        cursor: isUploading ? "not-allowed" : "pointer",
                                        opacity: isUploading ? 0.7 : 1,
                                        transition: "all 0.3s ease",
                                        width: "100%"
                                    }}
                                >
                                    {isUploading ? "📤 Sending..." : "📤 Send to Computer"}
                                </button>
                            </div>
                        )}
                    </>
                ) : (
                    /* Upload Complete */
                    <div style={{
                        backgroundColor: "white",
                        padding: "30px",
                        borderRadius: "20px",
                        boxShadow: "0 10px 30px rgba(0,0,0,0.1)"
                    }}>
                        <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>
                            ✅
                        </div>
                        <h2 style={{ color: "#28a745", marginBottom: "1rem" }}>
                            File Sent Successfully!
                        </h2>
                        <p style={{ color: "#666", marginBottom: "30px" }}>
                            Your file has been uploaded to the computer.
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
                                width: "100%"
                            }}
                        >
                            📤 Send Another File
                        </button>
                    </div>
                )}

                {/* Instructions */}
                <div style={{
                    marginTop: "40px",
                    padding: "20px",
                    backgroundColor: "white",
                    borderRadius: "15px",
                    boxShadow: "0 5px 15px rgba(0,0,0,0.1)"
                }}>
                    <h3 style={{ color: "#333", marginBottom: "15px" }}>
                        📋 How to Use
                    </h3>
                    <div style={{ textAlign: "left", color: "#666" }}>
                        <p style={{ marginBottom: "10px" }}>
                            1. 📱 Tap the area above to select a file
                        </p>
                        <p style={{ marginBottom: "10px" }}>
                            2. 📤 Tap "Send to Computer" to upload
                        </p>
                        <p style={{ marginBottom: "10px" }}>
                            3. 💻 Check the computer screen for your file
                        </p>
                        <p>
                            4. 🔄 Repeat to send more files
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default MobileSender;
