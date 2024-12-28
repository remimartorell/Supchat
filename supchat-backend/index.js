const express = require('express');
const connectDB = require('./db');

const app = express();

// Connect Database
connectDB();

app.use('/uploads', express.static('uploads'));
// Middleware pour parser le JSON
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/workspaces', require('./routes/workspaces'));
app.use('/api/workspaces', require('./routes/channels'));
app.use('/api/channels', require('./routes/messages'));
app.use('/api/direct-messages', require('./routes/directMessages'));

app.get('/', (req, res) => {
  res.send('Server is running');
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
