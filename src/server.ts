import dotenv from 'dotenv';
import { createServer } from 'http';
import jwt from 'jsonwebtoken';
import { Server } from 'socket.io';

import app from './app.js';
import { startPeriodicHealthCheck, testConnection } from './utils/dbHealthCheck.js';
import logger from './utils/logger.js';
import { setSocketIOInstance } from './utils/socketIoInstance.js';
import { initAssetTransferJob } from './jobs/processAssetTransfers.js';

dotenv.config();

const PORT = process.env.SERVER_PORT;

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    methods: ['GET', 'POST'],
    origin: '*' // Adjust this to match your frontend's origin
  }
});

io.use((socket, next) => {
  const token = socket.handshake.auth.token || socket.handshake.query.token;
  if (!token) { next(new Error('unauthorized')); return; }
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

// Set the io instance globally so controllers can emit events
setSocketIOInstance(io);

// Initialize scheduled jobs
initAssetTransferJob();

export { io }; // Export the WebSocket instance

// Test database connection before starting server
testConnection().then((isConnected) => {
  if (isConnected) {
    logger.info('✅ Database connection test successful');
    // Start periodic health monitoring (every 30 seconds) and broadcast via Socket.IO
    startPeriodicHealthCheck(30000, io);
  } else {
    logger.error('⚠️ Database connection test failed - server starting anyway');
  }
});

httpServer.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  logger.info(`Server is running on port ${PORT}`);
});