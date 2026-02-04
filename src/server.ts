import dotenv from 'dotenv';
import { createServer } from 'http';
import jwt from 'jsonwebtoken';
import { Server } from 'socket.io';

import app from './app.js';
import * as userModel from './p.user/userModel.js';
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
    origin: process.env.CORS_ALLOWED_ORIGINS?.split(',') || '*' // Use configured CORS origins
  }
});

io.use(async (socket, next) => {
  const token = socket.handshake.auth.token || socket.handshake.query.token;
  if (!token) { next(new Error('unauthorized')); return; }
  try {
    if (!process.env.JWT_SECRET) throw new Error('Missing JWT secret');
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    
    // Validate session token if single-session enforcement is enabled
    if (process.env.SINGLE_SESSION_ENFORCEMENT === 'true') {
      const userId = decoded.userId;
      const sessionToken = decoded.session;
      
      if (!userId || !sessionToken) {
        logger.warn(`Socket auth failed: missing userId or session in token for socket ${socket.id}`);
        next(new Error('invalid_token'));
        return;
      }
      
      // Check if the session token matches the stored session
      try {
        const currentSession = await userModel.getUserSessionToken(userId);
        if (!currentSession || currentSession !== sessionToken) {
          logger.warn(`Socket auth failed: session mismatch for userId=${userId}`);
          next(new Error('session_expired'));
          return;
        }
      } catch (dbError) {
        logger.error(`Socket auth database error for userId=${decoded.userId}:`, dbError);
        next(new Error('session_validation_failed'));
        return;
      }
    }
    
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

// Start server after database connection is verified
const startServer = async () => {
  try {
    const isConnected = await testConnection();
    
    if (!isConnected) {
      logger.error('❌ Database connection test failed - unable to start server');
      console.error('❌ Database connection test failed - unable to start server');
      process.exit(1); // Exit with error code
    }
    
    logger.info('✅ Database connection test successful');
    
    // Start periodic health monitoring (every 30 seconds) and broadcast via Socket.IO
    startPeriodicHealthCheck(30000, io);
    
    httpServer.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
      logger.info(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Fatal error during server startup:', error);
    console.error('Fatal error during server startup:', error);
    process.exit(1);
  }
};

// Start the server
startServer();