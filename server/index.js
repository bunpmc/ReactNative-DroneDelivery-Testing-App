const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => {
    res.status(200).send("OK");
});


const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// --- In-Memory Database ---
const devices = {}; // { [socketId]: { id, role, lat, lng, socketId } }
const deviceSocketMap = {}; // deviceId -> socketId
const deliveries = {}; // { [deliveryId]: { ... } }

// --- Constants ---
const DISTANCE_ARRIVED = 50; // meters
const DISTANCE_APPROACHING = 500; // meters

// --- Helper Functions ---
function getDistance(lat1, lng1, lat2, lng2) {
    if (!lat1 || !lng1 || !lat2 || !lng2) return 999999;
    const R = 6371e3;
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function broadcastDeviceList() {
    const list = Object.values(devices);
    io.emit('device_list', list);
}

function broadcastAllDeliveries() {
    const active = Object.values(deliveries).filter(d => d.active);
    io.emit('active_deliveries_update', active);
}

// --- Socket Logic ---
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Send current state immediately
    socket.emit('device_list', Object.values(devices));
    socket.emit('active_deliveries_update', Object.values(deliveries).filter(d => d.active));

    socket.on('join', ({ deviceId, role }) => {
        console.log(`[JOIN] ${deviceId} as ${role}`);

        const oldSocketId = deviceSocketMap[deviceId];
        if (oldSocketId && devices[oldSocketId]) {
            delete devices[oldSocketId];
        }

        devices[socket.id] = {
            id: deviceId,
            role,
            lat: null,
            lng: null,
            socketId: socket.id,
            locked: false
        };
        deviceSocketMap[deviceId] = socket.id;

        broadcastDeviceList();

        // Send existing active delivery for this specific device if any
        const myDelivery = Object.values(deliveries).find(d =>
            d.active && (d.droneId === deviceId || d.destId === deviceId)
        );
        if (myDelivery) {
            socket.emit('delivery_assigned', myDelivery);
        }
    });

    socket.on('update_location', ({ lat, lng }) => {
        const device = devices[socket.id];
        if (!device) return;

        if (device.locked) return;

        device.lat = lat;
        device.lng = lng;

        // Efficient broadcast: only once per update
        socket.broadcast.emit('device_location_update', { id: device.id, lat, lng });

        checkAllDeliveriesStatus();
    });

    socket.on('create_delivery', ({ droneId, destId, items, quantity, notes }) => {
        console.log(`[ORDER] Create: ${droneId} -> ${destId}`);

        const deliveryId = `DEL-${Date.now()}`;
        const secretCode = Math.floor(1000 + Math.random() * 9000).toString();

        const newDelivery = {
            id: deliveryId,
            droneId,
            destId,
            items: items || 'Package',
            quantity: quantity || 1,
            notes: notes || '',
            status: 'IN_TRANSIT',
            secretCode,
            active: true,
            createdAt: new Date().toISOString()
        };

        deliveries[deliveryId] = newDelivery;

        // Notify specific participants
        const droneSocket = deviceSocketMap[droneId];
        if (droneSocket) io.to(droneSocket).emit('delivery_assigned', newDelivery);

        const destSocket = deviceSocketMap[destId];
        if (destSocket) io.to(destSocket).emit('delivery_assigned', { ...newDelivery, secretCode: null });

        // Notify Admins
        broadcastAllDeliveries();
    });

    socket.on('confirm_delivery', ({ deliveryId, code }) => {
        const delivery = deliveries[deliveryId];
        if (!delivery) return;

        if (delivery.secretCode === code) {
            delivery.status = 'DELIVERED';
            delivery.active = false;

            const destDev = devices[deviceSocketMap[delivery.destId]];
            if (destDev) destDev.locked = false;

            io.emit('delivery_completed', { deliveryId });
            broadcastAllDeliveries();
            console.log(`[SUCCESS] ${deliveryId} completed!`);
        } else {
            socket.emit('error', { message: 'Invalid QR Code' });
        }
    });

    socket.on('disconnect', () => {
        const device = devices[socket.id];
        if (device) {
            console.log('User disconnected:', device.id);
            delete deviceSocketMap[device.id];
        }
        delete devices[socket.id];
        broadcastDeviceList();
    });
});

function checkAllDeliveriesStatus() {
    let changed = false;
    Object.values(deliveries).forEach(delivery => {
        if (!delivery.active || delivery.status === 'DELIVERED') return;

        const drone = devices[deviceSocketMap[delivery.droneId]];
        const dest = devices[deviceSocketMap[delivery.destId]];

        if (drone && dest && drone.lat && dest.lat) {
            const distance = getDistance(drone.lat, drone.lng, dest.lat, dest.lng);
            let newStatus = delivery.status;

            if (distance <= DISTANCE_ARRIVED) {
                newStatus = 'ARRIVED';
                if (!dest.locked) {
                    dest.locked = true;
                    console.log(`[LOCK] ${dest.id}`);
                }
            } else if (distance <= DISTANCE_APPROACHING) {
                newStatus = 'APPROACHING';
                if (dest.locked) dest.locked = false;
            } else {
                newStatus = 'IN_TRANSIT';
                if (dest.locked) dest.locked = false;
            }

            console.log(`[DIST] ${delivery.id}: ${Math.round(distance)}m`);

            if (newStatus !== delivery.status) {
                delivery.status = newStatus;
                changed = true;
                io.emit('delivery_status_update', {
                    deliveryId: delivery.id,
                    status: newStatus,
                    distance: Math.round(distance)
                });
            }
        }
    });
    if (changed) broadcastAllDeliveries();
}

server.listen(3000, () => {
    console.log('SERVER listening on *:3000');
});
