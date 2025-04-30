const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// MongoDB connection
mongoose.connect('mongodb+srv://abhayadmin:19April2004@cluster0.utya8lb.mongodb.net/fileSharing?retryWrites=true&w=majority');

// Define File Schema
const File = mongoose.model('File', new mongoose.Schema({
    name: String,
    path: String,
}));

// Multer setup
const upload = multer({ dest: 'uploads/' });

// Upload endpoint
app.post('/upload', upload.single('file'), async (req, res) => {
    if (!req.file) return res.status(400).send({ message: 'No file uploaded' });

    const fullPath = path.join(__dirname, 'uploads', req.file.filename);

    const file = new File({
        name: req.file.originalname,
        path: fullPath,
    });

    await file.save();
    res.send({ message: 'File uploaded successfully' });
});

// Get all files
app.get('/files', async (req, res) => {
    const files = await File.find();
    res.send(files);
});

// Download by ID
app.get('/files/:id', async (req, res) => {
    const file = await File.findById(req.params.id);
    if (!file) return res.status(404).send({ message: 'File not found' });
    res.download(file.path, file.name);
});

// DELETE by filename (new route)
app.delete('/files/deleteByName/:name', async (req, res) => {
    const fileName = req.params.name;
    const file = await File.findOne({ name: fileName });

    if (!file) return res.status(404).send({ message: 'File not found in DB' });
    if (!file.path || !fs.existsSync(file.path)) return res.status(400).send({ message: 'File not found on disk' });

    fs.unlink(file.path, async (err) => {
        if (err) return res.status(500).send({ message: 'Failed to delete file from disk' });

        await File.deleteOne({ _id: file._id });
        res.send({ message: 'File deleted successfully' });
    });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
