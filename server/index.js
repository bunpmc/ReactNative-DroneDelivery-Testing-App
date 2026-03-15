const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

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
const restDevices = {}; // { [deviceId]: { id, role, lat, lng } } — devices registered via REST (Unity)
let latestMission = null; // { lat, lon, alt, status }

// --- Constants ---
const DISTANCE_ARRIVED = 50; // meters
const DISTANCE_APPROACHING = 500; // meters

// --- Helper: Merged device list (Socket.IO + REST devices) ---
function getAllDevices() {
    const socketDevices = Object.values(devices);
    const restDeviceList = Object.values(restDevices);
    // Merge: REST devices that aren't already in socket devices
    const socketIds = new Set(socketDevices.map(d => d.id));
    const merged = [...socketDevices];
    for (const rd of restDeviceList) {
        if (!socketIds.has(rd.id)) {
            merged.push(rd);
        }
    }
    return merged;
}

// --- Helper Functions ---
function getDistance(lat1, lng1, lat2, lng2) {
    if (!lat1 || !lng1 || !lat2 || !lng2) return 999999;
    const R = 6371e3;
    const p1 = lat1 * Math.PI / 180;
    const p2 = lat2 * Math.PI / 180;
    const dp = (lat2 - lat1) * Math.PI / 180;
    const dl = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dp / 2) * Math.sin(dp / 2) +
        Math.cos(p1) * Math.cos(p2) *
        Math.sin(dl / 2) * Math.sin(dl / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function broadcastDeviceList() {
    const list = getAllDevices();
    io.emit('device_list', list);
}

function broadcastAllDeliveries() {
    const active = Object.values(deliveries).filter(d => d.active);
    io.emit('active_deliveries_update', active);
}

// ============================================================
// REST API ENDPOINTS
// ============================================================

app.get("/health", (req, res) => {
    res.status(200).send("OK");
});

// --- REST Device Registration (for Unity drone & delivery points) ---
// Register or heartbeat a device via REST (no Socket.IO needed)
app.post('/api/device/register', (req, res) => {
    const { deviceId, role, lat, lng } = req.body;
    if (!deviceId || !role) {
        return res.status(400).json({ error: 'deviceId and role are required' });
    }

    restDevices[deviceId] = {
        id: deviceId,
        role: role, // 'DRONE' or 'DESTINATION'
        lat: lat || null,
        lng: lng || null,
        socketId: null, // REST device, no socket
        source: 'REST'
    };

    console.log(`[REST] Device registered: ${deviceId} as ${role} (${lat}, ${lng})`);
    broadcastDeviceList();
    res.json({ ok: true, device: restDevices[deviceId] });
});

// Update location for REST-registered device
app.post('/api/device/:deviceId/location', (req, res) => {
    const { deviceId } = req.params;
    const { lat, lng } = req.body;

    if (restDevices[deviceId]) {
        restDevices[deviceId].lat = lat;
        restDevices[deviceId].lng = lng;
        broadcastDeviceList();
    }

    res.json({ ok: true });
});

// Get all online devices (for debugging)
app.get('/api/devices', (req, res) => {
    res.json(getAllDevices());
});

// --- Unity Drone REST API ---
// Unity polls this to check for assigned tasks
app.get('/api/drone/:droneId/task', (req, res) => {
    const { droneId } = req.params;
    const task = Object.values(deliveries).find(
        d => d.active && d.droneId === droneId
    );
    if (task) {
        // Include destination device location if available
        const destSocket = deviceSocketMap[task.destId];
        const destDevice = destSocket ? devices[destSocket] : null;
        res.json({
            hasTask: true,
            delivery: {
                id: task.id,
                droneId: task.droneId,
                destId: task.destId,
                items: task.items,
                quantity: task.quantity,
                notes: task.notes,
                status: task.status,
                destination: destDevice ? { lat: destDevice.lat, lng: destDevice.lng } : null
            }
        });
    } else {
        res.json({ hasTask: false });
    }
});

// Unity reports drone status back to server
app.post('/api/drone/:droneId/status', (req, res) => {
    const { droneId } = req.params;
    const { status, deliveryId } = req.body;
    console.log(`[UNITY] Drone ${droneId} status: ${status}`);

    // Update delivery status if provided
    if (deliveryId && deliveries[deliveryId]) {
        const delivery = deliveries[deliveryId];
        const oldStatus = delivery.status;

        if (status === 'PICKING_UP') {
            delivery.status = 'PICKING_UP';
        } else if (status === 'IN_TRANSIT') {
            delivery.status = 'IN_TRANSIT';
        } else if (status === 'ARRIVED') {
            delivery.status = 'ARRIVED';
        } else if (status === 'DELIVERED') {
            delivery.status = 'DELIVERED';
            delivery.active = false;
            const destDev = devices[deviceSocketMap[delivery.destId]];
            if (destDev) destDev.locked = false;
        } else if (status === 'RETURNING') {
            delivery.status = 'RETURNING';
        }

        if (oldStatus !== delivery.status) {
            io.emit('delivery_status_update', {
                deliveryId: delivery.id,
                status: delivery.status
            });
            broadcastAllDeliveries();
        }
    }

    res.json({ ok: true });
});

// --- Home Test Mission API ---
app.post('/mission', (req, res) => {
    const { lat, lon, alt, arm } = req.body;
    // Tự động Arm nếu không truyền (hoặc truyền undefined)
    const shouldArm = arm !== undefined ? !!arm : true;
    latestMission = { lat, lon, alt, arm: shouldArm, status: 'pending' };
    console.log('Mission received:', latestMission);
    res.json({ message: 'Mission received', mission: latestMission });
});

app.get('/mission', (req, res) => {
    if (!latestMission) {
        return res.json({ status: 'no_mission' });
    }
    res.json(latestMission);
});

// Endpoint for bridge script to mark mission as processed
app.post('/mission/processed', (req, res) => {
    if (latestMission) {
        latestMission.status = 'processed';
    }
    res.json({ ok: true });
});

// Endpoint to cancel a delivery
app.post('/delivery/:id/cancel', (req, res) => {
    const { id } = req.params;
    if (deliveries[id]) {
        deliveries[id].status = 'CANCELED';
        deliveries[id].active = false;

        // Unlock destination if it was locked
        const destDev = devices[deviceSocketMap[deliveries[id].destId]];
        if (destDev) destDev.locked = false;

        io.emit('delivery_status_update', {
            deliveryId: id,
            status: 'CANCELED'
        });

        // Remove from memory completely or keep as canceled. We'll simply keep it as inactive.
        broadcastAllDeliveries();
        console.log(`[CANCELED] Delivery ${id} was canceled.`);
        res.json({ ok: true });
    } else {
        res.status(404).json({ error: 'Delivery not found' });
    }
});

// --- Socket Logic ---
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Send current state immediately (include REST devices)
    socket.emit('device_list', getAllDevices());
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
