const express = require('express');
const multer = require('multer');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');  // Added to handle file system operations
require('dotenv').config();  // Import dotenv to access environment variables

// Initialize app
const app = express();

// Enable CORS for frontend and backend communication
app.use(cors());

// Middleware to parse incoming JSON requests
app.use(express.json());

// MongoDB Connection using Atlas URI from environment variable
const mongoURI = process.env.MONGO_URI;

mongoose.connect(mongoURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.log('Error connecting to MongoDB:', err));

// File Schema and Model
const fileSchema = new mongoose.Schema({
    name: String,
    url: String,
    dateUploaded: { type: Date, default: Date.now }
});

const File = mongoose.model('File', fileSchema);

// Ensure the uploads directory exists (for file storage)
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// Set up Multer for file upload
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir); // Store files locally in the "uploads" folder
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname)); // Name the file with a timestamp
    }
});

const upload = multer({ storage });

// Upload File API
app.post('/upload', upload.single('file'), async (req, res) => {
    // Check if a file is uploaded
    if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded.' });
    }

    const file = req.file;
    const newFile = new File({
        name: file.filename,
        url: `/uploads/${file.filename}`  // Store the file URL
    });

    try {
        await newFile.save();  // Save file info to MongoDB
        res.json({ message: 'File uploaded successfully!', file: newFile });
    } catch (error) {
        console.error('Error uploading file:', error);  // Log the actual error
        res.status(500).json({ message: 'Error uploading file' });
    }
});

// List Files API
app.get('/files', async (req, res) => {
    try {
        const files = await File.find();  // Fetch all file records from MongoDB
        res.json(files);
    } catch (error) {
        console.error('Error fetching files:', error);
        res.status(500).json({ message: 'Error fetching files' });
    }
});

// Download File API
app.get('/files/:id', async (req, res) => {
    try {
        const file = await File.findById(req.params.id);  // Find the file by its ID
        if (!file) {
            return res.status(404).json({ message: 'File not found' });
        }
        res.download(path.join(__dirname, file.url));  // Download the file from the server
    } catch (error) {
        console.error('Error downloading file:', error);
        res.status(500).json({ message: 'Error downloading file' });
    }
});

// Serve uploaded files statically (i.e., access the files directly via URL)
app.use('/uploads', express.static(uploadDir));

// Start the server
app.listen(5000, () => {
    console.log('Server running on port 5000');
});
