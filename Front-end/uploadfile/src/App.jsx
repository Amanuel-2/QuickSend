import React, { useState } from 'react';

function App() {
  const [fileData, setFileData] = useState();
  const [files,setFiles] = useState([]);
  const filechangeHandler = (e) => {
    setFileData(e.target.files[0]); // ✅ fixed
  };

  const onSubmitHandler = (e) => {
    e.preventDefault();

    const data = new FormData();
    data.append("image", fileData); // ✅ matches multer.single("image")

    fetch("http://192.168.8.39:8000/single", { // ✅ use PC IP, not localhost
      method: "POST",
      body: data,
    })
      .then((res) => res.text())
      .then((result) => {
        console.log("File sent successfully:", result);
      })
      .catch((error) => {
        console.error("Upload error:", error.message);
      });
  };

  return (
    <div>
      <h1>React app file uploading</h1>
      <form onSubmit={onSubmitHandler}>
        <input type="file" onChange={filechangeHandler} />
        <br />
        <button type="submit">Submit file to backend</button>
      </form>

      <h2>uploaded image</h2>
      <div>
        {files.map(file=>(
        <div>
            <img src={`http://192.168.8.39:8000/image/${file}`} alt={file} />
            <p>{file}</p>
        </div>
      ))}
      </div>
    </div>
  );
}

export default App;
