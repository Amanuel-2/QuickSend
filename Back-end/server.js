const express = require('express');
const multer = require('multer');
const cors = require('cors');
const app = express();
const port = 8000;

const path = require('path');
app.use('/image', express.static(path.join(__dirname, 'image')));

const fs = require('fs');

app.get('/files', (req, res) => {
  fs.readdir(path.join(__dirname, 'image'), (err, files) => {
    if (err) return res.status(500).send('Unable to list files');
    res.json(files); // returns an array of filenames
  });
});
app.use(cors());
const fielstorageEngin = multer.diskStorage({
    destination:(req,file,cb)=>{
        cb(null,"./image");
    },
    filename:(req,file,cb)=>{
        cb(null,Date.now()+"--"+file.originalname);
    }
})
const upload = multer({storage:fielstorageEngin});


app.post("/single",upload.single("image"),(req,res)=>{
    console.log(req.file);
    res.send("requst success");
})
app.post("/multiple",upload.array("images",3),(req,res)=>{
    console.log(req.files);
    res.send("mulltiple file uploded successfuly")
})
app.listen(port,"0.0.0.0",()=>{
    console.log(`server is listening on ${port}`);
})