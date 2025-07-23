const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const app = express();
const PORT = process.env.PORT || 8080;

// Load Swagger document
const swaggerDocument = YAML.load('./swagger.yaml');

// Knowledge base storage
let knowledgeBase = '';

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (path.extname(file.originalname).toLowerCase() === '.txt') {
      cb(null, true);
    } else {
      cb(new Error('Only .txt files are allowed'), false);
    }
  }
});

// Middlewares
app.use(cors());

// Serve static files (for standalone HTML docs)
app.use('/public', express.static('public'));
app.use('/swagger.yaml', express.static('swagger.yaml'));

// Swagger UI setup
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: "Hubot API Documentation",
  customfavIcon: "/assets/favicon.ico",
  swaggerOptions: {
    persistAuthorization: true,
  }
}));

// Root endpoint - redirect to API docs
app.get('/', (req, res) => {
  res.redirect('/api-docs');
});

// Set knowledge base with string
app.post('/Hubot/kb', express.text({ type: 'text/plain' }), (req, res) => {
  try {
    if (!req.body || typeof req.body !== 'string') {
      return res.status(400).json({ error: 'Request body must be a string' });
    }
    
    knowledgeBase = req.body;
    res.json({
      message: 'Knowledge base updated successfully',
      status: 'success'
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update knowledge base' });
  }
});

// Upload text file and set as knowledge base
app.post('/Hubot/kb-upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const filePath = req.file.path;
    const fileContent = fs.readFileSync(filePath, 'utf8');
    
    knowledgeBase = fileContent;
    
    // Clean up uploaded file
    fs.unlinkSync(filePath);
    
    res.json({
      message: 'Knowledge base updated from file successfully',
      status: 'success'
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to process uploaded file' });
  }
});

// Append string to existing knowledge base
app.post('/Hubot/add-kb', express.text({ type: 'text/plain' }), (req, res) => {
  try {
    if (!req.body || typeof req.body !== 'string') {
      return res.status(400).json({ error: 'Request body must be a string' });
    }
    
    if (knowledgeBase) {
      knowledgeBase += '\n' + req.body;
    } else {
      knowledgeBase = req.body;
    }
    
    res.json({
      message: 'Content added to knowledge base successfully',
      status: 'success'
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add content to knowledge base' });
  }
});

// Upload text file and append to existing knowledge base
app.post('/Hubot/add-kb-upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const filePath = req.file.path;
    const fileContent = fs.readFileSync(filePath, 'utf8');
    
    if (knowledgeBase) {
      knowledgeBase += '\n' + fileContent;
    } else {
      knowledgeBase = fileContent;
    }
    
    // Clean up uploaded file
    fs.unlinkSync(filePath);
    
    res.json({
      message: 'File content added to knowledge base successfully',
      status: 'success'
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to process uploaded file' });
  }
});

// Show current knowledge base
app.get('/Hubot/show-kb', (req, res) => {
  try {
    res.json({
      knowledgeBase: knowledgeBase,
      status: 'success'
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve knowledge base' });
  }
});

// Default JSON middleware for routes that need it
app.use(express.json());

// Original message route
app.post('/Hubot/message', (req, res) => {
  res.json({
    message: "Handa Uncle Bot has received your query - We will be live soon"
  });
});

// Server Start
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
