const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 8080;

// Middlewares
app.use(cors());
app.use(express.json());

// Route
app.post('/hubot/message', (req, res) => {
  res.json({
    message: "Handa Uncle Bot has received your query - We will be live soon"
  });
});

// Server Start
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
