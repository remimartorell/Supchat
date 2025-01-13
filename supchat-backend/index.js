const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const connectDB = require('./db');

const app = express();
connectDB();

// Middleware
app.use('/uploads', express.static('uploads'));
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/workspaces', require('./routes/workspaces'));
app.use('/api/workspaces', require('./routes/channels'));
app.use('/api/channels', require('./routes/messages'));
app.use('/api/direct-messages', require('./routes/directMessages'));

const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// On stocke ici le mapping userId -> socketId
const userSocketMap = {};

// Ajouter Socket.IO à l'application
app.set('socketio', io);
app.set('userSocketMap', userSocketMap);

// Événements Socket.IO
io.on('connection', (socket) => {
  console.log(`Nouvel utilisateur connecté : ${socket.id}`);

  /**
   * Quand un utilisateur “s’identifie” ou fait un “join”
   * (peu importe comment vous l’appelez),
   * on stocke dans userSocketMap l’association userId -> socket.id
   */
  socket.on('join', (userId) => {
    // Au lieu de “join room”, on stocke juste la correspondance
    if (!userId) {
      console.log("Erreur : Aucun userId fourni lors de l'événement 'join'");
      return;
    }
    userSocketMap[userId] = socket.id;
    console.log(`L'utilisateur ${userId} est maintenant associé au socket ${socket.id}`);

    // On peut renvoyer un événement de confirmation
    socket.emit('joined', {
      message: `Ok, userId ${userId} associé à socketId ${socket.id}`,
    });
  });

  // Écouter la déconnexion
  socket.on('disconnect', () => {
    console.log(`Socket déconnecté : ${socket.id}`);

    // Facultatif : on peut chercher le userId qui avait ce socketId et l’enlever
    // pour éviter un mapping obsolète
    const userIdToRemove = Object.keys(userSocketMap).find(
        (uId) => userSocketMap[uId] === socket.id
    );
    if (userIdToRemove) {
      delete userSocketMap[userIdToRemove];
      console.log(`Relation userId->socketId supprimée pour l'utilisateur : ${userIdToRemove}`);
    }
  });
});

app.get('/', (req, res) => {
  res.send('Server is running');
});

server.listen(3000, () => {
  console.log('Server running on port 3000');
});