# Chatbot API

A simple Express.js API for managing a knowledge base and chatbot interactions.

## Installation

```bash
npm install
```

## Running the Server

```bash
npm start
```

Server will run on `http://localhost:8080`

## API Endpoints

### 1. Set Knowledge Base
- **POST** `/Hubot/kb`
- **Body**: Raw string content
- **Description**: Sets the entire knowledge base with the provided string

### 2. Upload Knowledge Base File
- **POST** `/Hubot/kb-upload`
- **Body**: Form-data with file field named 'file'
- **File Type**: .txt files only
- **Description**: Uploads a text file and sets it as the knowledge base

### 3. Add to Knowledge Base
- **POST** `/Hubot/add-kb`
- **Body**: Raw string content
- **Description**: Appends the provided string to the existing knowledge base

### 4. Upload and Add to Knowledge Base
- **POST** `/Hubot/add-kb-upload`
- **Body**: Form-data with file field named 'file'
- **File Type**: .txt files only
- **Description**: Uploads a text file and appends its content to the existing knowledge base

### 5. Show Knowledge Base
- **GET** `/Hubot/show-kb`
- **Description**: Returns the current knowledge base content

### 6. Send Message
- **POST** `/Hubot/message`
- **Description**: Returns a standard bot response message

## Example Usage

### Setting Knowledge Base with String
```bash
curl -X POST http://localhost:8080/Hubot/kb \
  -H "Content-Type: application/json" \
  -d "This is my knowledge base content"
```

### Uploading Knowledge Base File
```bash
curl -X POST http://localhost:8080/Hubot/kb-upload \
  -F "file=@knowledge.txt"
```

### Adding to Knowledge Base
```bash
curl -X POST http://localhost:8080/Hubot/add-kb \
  -H "Content-Type: application/json" \
  -d "Additional knowledge base content"
```

### Viewing Knowledge Base
```bash
curl http://localhost:8080/Hubot/show-kb
```