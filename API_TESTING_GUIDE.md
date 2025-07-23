# Hubot Knowledge Base API

A Node.js Express API for managing knowledge base content through text and file uploads.

## Features

- Set knowledge base with plain text
- Upload .txt files to set knowledge base
- Append text content to existing knowledge base
- Upload .txt files to append to knowledge base
- Retrieve current knowledge base content
- Basic chat message endpoint

## Setup

1. Install dependencies:
```bash
npm install
```

2. Start the server:
```bash
node index.js
```

The server will run on `http://localhost:8080`

## API Endpoints

### 1. Set Knowledge Base with String
**POST** `/Hubot/kb`

Sets the entire knowledge base with new string content.

### 2. Upload Text File to Set Knowledge Base
**POST** `/Hubot/kb-upload`

Uploads a .txt file and replaces the entire knowledge base with its content.

### 3. Append String to Knowledge Base
**POST** `/Hubot/add-kb`

Appends new string content to the existing knowledge base.

### 4. Upload Text File to Append to Knowledge Base
**POST** `/Hubot/add-kb-upload`

Uploads a .txt file and appends its content to the existing knowledge base.

### 5. Show Current Knowledge Base
**GET** `/Hubot/show-kb`

Retrieves the current content of the knowledge base.

### 6. Send Message to Hubot
**POST** `/Hubot/message`

Sends a message to the chatbot and receives a response.

## Postman Testing Guide

### 1. Testing `/Hubot/kb` (Set Knowledge Base)

**Method:** POST  
**URL:** `http://localhost:8080/Hubot/kb`  
**Headers:** 
- `Content-Type: text/plain`

**Body:**
- Select "raw" in Postman
- Choose "Text" from the dropdown (not JSON)
- Enter your text directly:
```
This is my knowledge base content. It contains important information.
```

**Expected Response:**
```json
{
    "message": "Knowledge base updated successfully",
    "status": "success"
}
```

### 2. Testing `/Hubot/kb-upload` (Upload File to Set KB)

**Method:** POST  
**URL:** `http://localhost:8080/Hubot/kb-upload`  
**Headers:** None needed (Postman sets multipart automatically)

**Body:**
- Select "form-data" in Postman
- Key: `file` (change type to "File" from the dropdown next to the key field)
- Value: Select your .txt file from your computer

**Expected Response:**
```json
{
    "message": "Knowledge base updated from file successfully",
    "status": "success"
}
```

### 3. Testing `/Hubot/add-kb` (Append String)

**Method:** POST  
**URL:** `http://localhost:8080/Hubot/add-kb`  
**Headers:**
- `Content-Type: text/plain`

**Body:**
- Select "raw" in Postman
- Choose "Text" from the dropdown
- Enter your text:
```
Additional content to append to the knowledge base.
```

**Expected Response:**
```json
{
    "message": "Content added to knowledge base successfully",
    "status": "success"
}
```

### 4. Testing `/Hubot/add-kb-upload` (Upload File to Append)

**Method:** POST  
**URL:** `http://localhost:8080/Hubot/add-kb-upload`  
**Headers:** None needed

**Body:**
- Select "form-data" in Postman
- Key: `file` (change type to "File")
- Value: Select your .txt file

**Expected Response:**
```json
{
    "message": "File content added to knowledge base successfully",
    "status": "success"
}
```

### 5. Testing `/Hubot/show-kb` (Get Knowledge Base)

**Method:** GET  
**URL:** `http://localhost:8080/Hubot/show-kb`  
**Headers:** None needed  
**Body:** None needed

**Expected Response:**
```json
{
    "knowledgeBase": "Your current knowledge base content here...",
    "status": "success"
}
```

### 6. Testing `/Hubot/message` (Send Message)

**Method:** POST  
**URL:** `http://localhost:8080/Hubot/message`  
**Headers:**
- `Content-Type: application/json`

**Body:**
- Select "raw" in Postman
- Choose "JSON" from the dropdown
- Enter JSON:
```json
{
    "message": "Hello Hubot, how can you help me?"
}
```

**Expected Response:**
```json
{
    "message": "Handa Uncle Bot has received your query - We will be live soon"
}
```

## Common Issues and Solutions

### Issue 1: "SyntaxError: Unexpected token" for `/Hubot/kb`

**Problem:** You're sending JSON when the endpoint expects plain text.

**Solution:** 
- In Postman, select "raw" body type
- Choose "Text" from the dropdown (NOT JSON)
- Remove any JSON formatting like quotes or braces
- Send plain text directly

### Issue 2: "MulterError: Unexpected field" for file uploads

**Problem:** Wrong field name or form-data setup.

**Solution:**
- In Postman, select "form-data" body type
- Use exactly `file` as the key name
- Change the key type to "File" (click dropdown next to key field)
- Make sure you're uploading a .txt file

### Issue 3: 400 Bad Request for file uploads

**Problem:** File is not a .txt file or no file selected.

**Solution:**
- Ensure your file has a .txt extension
- Make sure the file is actually selected in Postman
- The API only accepts .txt files

### Issue 4: Server not responding

**Problem:** Server might not be running.

**Solution:**
- Run `node index.js` to start the server
- Check that you see "✅ Server running at http://localhost:8080"
- Ensure no other process is using port 8080

## Testing Flow

1. Start with `GET /Hubot/show-kb` to see current (empty) knowledge base
2. Use `POST /Hubot/kb` to set initial content
3. Use `GET /Hubot/show-kb` to verify content was set
4. Use `POST /Hubot/add-kb` to append more content
5. Use `GET /Hubot/show-kb` to see combined content
6. Test file uploads with `POST /Hubot/kb-upload` and `POST /Hubot/add-kb-upload`
7. Test the message endpoint with `POST /Hubot/message`

## File Requirements

- Only .txt files are accepted for uploads
- Files are temporarily stored in `uploads/` directory and deleted after processing
- Maximum file size depends on your system's available memory

## Response Format

All successful responses return JSON with:
- `message`: Description of the action performed
- `status`: Always "success" for successful operations
- `knowledgeBase`: Current KB content (only for show-kb endpoint)

All error responses return JSON with:
- `error`: Description of what went wrong
