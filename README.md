# ReactNative-DroneDelivery-Testing-App

A real-time Drone Delivery simulation application built with React Native (Expo) and Node.js. This project demonstrates real-time location tracking, WebSocket communication, and a complete delivery flow from order creation to QR-code confirmed delivery.

## 🚀 Features

*   **Real-time Communication:** Powered by Socket.io for instant updates.
*   **Role-Based Access:**
    *   **Drone:** Simulates the delivery vehicle. Updates its location in real-time.
    *   **Destination:** Represents the customer waiting for the package. Generates a QR code for delivery confirmation.
    *   **Admin:** Dashboard to view all active devices and deliveries map.
*   **Live Location Tracking:** Visualize drone and destination positions on a map.
*   **Delivery Flow:**
    *   Create Delivery (Admin/Drone)
    *   In Transit (Tracking)
    *   Approaching & Arrived notifications
    *   QR Code Scanning for secure completion.
*   **Cross-Platform:** Runs on Android, iOS, and Web (via Expo).

## 🛠️ Tech Stack

*   **Frontend:** React Native, Expo, React Navigation, React Native Maps / Leaflet.
*   **Backend:** Node.js, Express, Socket.io.
*   **Languages:** JavaScript (ES6+).

## 📋 Prerequisites

*   [Node.js](https://nodejs.org/) (LTS recommended)
*   [Expo Go](https://expo.dev/client) app installed on your physical device (Android/iOS) or an Emulator.

## ⚙️ Installation & Running

You need to run **both** the backend server and the frontend client.

### 1. Back-end (Server)

The server handles WebSocket connections and manages the state.

```bash
# Navigate to the server directory
cd server

# Install dependencies
npm install

# Start the server
node index.js
```
*The server will start on port `3000`.*

### 2. Front-end (Client App)

Open a new terminal window for the client.

```bash
# Navigate to the root directory
# (If you are in the server folder, go back up: cd ..)

# Install dependencies
npm install

# Start the Expo development server
npx expo start
```
*Use `a` for Android, `i` for iOS (Mac only), or scan the QR code with the Expo Go app.*

---

## 📱 How to Use

1.  **Configure IP:**
    *   Upon opening the app, ensure the **Server URL** points to the Cloudflare Tunnel address: `https://doubt-heavily-guy-hull.trycloudflare.com`.
    *   *Note: `localhost` will not work on a physical phone.*

2.  **Select a Role:**
    *   Open the app on one device/simulator and join as **"Drone"**.
    *   Open the app on a second device/simulator and join as **"Destination"**.

3.  **Simulate Delivery:**
    *   **Create Order:** The Drone or Admin can create a new delivery targeting the Destination ID.
    *   **Track:** Watch the location updates as the Drone moves (or simulates movement).
    *   **Confirm:** When the Drone arrives, the Destination app shows a QR Code. The Drone user scans this code to mark the delivery as **COMPLETED**.
