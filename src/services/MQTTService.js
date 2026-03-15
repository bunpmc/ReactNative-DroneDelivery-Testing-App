import mqtt from 'mqtt';
import { Buffer } from 'buffer';

const MQTT_URL = 'mqtts://d130275373b6451bac4640918d94bb1c.s1.eu.hivemq.cloud:8884/mqtt'; // HiveMQ WebSockets port 8884 for Expo/Web
const MQTT_USER = 'esp32';
const MQTT_PASS = 'Esp323232';

class MQTTService {
    constructor() {
        this.client = null;
        this.callbacks = {};
    }

    connect(onDataFromFC) {
        if (this.client) return;

        console.log('[MQTT] Connecting to HiveMQ Cloud...');

        // Note: For React Native / Expo Web, we often need to use the WebSocket URL (port 8884)
        // because standard MQTT (8883) doesn't work in the browser.
        this.client = mqtt.connect(MQTT_URL, {
            username: MQTT_USER,
            password: MQTT_PASS,
            clientId: 'ExpoApp_' + Math.random().toString(16).slice(2),
            rejectUnauthorized: false,
            protocol: 'wss'
        });

        this.client.on('connect', () => {
            console.log('[MQTT] Connected to HiveMQ Cloud');
            this.client.subscribe('drone/fc/out');
            this.client.subscribe('drone/telemetry');
        });

        this.client.on('message', (topic, message) => {
            if ((topic === 'drone/fc/out' || topic === 'drone/telemetry') && onDataFromFC) {
                // Determine if it's binary or JSON
                try {
                    const str = message.toString();
                    if (str.startsWith('{')) {
                        const json = JSON.parse(str);
                        onDataFromFC({ type: 'TELEMETRY', data: json });
                    } else {
                        const bytes = new Uint8Array(message);
                        onDataFromFC({ type: 'BINARY', data: bytes });
                    }
                } catch (e) {
                    const bytes = new Uint8Array(message);
                    onDataFromFC({ type: 'BINARY', data: bytes });
                }
            }
        });

        this.client.on('error', (err) => {
            console.error('[MQTT] Error:', err);
        });

        this.client.on('close', () => {
            console.log('[MQTT] Connection closed');
        });
    }

    sendToFC(data) {
        if (!this.client || !this.client.connected) {
            console.warn('[MQTT] Not connected, cannot send to FC');
            return;
        }

        if (typeof data === 'string' || data instanceof String) {
            this.client.publish('drone/fc/in', data);
        } else {
            // Assume binary
            this.client.publish('drone/fc/in', Buffer.from(data));
        }
    }

    sendMission(lat, lon, throttle = 10) {
        const payload = JSON.stringify({
            cmd: 'start_motor',
            lat: lat,
            lon: lon,
            throttle: throttle
        });
        this.sendToFC(payload);
    }

    stopMotor() {
        const payload = JSON.stringify({
            cmd: 'stop_motor'
        });
        this.sendToFC(payload);
    }

    disconnect() {
        if (this.client) {
            this.client.end();
            this.client = null;
        }
    }
}

export default new MQTTService();
