require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const fetch = require('node-fetch'); // make sure to install node-fetch for Node.js < 18
const app = express();
const PORT = process.env.PORT || 8080;

// Validate that API key is loaded
// if (!process.env.ANTHROPIC_API_KEY) {
//   console.error('❌ ANTHROPIC_API_KEY not found in environment variables');
//   process.exit(1);
// }

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
    persistAuthorization: true
  }
}));

// Root endpoint - redirect to API docs
app.get('/', (req, res) => {
  res.redirect('/api-docs');
});

// Set knowledge base with string
app.post('/hubot/kb', express.text({ type: 'text/plain' }), (req, res) => {
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
app.post('/hubot/kb-upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    const filePath = req.file.path;
    const fileContent = fs.readFileSync(filePath, 'utf8');
    knowledgeBase = fileContent;
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
app.post('/hubot/add-kb', express.text({ type: 'text/plain' }), (req, res) => {
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
app.post('/hubot/add-kb-upload', upload.single('file'), (req, res) => {
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
app.get('/hubot/show-kb', (req, res) => {
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

// Claude API call abstraction
async function callClaudeAPI(message, context) {
  try {
    const userInput = context ? `${message}\n\nKnowledge Base:\n${context}` : message;
    const jsonBody = JSON.stringify({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 8192,
      messages: [{
        role: "user",
        content: userInput
      }]
    });
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      },
      body: jsonBody
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const responseData = await response.json();
    return responseData?.content?.[0]?.text || '';
  } catch (error) {
    throw error;
  }
}

// Updated /hubot/message endpoint using Claude API and current knowledge base
app.post('/hubot/message', async (req, res) => {
  try {
    const userMsg = typeof req.body === 'string' ? req.body : req.body.message;
    if (!userMsg) {
      return res.status(400).json({ error: 'Missing message in request body' });
    }
    const cleanedMsg = userMsg.replace(/[\n\r\t]/g, ' ');
    const kb = knowledgeBase || '';
    const claudeResponse = await callClaudeAPI(cleanedMsg, kb);
    res.status(200).json({ reply: claudeResponse });
  } catch (error) {
    console.error('Error in /hubot/message:', error);
    res.status(500).json({ error: error.message });
  }
});

// Server Start
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
