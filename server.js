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
mongoose.connect('mongodb+srv://abhayadmin:19April2004@cluster0.utya8lb.mongodb.net/fileSharing?retryWrites=true&w=majority', { useNewUrlParser: true, useUnifiedTopology: true });

// Define File Schema
const File = mongoose.model('File', new mongoose.Schema({
    name: String,
    path: String,
}));

// Setup Multer for file uploads
const upload = multer({ dest: 'uploads/' });

// Upload endpoint
app.post('/upload', upload.single('file'), async (req, res) => {
    if (!req.file) return res.status(400).send({ message: 'No file uploaded' });

    const file = new File({
        name: req.file.originalname,
        path: req.file.path,
    });

    await file.save();
    res.send({ message: 'File uploaded successfully' });
});

// Fetch all files
app.get('/files', async (req, res) => {
    try {
        const files = await File.find();
        res.send(files);
    } catch (err) {
        console.error('Error fetching files:', err);
        res.status(500).send({ message: 'Error fetching files. Please try again later.' });
    }
});

// Download file by ID
app.get('/files/:id', async (req, res) => {
    try {
        const file = await File.findById(req.params.id);
        if (!file) return res.status(404).send({ message: 'File not found' });

        res.download(file.path, file.name);
    } catch (err) {
        console.error('Error downloading file:', err);
        res.status(500).send({ message: 'Error downloading file. Please try again later.' });
    }
});

// ✅ DELETE file by ID (robust version)
app.delete('/files/:id', async (req, res) => {
    try {
        // Find the file by ID
        const file = await File.findById(req.params.id);
        if (!file) return res.status(404).send({ message: 'File not found in DB' });

        // Attempt to delete the file from the disk
        fs.unlink(file.path, async (err) => {
            if (err) {
                if (err.code === 'ENOENT') {
                    // ENOENT means the file was not found, perhaps already deleted
                    console.log(`File already deleted from disk: ${file.path}`);
                } else {
                    // If there's another error while deleting, log it and return an error response
                    console.error('Error deleting file from disk:', err);
                    return res.status(500).send({ message: 'Error deleting file from disk' });
                }
            }

            // If deletion from disk succeeded (or file was already deleted), proceed to remove it from DB
            try {
                await File.deleteOne({ _id: req.params.id });
                res.send({ message: 'File deleted successfully' });
            } catch (dbError) {
                console.error('Error deleting file from database:', dbError);
                res.status(500).send({ message: 'Error deleting file from database' });
            }
        });
    } catch (err) {
        console.error('Error during file deletion process:', err);
        res.status(500).send({ message: 'Internal server error during deletion' });
    }
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
