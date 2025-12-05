import { Server as SocketIOServer } from 'socket.io';

/**
 * Global Socket.IO instance holder
 * Populated by server.ts after Socket.IO initialization
 */
let ioInstance: SocketIOServer | null = null;

/**
 * Set the Socket.IO instance (called by server.ts)
 */
export const setSocketIOInstance = (io: SocketIOServer): void => {
  ioInstance = io;
};

/**
 * Get the Socket.IO instance for emitting events from controllers
 */
export const getSocketIOInstance = (): SocketIOServer | null => {
  return ioInstance;
};

export default {
  setSocketIOInstance,
  getSocketIOInstance
};
