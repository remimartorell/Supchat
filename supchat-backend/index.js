// supchat-backend/index.js
const express       = require('express');
const http          = require('http');
const socketIo      = require('socket.io');
const cors          = require('cors');
const connectDB     = require('./db');
require('dotenv').config();

const passport      = require('passport');
require('./config/passport'); // configure Facebook & Google

const session       = require('express-session');
const path          = require('path');

// 🔧 Bots et messages
const initPollBot     = require('./bots/pollBot');
const initMeetingBot  = require('./bots/meetingBot');
const initReminderBot = require('./bots/reminderBot');
const { saveBotMessage } = require('./controllers/messageBotController');

// 1️⃣ Connexion à Mongo
connectDB();

// 2️⃣ Setup Express
const app = express();
app.use(cors({
  origin:      process.env.CLIENT_URL,
  credentials: true,
}));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 3️⃣ Sessions & Passport
app.use(session({
  secret:           process.env.SESSION_SECRET || 'supchatsecret',
  resave:           false,
  saveUninitialized:true,
}));
app.use(passport.initialize());
app.use(passport.session());

// 4️⃣ Routes API
app.use('/api/auth',            require('./routes/auth'));
app.use('/api/users',           require('./routes/users'));
app.use('/api/workspaces',      require('./routes/workspaces'));
app.use('/api/workspaces',      require('./routes/channels'));
app.use('/api/channels',        require('./routes/messages'));
app.use('/api/direct-messages', require('./routes/directMessages'));
app.use('/api/search',          require('./routes/search'));
app.use('/api/notifications',   require('./routes/notifications'));
app.use('/api/meetings',        require('./routes/meetings'));
app.use('/api/channels',        require('./routes/channels'));

// 5️⃣ Serveur HTTP + WebSocket
const server = http.createServer(app);
const io     = socketIo(server, {
  cors: {
    origin:      process.env.CLIENT_URL,
    methods:     ['GET','POST'],
    credentials: true,
  },
});

// Partage socket / userMap
const userSocketMap = {};
app.set('socketio',      io);
app.set('userSocketMap', userSocketMap);

// Polls en mémoire
const activePolls = new Map();

// ⇨ Socket handlers
io.on('connection', socket => {
  console.log(`✅ Utilisateur connecté : ${socket.id}`);

  // Création de réunion
  socket.on('meeting', async ({ date, title, channelId }) => {
    try {
      const Meeting = require('./models/Meeting');
      const m = new Meeting({ title, startTime: new Date(date), channel: channelId });
      await m.save();
      console.log('✅ Réunion sauvegardée :', title);
    } catch (err) {
      console.error('❌ Erreur création réunion :', err);
    }
  });

  // Rappels de réunion
  socket.on('meeting-reminder', async ({ meetingTime, meetingTitle, channelId, receiverId }) => {
    const content = `✅ Réunion "${meetingTitle}" à ${meetingTime}.`;
    try {
      const saved = await saveBotMessage({ content, channel: channelId, receiver: receiverId }, channelId ? 'channel' : 'dm');
      if (!saved) return;
      const payload = saved.toObject();
      if (channelId) {
        io.to(channelId).emit('bot-message', payload);
      } else {
        const sockId = userSocketMap[receiverId];
        if (sockId) io.to(sockId).emit('bot-message', payload);
      }
    } catch (err) {
      console.error('❌ Erreur meeting-reminder:', err);
    }
  });

  // Gestion des connexions utilisateurs
  socket.on('join', userId => {
    if (!userId) return;
    userSocketMap[userId] = socket.id;
    socket.emit('joined', { message: `Connecté via ${socket.id}` });
    socket.broadcast.emit('user-connected', userId);
    socket.emit('active-users', Object.keys(userSocketMap));
  });

  socket.on('joinChannel', channelId => {
    socket.join(channelId);
    console.log(`🧩 ${socket.id} rejoint channel ${channelId}`);
  });

  socket.on('sendMessage', ({ channelId, message }) => {
    io.to(channelId).emit('receiveMessage', { message, channelId });
  });

  socket.on('sendDirectMessage', ({ toUserId, message }) => {
    const sid = userSocketMap[toUserId];
    if (sid) io.to(sid).emit('receiveDirectMessage', { message });
  });

  socket.on('disconnect', () => {
    console.log(`⚠️ Déco : ${socket.id}`);
    for (const [u, sid] of Object.entries(userSocketMap)) {
      if (sid === socket.id) {
        delete userSocketMap[u];
        socket.broadcast.emit('user-disconnected', u);
        break;
      }
    }
  });
});

// 6️⃣ Initialisation Bots
initPollBot(io, activePolls);
initMeetingBot(io, userSocketMap);
initReminderBot(io, userSocketMap);

// 7️⃣ Route test
app.get('/', (req, res) => res.send('✅ SupChat backend running'));

// 8️⃣ Lancement
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚀 Backend sur port ${PORT}`));
