import app from './app.js';
import dotenv from 'dotenv';
import logger from './utils/logger.js';
import { createServer } from 'http';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';

dotenv.config();

const PORT = process.env.SERVER_PORT;

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*', // Adjust this to match your frontend's origin
    methods: ['GET', 'POST']
  }
});

io.use((socket, next) => {
  const token = socket.handshake.auth?.token || socket.handshake.query?.token;
  if (!token) return next(new Error('unauthorized'));
  try {
    if (!process.env.JWT_SECRET) throw new Error('Missing JWT secret');
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    (socket as any).userId = decoded.userId;
    next();
  } catch (err) {
    logger.error('Socket auth failed', err);
    next(new Error('unauthorized'));
  }
});

io.on('connection', (socket) => {
  const userId = (socket as any).userId;
  if (userId) {
    socket.join(`user:${userId}`);
    logger.info(`Socket connected userId=${userId} socketId=${socket.id}`);
  }
  socket.on('disconnect', () => {
    logger.info(`Socket disconnected userId=${userId} socketId=${socket.id}`);
  });
});

export { io }; // Export the WebSocket instance

httpServer.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  logger.info(`Server is running on port ${PORT}`);
});