const express = require('express');
const connectDB = require('./db');

const app = express();

// Connect Database
connectDB();

// Middleware pour parser le JSON
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/auth'));

app.get('/', (req, res) => {
  res.send('Server is running');
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
