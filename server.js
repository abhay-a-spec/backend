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
app.delete('/files/deleteByName/:name', async (req, res) => {
    try {
        // Decode the file name to handle special characters
        const fileName = decodeURIComponent(req.params.name);
        console.log(`Received delete request for file: ${fileName}`);

        // Find the file in the DB based on its name
        const file = await File.findOne({ name: fileName });

        if (!file) {
            console.error(`File not found in DB: ${fileName}`);
            return res.status(404).send({ message: 'File not found in DB' });
        }

        // Ensure the file exists on disk
        if (!file.path || !fs.existsSync(file.path)) {
            console.error(`File path is invalid or file does not exist: ${file.path}`);
            return res.status(400).send({ message: 'File not found on disk' });
        }

        // Try to delete the file from the server's disk
        fs.unlink(file.path, async (err) => {
            if (err) {
                console.error('Error deleting file from disk:', err);
                return res.status(500).send({ message: 'Failed to delete from disk' });
            }

            // Once the file is deleted from disk, remove it from the database
            await File.deleteOne({ name: fileName });
            console.log(`File successfully deleted: ${fileName}`);
            res.send({ message: 'File deleted successfully' });
        });
    } catch (err) {
        console.error('Error during file deletion:', err);
        res.status(500).send({ message: 'Internal server error during file deletion' });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
