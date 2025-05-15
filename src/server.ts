import app from './app.js';
import dotenv from 'dotenv';
import logger from './utils/logger.js';
import { createServer } from 'http';
import { Server } from 'socket.io';

dotenv.config();

const PORT = process.env.SERVER_PORT;

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*', // Adjust this to match your frontend's origin
    methods: ['GET', 'POST']
  }
});

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('disconnect', () => {
    console.log('A user disconnected:', socket.id);
  });
});

export { io }; // Export the WebSocket instance

httpServer.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  logger.info(`Server is running on port ${PORT}`);
});