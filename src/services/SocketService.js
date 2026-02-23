import io from 'socket.io-client';

const SocketService = {
    socket: null,

    connect: (url) => {
        if (SocketService.socket) {
            SocketService.socket.disconnect();
        }

        console.log("[SOCKET] Connecting to:", url);

        SocketService.socket = io(url, {
            // Try both websocket and polling for better compatibility
            transports: ['polling', 'websocket'],
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionAttempts: 5,
            timeout: 10000,
        });

        SocketService.socket.on('connect', () => {
            console.log("[SOCKET] ✅ Connected! Socket ID:", SocketService.socket.id);
        });

        SocketService.socket.on('disconnect', (reason) => {
            console.log("[SOCKET] ❌ Disconnected:", reason);
        });

        SocketService.socket.on('connect_error', (error) => {
            console.log("[SOCKET] ⚠️ Connection error:", error.message);
        });
    },

    disconnect: () => {
        if (SocketService.socket) {
            SocketService.socket.disconnect();
            SocketService.socket = null;
        }
    },

    join: (deviceId, role) => {
        if (SocketService.socket) {
            console.log("[SOCKET] Joining as:", deviceId, role);
            SocketService.socket.emit('join', { deviceId, role });
        } else {
            console.log("[SOCKET] Cannot join - not connected!");
        }
    },

    updateLocation: (lat, lng) => {
        if (SocketService.socket && SocketService.socket.connected) {
            SocketService.socket.emit('update_location', { lat, lng });
        }
    },

    createDelivery: (droneId, destId, items, quantity, notes) => {
        if (SocketService.socket) {
            console.log("[SOCKET] Creating delivery:", { droneId, destId, items, quantity, notes });
            SocketService.socket.emit('create_delivery', { droneId, destId, items, quantity, notes });
        }
    },

    confirmDelivery: (deliveryId, code) => {
        if (SocketService.socket) {
            SocketService.socket.emit('confirm_delivery', { deliveryId, code });
        }
    },

    on: (event, callback) => {
        if (SocketService.socket) {
            SocketService.socket.on(event, callback);
        }
    },

    off: (event) => {
        if (SocketService.socket) {
            SocketService.socket.off(event);
        }
    },

    isConnected: () => {
        return SocketService.socket && SocketService.socket.connected;
    }
};

export default SocketService;
