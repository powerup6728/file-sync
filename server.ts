import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import chokidar from 'chokidar';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import multer from 'multer';
import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    // ===================================================================
    // IMPORTANT: THIS IS WHERE YOU PUT YOUR VERCEL APP URL
    // ===================================================================
    // Replace 'YOUR_VERCEL_APP_URL.vercel.app' with the actual URL of
    // your deployed Vercel application.
    //
    // Example: origin: ['http://localhost:5173', 'https://my-sync-app.vercel.app']
    //
    origin: ['http://localhost:5173', 'https://YOUR_VERCEL_APP_URL.vercel.app'],
    methods: ['GET', 'POST', 'DELETE'], // Added DELETE
  },
});

const PORT = 3000;
const SYNC_DIR = path.join(__dirname, 'sync-folder');

// Ensure the sync directory exists
if (!fs.existsSync(SYNC_DIR)) {
  fs.mkdirSync(SYNC_DIR);
  console.log(`Created sync directory at: ${SYNC_DIR}`);
  fs.writeFileSync(path.join(SYNC_DIR, 'welcome.txt'), 'Hello! Edit or delete me, or add new files to this folder.');
}

// Multer setup for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, SYNC_DIR);
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  },
});
const upload = multer({ storage });

app.use(express.static(path.join(__dirname, 'dist')));

// API endpoint to list files
app.get('/files', (req, res) => {
  fs.readdir(SYNC_DIR, (err, files) => {
    if (err) {
      console.error('Failed to list files:', err);
      return res.status(500).json({ error: 'Failed to list files' });
    }
    res.json(files);
  });
});

// API endpoint for file uploads - now accepts multiple files
app.post('/upload', upload.array('files'), (req, res) => {
  if (!req.files || (req.files as Express.Multer.File[]).length === 0) {
    return res.status(400).send('No files uploaded.');
  }
  const fileCount = (req.files as Express.Multer.File[]).length;
  res.status(200).send(`${fileCount} file(s) uploaded successfully.`);
});

// API endpoint for file downloads
app.get('/download/:filename', (req, res) => {
  const { filename } = req.params;
  const filePath = path.join(SYNC_DIR, filename);

  if (fs.existsSync(filePath)) {
    res.download(filePath, filename, (err) => {
      if (err) {
        console.error('Error downloading file:', err);
      }
    });
  } else {
    res.status(404).send('File not found.');
  }
});

// API endpoint for deleting a file
app.delete('/files/:filename', (req, res) => {
  const { filename } = req.params;
  const filePath = path.join(SYNC_DIR, filename);

  if (fs.existsSync(filePath)) {
    fs.unlink(filePath, (err) => {
      if (err) {
        console.error('Error deleting file:', err);
        return res.status(500).send('Error deleting file.');
      }
      res.status(200).send(`File ${filename} deleted successfully.`);
    });
  } else {
    res.status(404).send('File not found.');
  }
});


io.on('connection', (socket) => {
  console.log('A client connected:', socket.id);

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

const watcher = chokidar.watch(SYNC_DIR, {
  ignored: /(^|[/\\])\../, // ignore dotfiles
  persistent: true,
  ignoreInitial: true,
});

console.log(`Watching for file changes in ${SYNC_DIR}`);

watcher
  .on('add', (filePath) => {
    const fileName = path.basename(filePath);
    console.log(`File ${fileName} has been added`);
    io.emit('file-change');
  })
  .on('unlink', (filePath) => {
    const fileName = path.basename(filePath);
    console.log(`File ${fileName} has been removed`);
    io.emit('file-change');
  });

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running!`);
  
  const networkInterfaces = os.networkInterfaces();
  console.log('Access it from other devices on your network at:');
  Object.keys(networkInterfaces).forEach(ifaceName => {
    const iface = networkInterfaces[ifaceName];
    if (iface) {
      iface.forEach(details => {
        if (details.family === 'IPv4' && !details.internal) {
          console.log(`- http://${details.address}:${PORT}`);
        }
      });
    }
  });
  console.log(`For external access, use your public IP address with port ${PORT} forwarded.`);
});
