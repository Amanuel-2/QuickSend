import { useState, useEffect } from "react";
import { QRCodeCanvas } from "qrcode.react";
const API_url = "http://192.168.8.39:8000";
function App() {
  const [file, setFile] = useState(null);
  const [files, setFiles] = useState([]);

  // Fetch files from backend
  const fetchFiles = async () => {
    const res = await fetch(`${API_url}/files`);
    const data = await res.json();
    setFiles(data);
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  // Handle upload
  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);

    await fetch(`${API_url}/upload`, {
      method: "POST",
      body: formData,
    });

    setFile(null);
    fetchFiles();
  };

  // Handle delete
  const handleDelete = async (filename) => {
    await fetch(`${API_url}/files/${filename}`, {
      method: "DELETE",
    });
    fetchFiles();
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>📂 Image Upload & Delete</h2>

      <form onSubmit={handleUpload}>
        <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files[0])} />
        <button type="submit">send</button>
      </form>
    <div>

    <h3>scan to open</h3>

      <QRCodeCanvas value="http://192.168.8.39:5173" size={200} />

    </div>
      <h3>Uploaded Images:</h3>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "15px" }}>
        {files.map((filename) => (
          <div key={filename} style={{ textAlign: "center" }}>
            <img
              src={`${API_url}/uploads/${filename}`}
              alt={filename}
              style={{ width: "200px", height: "150px", objectFit: "cover", borderRadius: "8px" }}
            />
            <br />
            <button
              onClick={() => handleDelete(filename)}
              style={{ marginTop: "5px", color: "white", background: "red", border: "none", padding: "5px 10px", borderRadius: "5px" }}
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
