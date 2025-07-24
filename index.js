require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const fetch = require('node-fetch'); // make sure to install node-fetch for Node.js < 18

const { initializeApp } = require('firebase/app');
const { getDatabase, ref, get, set } = require('firebase/database');
const app = express();
const PORT = process.env.PORT || 8080;

// Validate that API key is loaded
if (!process.env.ANTHROPIC_API_KEY) {
  console.error('❌ ANTHROPIC_API_KEY not found in environment variables');
  process.exit(1);
} else {
  console.log('✅ ANTHROPIC_API_KEY loaded successfully');
}

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.FIREBASE_DB_URL,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
};

const firebaseApp = initializeApp(firebaseConfig);
const db = getDatabase(firebaseApp);

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
app.use(express.json());

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

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    endpoints: [
      'POST /hubot/message',
      'POST /save-query',
      'GET /get-queries',
      'GET /get-queries/:email',
      'GET /get-all-users'
    ]
  });
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

// JSON middleware already configured above

// Firebase query saving endpoint
app.post('/save-query', async (req, res) => {
  try {
    const { email, query } = req.body;

    if (!query) {
      return res.status(400).json({ error: "Query is required" });
    }

    // Use email if provided, otherwise use "unknown"
    const userKey = email ? email.replace(/\./g, "_") : "unknown";
    const dbRef = ref(db, 'user_queries/' + userKey);

    // Get existing queries for this user
    const snapshot = await get(dbRef);
    const queries = snapshot.exists() ? snapshot.val() : [];

    // Add new query to the list
    queries.push({
      query: query,
      timestamp: new Date().toISOString()
    });

    // Save back to Firebase
    await set(dbRef, queries);

    res.status(200).json({
      message: "Query saved successfully",
      userKey: userKey,
      totalQueries: queries.length
    });

  } catch (err) {
    console.error("Error saving query:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Get user queries endpoint - with email
app.get('/get-queries/:email', async (req, res) => {
  try {
    const email = req.params.email;
    const userKey = email.replace(/\./g, "_");
    const dbRef = ref(db, 'user_queries/' + userKey);

    const snapshot = await get(dbRef);
    const queries = snapshot.exists() ? snapshot.val() : [];

    res.status(200).json({
      userKey: userKey,
      queries: queries,
      totalQueries: queries.length
    });

  } catch (err) {
    console.error("Error getting queries:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Get user queries endpoint - for unknown users
app.get('/get-queries', async (req, res) => {
  try {
    const userKey = "unknown";
    const dbRef = ref(db, 'user_queries/' + userKey);

    const snapshot = await get(dbRef);
    const queries = snapshot.exists() ? snapshot.val() : [];

    res.status(200).json({
      userKey: userKey,
      queries: queries,
      totalQueries: queries.length
    });

  } catch (err) {
    console.error("Error getting queries:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Get all users and their query counts
app.get('/get-all-users', async (req, res) => {
  try {
    const dbRef = ref(db, 'user_queries');
    const snapshot = await get(dbRef);

    if (!snapshot.exists()) {
      return res.status(200).json({ users: {}, totalUsers: 0 });
    }

    const allData = snapshot.val();
    const userSummary = {};

    Object.keys(allData).forEach(userKey => {
      const queries = allData[userKey];
      userSummary[userKey] = {
        queryCount: Array.isArray(queries) ? queries.length : 0,
        lastQuery: Array.isArray(queries) && queries.length > 0 ?
          queries[queries.length - 1].timestamp : null
      };
    });

    res.status(200).json({
      users: userSummary,
      totalUsers: Object.keys(userSummary).length
    });

  } catch (err) {
    console.error("Error getting all users:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Claude API call abstraction
async function callClaudeAPI(message, context) {
  try {
    console.log('Claude API - Input message:', message);
    console.log('Claude API - Context length:', context ? context.length : 0);
    
    const userInput = context ? `${message}\n\nKnowledge Base:\n${context}` : message;
    const jsonBody = JSON.stringify({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 8192,
      messages: [{
        role: "user",
        content: userInput
      }]
    });
    
    console.log('Claude API - Making request to Anthropic...');
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      },
      body: jsonBody
    });
    
    console.log('Claude API - Response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Claude API - Error response:', errorText);
      throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
    }
    
    const responseData = await response.json();
    console.log('Claude API - Response received, content length:', responseData?.content?.[0]?.text?.length || 0);
    
    return responseData?.content?.[0]?.text || 'No response from Claude API';
  } catch (error) {
    console.error('Claude API - Error:', error);
    throw error;
  }
}

// Updated /hubot/message endpoint using Claude API and current knowledge base
app.post('/hubot/message', async (req, res) => {
  try {
    console.log('Received request body:', req.body);
    console.log('API Key exists:', !!process.env.ANTHROPIC_API_KEY);
    
    let userMsg;
    let userEmail = null;
    
    // Handle different request body formats
    if (typeof req.body === 'string') {
      userMsg = req.body;
    } else if (req.body && typeof req.body === 'object') {
      userMsg = req.body.message;
      userEmail = req.body.email || null;
    } else {
      return res.status(400).json({ error: 'Invalid request body format' });
    }

    if (!userMsg) {
      return res.status(400).json({ error: 'Missing message in request body' });
    }

    console.log('Processing message:', userMsg);
    const cleanedMsg = userMsg.replace(/[\n\r\t]/g, ' ');
    const kb = knowledgeBase || '';

    // Save query to Firebase before processing
    try {
      const userKey = userEmail ? userEmail.replace(/\./g, "_") : "unknown";
      const dbRef = ref(db, 'user_queries/' + userKey);
      const snapshot = await get(dbRef);
      const queries = snapshot.exists() ? snapshot.val() : [];

      queries.push({
        query: cleanedMsg,
        timestamp: new Date().toISOString()
      });

      await set(dbRef, queries);
      console.log(`Query saved for user: ${userKey}`);
    } catch (firebaseError) {
      console.error('Error saving query to Firebase:', firebaseError);
      // Continue with Claude API call even if Firebase fails
    }

    console.log('Calling Claude API...');
    const claudeResponse = await callClaudeAPI(cleanedMsg, kb);
    console.log('Claude API response received');
    
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
