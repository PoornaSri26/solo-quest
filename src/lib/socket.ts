import { io, Socket } from 'socket.io-client';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace('/api', '');

interface SocketManager {
  socket: Socket | null;
  reconnectAttempts: number;
  maxReconnectAttempts: number;
  reconnectDelay: number;
  isConnecting: boolean;
}

const socketManager: SocketManager = {
  socket: null,
  reconnectAttempts: 0,
  maxReconnectAttempts: 10,
  reconnectDelay: 1000,
  isConnecting: false,
};

export const connectSocket = (token: string): Socket => {
  if (socketManager.socket?.connected) {
    return socketManager.socket;
  }

  if (socketManager.isConnecting) {
    // Return existing socket even if not fully connected yet
    return socketManager.socket!;
  }

  socketManager.isConnecting = true;
  socketManager.reconnectAttempts = 0;

  socketManager.socket = io(API_URL, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: socketManager.maxReconnectAttempts,
    reconnectionDelay: socketManager.reconnectDelay,
    reconnectionDelayMax: 5000,
    timeout: 10000,
  });

  socketManager.socket.on('connect', () => {
    console.log('[Socket] Connected');
    socketManager.reconnectAttempts = 0;
    socketManager.isConnecting = false;
  });

  socketManager.socket.on('disconnect', (reason) => {
    console.log('[Socket] Disconnected:', reason);
    socketManager.isConnecting = false;
  });

  socketManager.socket.on('connect_error', (error) => {
    console.error('[Socket] Connection error:', error.message);
    socketManager.reconnectAttempts++;
    
    if (socketManager.reconnectAttempts >= socketManager.maxReconnectAttempts) {
      console.error('[Socket] Max reconnection attempts reached');
      socketManager.socket?.disconnect();
      socketManager.socket = null;
      socketManager.isConnecting = false;
    }
  });

  socketManager.socket.on('reconnect_attempt', () => {
    console.log(`[Socket] Reconnection attempt ${socketManager.reconnectAttempts + 1}`);
  });

  socketManager.socket.on('reconnect_failed', () => {
    console.error('[Socket] Reconnection failed');
  });

  return socketManager.socket;
};

export const disconnectSocket = () => {
  if (socketManager.socket) {
    socketManager.socket.disconnect();
    socketManager.socket = null;
    socketManager.isConnecting = false;
    socketManager.reconnectAttempts = 0;
  }
};

export const getSocket = (): Socket | null => socketManager.socket;

export const getConnectionStatus = (): 'connected' | 'disconnected' | 'connecting' => {
  if (socketManager.socket?.connected) return 'connected';
  if (socketManager.isConnecting) return 'connecting';
  return 'disconnected';
};
